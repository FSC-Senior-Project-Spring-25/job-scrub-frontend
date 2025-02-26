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