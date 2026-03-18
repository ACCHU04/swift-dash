from pydantic import BaseModel
from typing import Any, Optional


class QueryRequest(BaseModel):
    query: str
    session_id: Optional[str] = None


class AmazonFetchRequest(BaseModel):
    category: str = "electronics"
    country: str = "US"
    limit: int = 20
    session_id: Optional[str] = None
    merge_into_session: bool = True


class ColumnInfo(BaseModel):
    name: str
    type: str
    sample_values: list[Any] = []


class SchemaResponse(BaseModel):
    columns: list[ColumnInfo]
    sample_data: list[dict[str, Any]]
    row_count: int
    table_name: str = "sales_data"


class ChartData(BaseModel):
    chart_type: str  # bar, line, pie, scatter, donut, horizontal_bar, stacked_bar, heatmap, area
    title: str
    data: list[dict[str, Any]]
    x_column: Optional[str] = None
    y_column: Optional[str] = None
    color_column: Optional[str] = None
    labels_column: Optional[str] = None
    values_column: Optional[str] = None
    description: Optional[str] = None


class QueryPlan(BaseModel):
    intent: str
    chart_strategy: list[str] = []
    assumptions: list[str] = []
    warnings: list[str] = []


class ExecutiveSummary(BaseModel):
    what_happened: str
    why_it_matters: str
    recommended_action: str


class DatasetProfileColumn(BaseModel):
    name: str
    inferred_type: str
    null_count: int
    distinct_count: int


class DatasetProfile(BaseModel):
    row_count: int
    column_count: int
    numeric_columns: list[str] = []
    categorical_columns: list[str] = []
    date_columns: list[str] = []
    columns: list[DatasetProfileColumn] = []


class QueryResponse(BaseModel):
    charts: list[ChartData]
    insights: str
    sql_query: str
    session_id: str
    error: Optional[str] = None
    confidence: float = 0.0
    query_plan: Optional[QueryPlan] = None
    clarification_needed: bool = False
    clarification_question: Optional[str] = None
    clarification_options: list[str] = []
    executive_summary: Optional[ExecutiveSummary] = None


class UploadResponse(BaseModel):
    message: str
    columns: list[str]
    row_count: int
    session_id: str
    source_mode: str = "uploaded"  # uploaded | live | mock
    schema_info: list[ColumnInfo] = []
    dataset_profile: Optional[DatasetProfile] = None
