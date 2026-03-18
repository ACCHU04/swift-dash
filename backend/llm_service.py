import json
import re
from typing import Any
from config import settings
from models import ChartData

# Schema context string for default dataset
DEFAULT_SCHEMA_CONTEXT = """
Table name: sales_data
Columns:
- order_id (INTEGER): Unique transaction identifier
- order_date (TEXT): Transaction date in YYYY-MM-DD format
- product_id (INTEGER): Unique product identifier
- product_category (TEXT): Product department — values: Books, Fashion, Electronics, Home, Sports, Beauty
- price (REAL): Original base unit price (USD)
- discount_percent (INTEGER): Discount percentage applied — values: 5, 10, 15, 20, 25, 30
- quantity_sold (INTEGER): Units purchased in the order (1-10)
- customer_region (TEXT): Buyer's geographical area — values: North America, Europe, Asia, South America, Africa, Oceania
- payment_method (TEXT): Payment instrument — values: Credit Card, Debit Card, UPI, PayPal, Net Banking
- rating (REAL): Product rating out of 5.0
- review_count (INTEGER): Number of user reviews
- discounted_price (REAL): Unit price after discount
- total_revenue (REAL): Final transaction value (discounted_price × quantity_sold)

Date range: 2022-01-01 to 2023-12-31
Total rows: ~1000
"""

SYSTEM_PROMPT = """You are an expert data analyst and SQL engineer for an e-commerce business intelligence platform.
Your job is to convert natural language questions into structured dashboard responses.

You must respond ONLY with valid JSON — no extra text, no markdown, no explanations outside the JSON.

For each user query, return a JSON object with this exact structure:
{
  "charts": [
    {
            "chart_type": "<bar|line|pie|scatter|donut|horizontal_bar|stacked_bar|heatmap|area>",
      "title": "<descriptive chart title>",
      "sql": "<valid SQLite SELECT query>",
      "x_column": "<column name for x-axis or null>",
      "y_column": "<column name for y-axis or null>",
      "color_column": "<column name for color grouping or null>",
      "labels_column": "<column name for pie chart labels or null>",
      "values_column": "<column name for pie chart values or null>",
      "description": "<one-sentence description of what this chart shows>"
    }
  ],
  "insights": "<2-3 sentence business insight summarizing expected findings>",
  "error": null
}

Chart type selection rules:
- Use "line" for time-series data (monthly trends, date-based analysis)
- Use "area" for time-series queries when cumulative magnitude or filled trend emphasis is helpful
- Use "bar" for categorical comparisons (by region, by category, by payment method)
- Use "horizontal_bar" when category labels are long or you are ranking top/bottom items
- Use "stacked_bar" for composition comparisons across categories when a grouping dimension exists
- Use "pie" for parts-of-a-whole proportions (market share, distribution) — limit to ≤8 segments
- Use "donut" for part-to-whole proportions when a center-summary friendly layout is useful
- Use "scatter" for correlation analysis (two continuous variables)
- Use "heatmap" for dense matrix-style comparisons such as month-by-region, category-by-payment-method, or two-dimensional intensity analysis
- You may return multiple charts (2-3) for complex queries

SQL rules:
- Write valid SQLite syntax only
- Always use aggregation (SUM, AVG, COUNT) for numerical analysis
- For time series, use strftime('%Y-%m', order_date) to group by month
- For year-level grouping, use strftime('%Y', order_date)
- Always include ORDER BY for time-series queries
- Use ROUND(..., 2) for monetary values
- The table name is always: sales_data
- Do NOT use subqueries in FROM clause unless absolutely necessary
- Do NOT use window functions

If the query cannot be answered with the available data, set error to a helpful message and return empty charts array.
If the query is ambiguous, make a reasonable assumption and note it in insights.
"""


def _build_user_prompt(user_query: str, schema_context: str, conversation_history: list[dict]) -> str:
    history_text = ""
    if conversation_history:
        history_text = "\n\nConversation history (for context):\n"
        for msg in conversation_history[-4:]:  # Last 4 exchanges
            role = msg.get("role", "user")
            content = msg.get("content", "")
            history_text += f"{role.upper()}: {content}\n"

    return f"""Database schema:
{schema_context}

{history_text}

Current user query: {user_query}

Respond with valid JSON only."""


