"""Tests for the chart_recommender module."""
from chart_recommender import recommend_chart


class TestRecommendChart:
    def test_default_bar(self):
        assert recommend_chart("bar", [{"x": 1}], "x", "y", None) == "bar"

    def test_pie_chart(self):
        data = [{"cat": f"cat{i}", "val": i} for i in range(5)]
        assert recommend_chart("pie", data, None, None, None) == "pie"

    def test_pie_overflow_to_bar(self):
        data = [{"cat": f"cat{i}", "val": i} for i in range(10)]
        assert recommend_chart("pie", data, "cat", "val", None) == "bar"

    def test_line_chart(self):
        data = [{"month": "2023-01", "val": 100}]
        assert recommend_chart("line", data, "month", "val", None) == "line"

    def test_scatter_chart(self):
        data = [{"x": 1, "y": 2}]
        assert recommend_chart("scatter", data, "x", "y", None) == "scatter"

    def test_alias_donut_to_pie(self):
        data = [{"cat": "a", "val": 1}]
        assert recommend_chart("donut", data, None, None, None) == "pie"

    def test_alias_column_to_bar(self):
        data = [{"x": 1}]
        assert recommend_chart("column", data, "x", "y", None) == "bar"

    def test_alias_area_to_line(self):
        data = [{"month": "2023-01", "val": 1}]
        assert recommend_chart("area", data, "month", "val", None) == "line"

    def test_invalid_type_defaults_to_bar(self):
        data = [{"x": 1}]
        assert recommend_chart("bubble", data, "x", "y", None) == "bar"

    def test_empty_data_returns_bar(self):
        assert recommend_chart("line", [], "x", "y", None) == "bar"

    def test_date_column_forces_line(self):
        data = [{"order_date": "2023-01-15", "val": 100}]
        result = recommend_chart("pie", data, "order_date", "val", None)
        assert result == "line"

    def test_time_series_preserves_line(self):
        data = [{"month": "2023-01", "rev": 100}]
        result = recommend_chart("line", data, "month", "rev", None)
        assert result == "line"

    def test_date_column_allows_bar(self):
        data = [{"order_date": "2023-01-15", "val": 100}]
        result = recommend_chart("bar", data, "order_date", "val", None)
        assert result == "bar"
