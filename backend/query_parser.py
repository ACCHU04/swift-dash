import re
from typing import Optional


# SQL keywords that are dangerous to allow
_FORBIDDEN_KEYWORDS = {
    "INSERT", "UPDATE", "DELETE", "DROP", "CREATE", "ALTER",
    "TRUNCATE", "REPLACE", "MERGE", "EXEC", "EXECUTE",
    "GRANT", "REVOKE", "ATTACH", "DETACH", "PRAGMA",
}

# Only allow SELECT statements
_SELECT_PATTERN = re.compile(r"^\s*SELECT\b", re.IGNORECASE)

_SQL_KEYWORDS = {
    "SELECT", "FROM", "WHERE", "GROUP", "BY", "ORDER", "LIMIT", "AS", "ASC", "DESC", "AND", "OR", "NOT",
    "IN", "IS", "NULL", "LIKE", "BETWEEN", "HAVING", "DISTINCT", "CASE", "WHEN", "THEN", "ELSE", "END",
    "ON", "JOIN", "LEFT", "RIGHT", "INNER", "OUTER", "CROSS", "UNION", "ALL", "WITH",
    "SUM", "AVG", "MIN", "MAX", "COUNT", "ROUND", "CAST", "COALESCE", "STRFTIME", "DATE", "DATETIME",
    "TRUE", "FALSE",
}


def validate_sql(sql: str) -> tuple[bool, Optional[str]]:
    """
    Validate that the SQL is safe to execute.
    Returns (is_valid, error_message).
    """
    if not sql or not sql.strip():
        return False, "Empty SQL query"

    # Must start with SELECT
    if not _SELECT_PATTERN.match(sql):
        return False, "Only SELECT queries are allowed"

    # Check for forbidden keywords
    upper_sql = sql.upper()
    for keyword in _FORBIDDEN_KEYWORDS:
        pattern = r"\b" + keyword + r"\b"
        if re.search(pattern, upper_sql):
            return False, f"Forbidden SQL keyword detected: {keyword}"

    # Check for comment injection
    if "--" in sql or "/*" in sql:
        return False, "SQL comments are not allowed"

    # Check for multiple statements
    stripped = sql.rstrip("; \t\n\r")
    if ";" in stripped:
        return False, "Multiple SQL statements are not allowed"

    return True, None


def clean_sql(sql: str) -> str:
    """
    Clean SQL output from LLM (remove markdown code blocks, trailing semicolons).
    """
    # Remove markdown code fences
    sql = re.sub(r"```sql\s*", "", sql, flags=re.IGNORECASE)
    sql = re.sub(r"```\s*", "", sql)
    # Remove trailing semicolons
    sql = sql.strip().rstrip(";").strip()
    return sql


def validate_sql_columns(sql: str, allowed_columns: set[str], table_name: str = "sales_data") -> tuple[bool, Optional[str]]:
    """
    Validate that SQL references only known schema columns (hallucination guard).
    Returns (is_valid, error_message).
    """
    if not sql.strip().upper().startswith("SELECT"):
        return False, "Only SELECT queries are supported"

    stripped = re.sub(r"'[^']*'", " ", sql)
    stripped = re.sub(r'"[^"]*"', " ", stripped)
    aliases = {m.group(1).lower() for m in re.finditer(r"\bAS\s+([A-Za-z_][A-Za-z0-9_]*)\b", stripped, flags=re.IGNORECASE)}

    tokens = re.findall(r"\b[A-Za-z_][A-Za-z0-9_]*\b", stripped)
    unknown: set[str] = set()
    for token in tokens:
        upper = token.upper()
        lower = token.lower()
        if upper in _SQL_KEYWORDS:
            continue
        if lower == table_name.lower():
            continue
        if lower in aliases:
            continue
        if lower in allowed_columns:
            continue
        if token.isdigit():
            continue
        unknown.add(token)

    if unknown:
        unknown_cols = ", ".join(sorted(unknown))
        allowed = ", ".join(sorted(allowed_columns))
        return False, f"Unknown column(s) referenced: {unknown_cols}. Available columns: {allowed}"

    return True, None