def _parse_llm_response(raw: str) -> dict:
    """Parse JSON from LLM response, handling markdown code blocks."""
    raw = raw.strip()
    # Remove markdown code blocks
    raw = re.sub(r"^```json\s*", "", raw, flags=re.IGNORECASE)
    raw = re.sub(r"^```\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    raw = raw.strip()

    try:
        parsed = json.loads(raw)
        return _normalize_dashboard_response(parsed)
    except json.JSONDecodeError:
        # Try to find JSON object in the response
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            parsed = json.loads(match.group())
            return _normalize_dashboard_response(parsed)
        raise


def _normalize_dashboard_response(payload: dict[str, Any]) -> dict[str, Any]:
    """Force LLM output into a strict response schema."""
    charts = payload.get("charts", [])
    normalized_charts = []

    if isinstance(charts, list):
        for item in charts:
            if not isinstance(item, dict):
                continue
            chart_type = str(item.get("chart_type", "bar")).lower()
            if chart_type not in {"bar", "line", "pie", "scatter", "donut", "horizontal_bar", "stacked_bar", "heatmap", "area"}:
                chart_type = "bar"
            normalized_charts.append({
                "chart_type": chart_type,
                "title": item.get("title", "Chart"),
                "sql": item.get("sql", ""),
                "x_column": item.get("x_column"),
                "y_column": item.get("y_column"),
                "color_column": item.get("color_column"),
                "labels_column": item.get("labels_column"),
                "values_column": item.get("values_column"),
                "description": item.get("description", ""),
            })

    return {
        "charts": normalized_charts,
        "insights": str(payload.get("insights", "")),
        "error": payload.get("error"),
    }


def _get_mock_response(user_query: str, schema_context: str = DEFAULT_SCHEMA_CONTEXT) -> dict:
    """Return a deterministic fallback response when LLM is unavailable."""
    query_lower = user_query.lower()
    schema_lower = schema_context.lower()

    has_product_title = "product_title" in schema_lower
    has_is_prime = "is_prime" in schema_lower

    product_dimension = "product_title" if has_product_title else "product_id"
    top_n = 10 if "top 10" in query_lower else 5

    if any(word in query_lower for word in ["review", "review_count", "review count"]) and any(
        word in query_lower for word in ["top", "best", "highest"]
    ):
        return {
            "charts": [
                {
                    "chart_type": "horizontal_bar",
                    "title": f"Top {top_n} Products by Review Count",
                    "sql": f"SELECT {product_dimension}, MAX(review_count) AS review_count FROM sales_data GROUP BY {product_dimension} ORDER BY review_count DESC LIMIT {top_n}",
                    "x_column": product_dimension,
                    "y_column": "review_count",
                    "color_column": None,
                    "labels_column": None,
                    "values_column": None,
                    "description": "Highest-reviewed products ranked by review volume"
                }
            ],
            "insights": "This view ranks products by review_count so you can quickly identify high-engagement items.",
            "error": None
        }

    if "compare" in query_lower and "average" in query_lower and "price" in query_lower:
        if has_is_prime and "prime" in query_lower:
            return {
                "charts": [
                    {
                        "chart_type": "bar",
                        "title": "Average Price: Prime vs Non-Prime",
                        "sql": "SELECT CASE WHEN is_prime = 1 THEN 'Prime' ELSE 'Non-Prime' END AS prime_status, ROUND(AVG(price), 2) AS avg_price, ROUND(AVG(review_count), 2) AS avg_review_count FROM sales_data GROUP BY prime_status ORDER BY avg_price DESC",
                        "x_column": "prime_status",
                        "y_column": "avg_price",
                        "color_column": None,
                        "labels_column": None,
                        "values_column": None,
                        "description": "Comparison of average price and review volume for Prime vs Non-Prime products"
                    }
                ],
                "insights": "Prime status comparison reveals pricing and review behavior differences across listing types.",
                "error": None
            }

        return {
            "charts": [
                {
                    "chart_type": "bar",
                    "title": "Average Price by Product Category",
                    "sql": "SELECT product_category, ROUND(AVG(price), 2) AS avg_price FROM sales_data GROUP BY product_category ORDER BY avg_price DESC",
                    "x_column": "product_category",
                    "y_column": "avg_price",
                    "color_column": None,
                    "labels_column": None,
                    "values_column": None,
                    "description": "Average price comparison across categories"
                }
            ],
            "insights": "This comparison highlights which categories are positioned at higher average price points.",
            "error": None
        }

    if any(word in query_lower for word in ["month", "trend", "time", "revenue over"]):
        return {
            "charts": [
                {
                    "chart_type": "line",
                    "title": "Monthly Revenue Trend (2022-2023)",
                    "sql": "SELECT strftime('%Y-%m', order_date) AS month, ROUND(SUM(total_revenue), 2) AS total_revenue FROM sales_data GROUP BY month ORDER BY month",
                    "x_column": "month",
                    "y_column": "total_revenue",
                    "color_column": None,
                    "labels_column": None,
                    "values_column": None,
                    "description": "Monthly total revenue from January 2022 to December 2023"
                }
            ],
            "insights": "This chart shows monthly revenue direction and possible seasonality.",
            "error": None
        }

    if any(word in query_lower for word in ["category", "product", "department"]):
        return {
            "charts": [
                {
                    "chart_type": "bar",
                    "title": "Total Sales by Product Category",
                    "sql": "SELECT product_category, ROUND(SUM(total_revenue), 2) AS total_revenue, SUM(quantity_sold) AS total_units FROM sales_data GROUP BY product_category ORDER BY total_revenue DESC",
                    "x_column": "product_category",
                    "y_column": "total_revenue",
                    "color_column": None,
                    "labels_column": None,
                    "values_column": None,
                    "description": "Total revenue by product category"
                },
                {
                    "chart_type": "pie",
                    "title": "Revenue Distribution by Category",
                    "sql": "SELECT product_category, ROUND(SUM(total_revenue), 2) AS total_revenue FROM sales_data GROUP BY product_category ORDER BY total_revenue DESC",
                    "x_column": None,
                    "y_column": None,
                    "color_column": None,
                    "labels_column": "product_category",
                    "values_column": "total_revenue",
                    "description": "Proportional revenue distribution across product categories"
                }
            ],
            "insights": "Electronics typically drives the highest revenue due to higher price points, while Fashion shows strong volume. The pie chart reveals the proportional contribution of each category.",
            "error": None
        }

    if any(word in query_lower for word in ["region", "geographic", "location", "country"]):
        return {
            "charts": [
                {
                    "chart_type": "bar",
                    "title": "Revenue by Customer Region",
                    "sql": "SELECT customer_region, ROUND(SUM(total_revenue), 2) AS total_revenue FROM sales_data GROUP BY customer_region ORDER BY total_revenue DESC",
                    "x_column": "customer_region",
                    "y_column": "total_revenue",
                    "color_column": None,
                    "labels_column": None,
                    "values_column": None,
                    "description": "Total revenue broken down by customer geographical region"
                }
            ],
            "insights": "North America and Europe typically lead in total revenue, while emerging markets like Asia show strong growth potential.",
            "error": None
        }

    if any(word in query_lower for word in ["payment", "method", "credit", "upi", "paypal"]):
        return {
            "charts": [
                {
                    "chart_type": "pie",
                    "title": "Revenue by Payment Method",
                    "sql": "SELECT payment_method, ROUND(SUM(total_revenue), 2) AS total_revenue FROM sales_data GROUP BY payment_method ORDER BY total_revenue DESC",
                    "x_column": None,
                    "y_column": None,
                    "color_column": None,
                    "labels_column": "payment_method",
                    "values_column": "total_revenue",
                    "description": "Revenue distribution across different payment methods"
                }
            ],
            "insights": "Credit Card and Debit Card dominate transactions, while digital wallets like UPI and PayPal are growing. Understanding payment preferences helps optimize checkout experience.",
            "error": None
        }

    if any(word in query_lower for word in ["discount", "rating", "scatter", "correlation"]):
        return {
            "charts": [
                {
                    "chart_type": "bar",
                    "title": "Average Discount % vs Average Rating by Category",
                    "sql": "SELECT product_category, ROUND(AVG(discount_percent), 1) AS avg_discount, ROUND(AVG(rating), 2) AS avg_rating FROM sales_data GROUP BY product_category ORDER BY avg_discount DESC",
                    "x_column": "product_category",
                    "y_column": "avg_discount",
                    "color_column": None,
                    "labels_column": None,
                    "values_column": None,
                    "description": "Average discount percentage vs average rating across product categories"
                }
            ],
            "insights": "Categories with higher discounts don't necessarily have lower ratings, suggesting discount strategy is not harming perceived product quality.",
            "error": None
        }

    return {
        "charts": [
            {
                "chart_type": "bar",
                "title": "Top 5 Product Categories by Revenue",
                "sql": "SELECT product_category, ROUND(SUM(total_revenue), 2) AS total_revenue FROM sales_data GROUP BY product_category ORDER BY total_revenue DESC LIMIT 5",
                "x_column": "product_category",
                "y_column": "total_revenue",
                "color_column": None,
                "labels_column": None,
                "values_column": None,
                "description": "Top 5 product categories ranked by total revenue"
            }
        ],
        "insights": "This overview highlights top categories by revenue and is a solid starting point for deeper comparisons.",
        "error": None
    }


async def generate_dashboard(
    user_query: str,
    schema_context: str = DEFAULT_SCHEMA_CONTEXT,
    conversation_history: list[dict] | None = None,
) -> dict:
    """
    Call Google Gemini API to generate dashboard configuration.
    Falls back to mock mode if no API key is set.
    """
    if settings.mock_mode or not settings.gemini_api_key:
        return _get_mock_response(user_query, schema_context)

    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.gemini_api_key)

        prompt = _build_user_prompt(
            user_query,
            schema_context,
            conversation_history or []
        )

        configured_fallbacks = [
            m.strip() for m in settings.gemini_fallback_models.split(",") if m.strip()
        ]
        model_candidates: list[str] = []
        for candidate in [settings.gemini_model, *configured_fallbacks]:
            if candidate not in model_candidates:
                model_candidates.append(candidate)

        last_error: Exception | None = None
        for model_name in model_candidates:
            try:
                model = genai.GenerativeModel(
                    model_name=model_name,
                    system_instruction=SYSTEM_PROMPT,
                )
                response = model.generate_content(prompt)
                raw_text = response.text
                return _parse_llm_response(raw_text)
            except Exception as model_error:
                last_error = model_error
                continue

        if last_error:
            raise last_error
        raise RuntimeError("No Gemini models are configured")

    except Exception as e:
        error_msg = str(e)
        if "API_KEY" in error_msg.upper() or "INVALID" in error_msg.upper():
            return {
                "charts": [],
                "insights": "",
                "error": "Invalid API key. Please check your GEMINI_API_KEY configuration."
            }
        # Graceful degradation for quota/rate-limit style failures.
        # Keeps the product usable using local deterministic templates.
        quota_markers = [
            "429",
            "quota",
            "resource_exhausted",
            "rate limit",
            "billing",
        ]
        if any(marker in error_msg.lower() for marker in quota_markers):
            fallback = _get_mock_response(user_query, schema_context)
            fallback["insights"] = (
                (fallback.get("insights") or "")
                + "\n\nNote: Using local fallback analytics because the LLM quota is currently exceeded."
            ).strip()
            fallback["error"] = None
            return fallback
        # For other errors, return a user-friendly message
        return {
            "charts": [],
            "insights": "",
            "error": f"Unable to process your query. Please try rephrasing it. (Error: {error_msg[:100]})"
        }


async def repair_sql_query(
    user_query: str,
    failed_sql: str,
    execution_error: str,
    schema_context: str = DEFAULT_SCHEMA_CONTEXT,
) -> str | None:
    """Ask Gemini to repair a failed SQL query and return only corrected SQL."""
    if settings.mock_mode or not settings.gemini_api_key:
        return None

    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.gemini_api_key)

        repair_prompt = f"""You are fixing a SQLite SELECT query for an e-commerce BI app.

Database schema:
{schema_context}

Original user request:
{user_query}

Failed SQL:
{failed_sql}

Execution error:
{execution_error}

Return ONLY a corrected SQLite SELECT query. No markdown, no explanation.
"""

        model = genai.GenerativeModel(
            model_name=settings.gemini_model,
            system_instruction="Return only corrected SQL. Must be a single SELECT statement.",
        )
        response = model.generate_content(repair_prompt)
        sql_text = (response.text or "").strip()
        sql_text = re.sub(r"^```sql\s*", "", sql_text, flags=re.IGNORECASE)
        sql_text = re.sub(r"^```\s*", "", sql_text)
        sql_text = re.sub(r"\s*```$", "", sql_text).strip()
        return sql_text or None
    except Exception:
        return None
