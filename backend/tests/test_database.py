"""Tests for the database module."""
from database import execute_query, get_schema


class TestGetSchema:
    def test_schema_returns_columns(self):
        schema = get_schema()
        col_names = [c.name for c in schema.columns]
        assert "order_id" in col_names
        assert "product_category" in col_names
        assert "total_revenue" in col_names

    def test_schema_row_count(self):
        schema = get_schema()
        assert schema.row_count == 1000

    def test_schema_has_sample_data(self):
        schema = get_schema()
        assert len(schema.sample_data) > 0
        assert len(schema.sample_data) <= 5

    def test_schema_column_types(self):
        schema = get_schema()
        type_map = {c.name: c.type for c in schema.columns}
        assert type_map["order_id"] == "INTEGER"
        assert type_map["product_category"] == "TEXT"
        assert type_map["total_revenue"] == "REAL"

    def test_schema_sample_values(self):
        schema = get_schema()
        for col in schema.columns:
            assert len(col.sample_values) <= 3


class TestExecuteQuery:
    def test_select_all(self):
        rows = execute_query("SELECT * FROM sales_data LIMIT 5")
        assert len(rows) == 5
        assert "order_id" in rows[0]

    def test_aggregation(self):
        rows = execute_query(
            "SELECT product_category, SUM(total_revenue) AS rev "
            "FROM sales_data GROUP BY product_category"
        )
        assert len(rows) == 6  # 6 categories
        categories = {r["product_category"] for r in rows}
        assert "Electronics" in categories
        assert "Books" in categories

    def test_count(self):
        rows = execute_query("SELECT COUNT(*) AS cnt FROM sales_data")
        assert rows[0]["cnt"] == 1000

    def test_monthly_grouping(self):
        rows = execute_query(
            "SELECT strftime('%Y-%m', order_date) AS month, "
            "ROUND(SUM(total_revenue), 2) AS rev "
            "FROM sales_data GROUP BY month ORDER BY month"
        )
        assert len(rows) > 0
        assert rows[0]["month"] is not None

    def test_limit(self):
        rows = execute_query(
            "SELECT product_category, ROUND(SUM(total_revenue), 2) AS rev "
            "FROM sales_data GROUP BY product_category ORDER BY rev DESC LIMIT 5"
        )
        assert len(rows) == 5
