"""Tests for the SQL query_parser module."""
from query_parser import validate_sql, clean_sql


class TestValidateSql:
    def test_valid_select(self):
        is_valid, err = validate_sql("SELECT * FROM sales_data")
        assert is_valid is True
        assert err is None

    def test_valid_select_with_aggregation(self):
        sql = "SELECT product_category, SUM(total_revenue) FROM sales_data GROUP BY product_category"
        is_valid, err = validate_sql(sql)
        assert is_valid is True

    def test_empty_query(self):
        is_valid, err = validate_sql("")
        assert is_valid is False
        assert "Empty" in err

    def test_whitespace_only(self):
        is_valid, err = validate_sql("   ")
        assert is_valid is False

    def test_insert_blocked(self):
        is_valid, err = validate_sql("INSERT INTO sales_data VALUES (1)")
        assert is_valid is False

    def test_drop_blocked(self):
        is_valid, err = validate_sql("SELECT * FROM sales_data; DROP TABLE sales_data")
        assert is_valid is False

    def test_delete_blocked(self):
        is_valid, err = validate_sql("DELETE FROM sales_data")
        assert is_valid is False

    def test_update_blocked(self):
        is_valid, err = validate_sql("UPDATE sales_data SET price = 0")
        assert is_valid is False

    def test_comment_injection_double_dash(self):
        is_valid, err = validate_sql("SELECT * FROM sales_data -- DROP TABLE")
        assert is_valid is False

    def test_comment_injection_block(self):
        is_valid, err = validate_sql("SELECT * FROM sales_data /* malicious */")
        assert is_valid is False

    def test_multiple_statements(self):
        is_valid, err = validate_sql("SELECT 1; SELECT 2")
        assert is_valid is False
        assert "Multiple" in err

    def test_select_keyword_in_subquery(self):
        sql = "SELECT product_category FROM sales_data WHERE total_revenue > 100"
        is_valid, err = validate_sql(sql)
        assert is_valid is True

    def test_pragma_blocked(self):
        is_valid, err = validate_sql("PRAGMA table_info(sales_data)")
        assert is_valid is False

    def test_trailing_semicolon_allowed(self):
        is_valid, err = validate_sql("SELECT * FROM sales_data;")
        assert is_valid is True


class TestCleanSql:
    def test_remove_markdown_sql_fence(self):
        sql = "```sql\nSELECT * FROM sales_data\n```"
        result = clean_sql(sql)
        assert result == "SELECT * FROM sales_data"

    def test_remove_trailing_semicolon(self):
        result = clean_sql("SELECT * FROM sales_data;")
        assert result == "SELECT * FROM sales_data"

    def test_strip_whitespace(self):
        result = clean_sql("  SELECT * FROM sales_data  ;  ")
        assert result == "SELECT * FROM sales_data"

    def test_plain_code_fence(self):
        sql = "```\nSELECT 1\n```"
        result = clean_sql(sql)
        assert result == "SELECT 1"

    def test_no_change_needed(self):
        sql = "SELECT product_category FROM sales_data"
        assert clean_sql(sql) == sql
