export interface SimilarityDetail {
  keyword: string;
  match_score: number;
}
  
export interface MatchResponse {
  match_score: number;
  keyword_coverage: number;
  similarity_details: SimilarityDetail[];
  missing_keywords: string[][];
  resume_keywords: string[];
  job_keywords: string[];
}

export interface JobReport {
  title: string;
  company: string;
  url: string;
  date?: string;
  description?: string;
  salary?: string;
  benefits?: string[];
  skills?: string[];
  location?: string;
  job_type?: string;
}
