export interface ColumnInfo {
  name: string;
  type: string;
  sample_values: string[];
}

export interface SchemaResponse {
  columns: ColumnInfo[];
  sample_data: Record<string, unknown>[];
  row_count: number;
  table_name: string;
}

export interface ChartData {
  chart_type: "bar" | "line" | "pie" | "scatter" | "donut" | "horizontal_bar" | "stacked_bar" | "heatmap" | "area";
  title: string;
  data: Record<string, unknown>[];
  x_column: string | null;
  y_column: string | null;
  color_column: string | null;
  labels_column: string | null;
  values_column: string | null;
  description: string | null;
}

export interface QueryResponse {
  charts: ChartData[];
  insights: string;
  sql_query: string;
  session_id: string;
  error: string | null;
  confidence: number;
  query_plan: QueryPlan | null;
  clarification_needed: boolean;
  clarification_question: string | null;
  clarification_options: string[];
  executive_summary: ExecutiveSummary | null;
}

export interface QueryPlan {
  intent: string;
  chart_strategy: string[];
  assumptions: string[];
  warnings: string[];
}

export interface ExecutiveSummary {
  what_happened: string;
  why_it_matters: string;
  recommended_action: string;
}

export interface DatasetProfileColumn {
  name: string;
  inferred_type: string;
  null_count: number;
  distinct_count: number;
}

export interface DatasetProfile {
  row_count: number;
  column_count: number;
  numeric_columns: string[];
  categorical_columns: string[];
  date_columns: string[];
  columns: DatasetProfileColumn[];
}

export interface UploadResponse {
  message: string;
  columns: string[];
  row_count: number;
  session_id: string;
  source_mode: "uploaded" | "live" | "mock";
  schema_info: ColumnInfo[];
  dataset_profile: DatasetProfile | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  charts?: ChartData[];
  insights?: string;
  sql_query?: string;
  error?: string | null;
  confidence?: number;
  query_plan?: QueryPlan | null;
  clarification_needed?: boolean;
  clarification_question?: string | null;
  clarification_options?: string[];
  executive_summary?: ExecutiveSummary | null;
}
