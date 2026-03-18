"""Tests for the LLM service mock responses."""
from llm_service import _get_mock_response, _parse_llm_response
from query_parser import validate_sql


class TestMockResponses:
    """All five example prompts from the problem statement must produce correct chart types."""

    def test_category_query_returns_bar(self):
        resp = _get_mock_response("Show total revenue by product category")
        chart_types = [c["chart_type"] for c in resp["charts"]]
        assert "bar" in chart_types

    def test_monthly_trend_returns_line(self):
        resp = _get_mock_response("Show monthly revenue trend")
        chart_types = [c["chart_type"] for c in resp["charts"]]
        assert "line" in chart_types

    def test_region_query_returns_bar(self):
        resp = _get_mock_response("Compare revenue across customer regions")
        chart_types = [c["chart_type"] for c in resp["charts"]]
        assert "bar" in chart_types

    def test_payment_query_returns_pie(self):
        resp = _get_mock_response("Which payment method is most popular?")
        chart_types = [c["chart_type"] for c in resp["charts"]]
        assert "pie" in chart_types

    def test_top_5_returns_bar(self):
        resp = _get_mock_response("Show top 5 products by revenue")
        chart_types = [c["chart_type"] for c in resp["charts"]]
        assert "bar" in chart_types

    def test_top_query_sql_has_limit(self):
        resp = _get_mock_response("Show top 5 products by revenue")
        sql = resp["charts"][0]["sql"]
        assert "LIMIT" in sql.upper()

    def test_all_mock_sql_is_valid(self):
        prompts = [
            "Show total revenue by product category",
            "Show monthly revenue trend",
            "Compare revenue across customer regions",
            "Which payment method is most popular?",
            "Show top 5 products by revenue",
            "How do discounts affect ratings?",
            "General query",
        ]
        for prompt in prompts:
            resp = _get_mock_response(prompt)
            for chart in resp["charts"]:
                is_valid, err = validate_sql(chart["sql"])
                assert is_valid, f"Invalid SQL for prompt '{prompt}': {err}"

    def test_all_responses_have_insights(self):
        prompts = [
            "Show total revenue by product category",
            "Show monthly revenue trend",
            "Compare revenue across customer regions",
            "Which payment method is most popular?",
            "Show top 5 products by revenue",
        ]
        for prompt in prompts:
            resp = _get_mock_response(prompt)
            assert resp["insights"], f"Missing insights for prompt '{prompt}'"

    def test_all_responses_have_no_error(self):
        resp = _get_mock_response("Show revenue by region")
        assert resp.get("error") is None

    def test_discount_query(self):
        resp = _get_mock_response("How do discounts affect ratings?")
        assert len(resp["charts"]) > 0

    def test_default_fallback(self):
        resp = _get_mock_response("Some random question about data")
        assert len(resp["charts"]) > 0


class TestParseLlmResponse:
    def test_plain_json(self):
        raw = '{"charts": [], "insights": "test", "error": null}'
        result = _parse_llm_response(raw)
        assert result["insights"] == "test"

    def test_json_in_markdown_code_block(self):
        raw = '```json\n{"charts": [], "insights": "test", "error": null}\n```'
        result = _parse_llm_response(raw)
        assert result["insights"] == "test"

    def test_json_with_surrounding_text(self):
        raw = 'Here is the result:\n{"charts": [], "insights": "found", "error": null}\nDone!'
        result = _parse_llm_response(raw)
        assert result["insights"] == "found"
