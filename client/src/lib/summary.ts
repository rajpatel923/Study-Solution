// Summary object returned from the API
export interface Summary {
  _id: string;
  user_id: string;
  document_id: string;
  text: string;
  type: string;
  prompt_used: string;
  length: "short" | "medium" | "long";
  created_at: string;
  word_count: number;
  content_type: string;
  last_updated?: string;
}

// Response from the API when fetching summaries
export interface SummariesResponse {
  status: "success" | "error" | "processing";
  summaries: Summary[];
  count: number;
}

// Response for a single summary
export interface SummaryResponse {
  status: "success" | "error" | "processing";
  summary_id?: string;
  document_id?: string;
  summary?: string;
  word_count?: number;
  error_message?: string;
  message?: string;
}

// Data for creating a new summary
export interface SummaryCreate {
  content_url: string;
  user_id?: string;
  prompt?: string;
  summary_length?: "short" | "medium" | "long";
  tags?: string[];
}

// Data for updating an existing summary
export interface SummaryUpdate {
  summary_content?: string;
  title?: string;
  tags?: string[];
  user_id: string;
}
