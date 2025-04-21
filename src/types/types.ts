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

export interface Location {
  address: string;
  lat: number;
  lon: number;
}

export interface JobReport {
  title: string;
  company: string;
  url: string;
  description: string;
  jobType: 'fulltime' | 'parttime' | 'contract' | 'volunteer' | 'internship';
  skills: string[];
  locationType: 'remote' | 'onsite' | 'hybrid';
  location?: Location | null;
  benefits?: string[];
  date?: string;
  salary?: string | null;
}

export interface Job {
  id: string;
  company: string;
  date: string;
  description: string;
  job_type: string;
  lat: number;
  location: string;
  lon: number;
  salary: string;
  skills: string[];
  benefits?: string[];
  title: string;
  url: string;
  verified: boolean;
}