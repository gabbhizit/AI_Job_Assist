export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          visa_status: "f1_opt" | "h1b" | "citizen" | "green_card" | "other";
          plan: "trial" | "free" | "paid";
          trial_started_at: string;
          jobs_viewed_today: number;
          jobs_viewed_reset_at: string;
          created_at: string;
          updated_at: string;
          google_access_token: string | null;
          google_refresh_token: string | null;
          google_token_expires_at: string | null;
          gmail_connected_at: string | null;
          gmail_sync_cursor: string | null;
        };
        Insert: {
          id: string;
          full_name?: string;
          email: string;
          visa_status?: "f1_opt" | "h1b" | "citizen" | "green_card" | "other";
          plan?: "trial" | "free" | "paid";
          trial_started_at?: string;
          jobs_viewed_today?: number;
          jobs_viewed_reset_at?: string;
          created_at?: string;
          updated_at?: string;
          google_access_token?: string | null;
          google_refresh_token?: string | null;
          google_token_expires_at?: string | null;
          gmail_connected_at?: string | null;
          gmail_sync_cursor?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      email_events: {
        Row: {
          id: string;
          user_id: string;
          gmail_message_id: string;
          gmail_thread_id: string;
          subject: string | null;
          sender_email: string | null;
          sender_name: string | null;
          snippet: string | null;
          received_at: string | null;
          category: EmailCategory;
          job_match_id: string | null;
          company_name: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          gmail_message_id: string;
          gmail_thread_id: string;
          subject?: string | null;
          sender_email?: string | null;
          sender_name?: string | null;
          snippet?: string | null;
          received_at?: string | null;
          category?: EmailCategory;
          job_match_id?: string | null;
          company_name?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["email_events"]["Insert"]>;
        Relationships: [];
      };
      user_preferences: {
        Row: {
          id: string;
          user_id: string;
          target_roles: string[];
          target_locations: string[];
          min_salary: number | null;
          experience_level: "entry" | "mid" | "senior";
          remote_preference: "remote" | "hybrid" | "onsite" | "any";
          excluded_companies: string[];
          notify_email: boolean;
          notify_frequency: "daily" | "weekly";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          target_roles?: string[];
          target_locations?: string[];
          min_salary?: number | null;
          experience_level?: "entry" | "mid" | "senior";
          remote_preference?: "remote" | "hybrid" | "onsite" | "any";
          excluded_companies?: string[];
          notify_email?: boolean;
          notify_frequency?: "daily" | "weekly";
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_preferences"]["Insert"]>;
        Relationships: [];
      };
      resumes: {
        Row: {
          id: string;
          user_id: string;
          file_path: string;
          file_name: string;
          file_size: number;
          parsed_data: Json | null;
          raw_text: string | null;
          parsing_status: "pending" | "processing" | "completed" | "failed";
          parsing_error: string | null;
          is_primary: boolean;
          is_user_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          file_path: string;
          file_name: string;
          file_size: number;
          parsed_data?: ParsedResume | null;
          raw_text?: string | null;
          parsing_status?: "pending" | "processing" | "completed" | "failed";
          parsing_error?: string | null;
          is_primary?: boolean;
          is_user_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["resumes"]["Insert"]>;
        Relationships: [];
      };
      jobs: {
        Row: {
          id: string;
          external_id: string;
          source: string;
          title: string;
          company: string;
          location: string | null;
          is_remote: boolean;
          description: string | null;
          salary_min: number | null;
          salary_max: number | null;
          salary_currency: string;
          job_type: string | null;
          experience_level: string | null;
          skills_extracted: string[];
          application_url: string | null;
          posted_at: string | null;
          expires_at: string | null;
          is_active: boolean;
          quality_score: number;
          raw_data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          external_id: string;
          source: string;
          title: string;
          company: string;
          location?: string | null;
          is_remote?: boolean;
          description?: string | null;
          salary_min?: number | null;
          salary_max?: number | null;
          salary_currency?: string;
          job_type?: string | null;
          experience_level?: string | null;
          skills_extracted?: string[];
          application_url?: string | null;
          posted_at?: string | null;
          expires_at?: string | null;
          is_active?: boolean;
          quality_score?: number;
          raw_data?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["jobs"]["Insert"]>;
        Relationships: [];
      };
      job_matches: {
        Row: {
          id: string;
          user_id: string;
          job_id: string;
          score: number;
          score_breakdown: Json;
          match_date: string;
          is_notified: boolean;
          user_status: string | null;
          status_updated_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          job_id: string;
          score: number;
          score_breakdown: Json;
          match_date?: string;
          is_notified?: boolean;
          user_status?: string | null;
          status_updated_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["job_matches"]["Insert"]>;
        Relationships: [];
      };
      user_interactions: {
        Row: {
          id: string;
          user_id: string;
          job_id: string;
          action: InteractionAction;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          job_id: string;
          action: InteractionAction;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      sponsor_friendly_companies: {
        Row: {
          company_name: string;
          source: string;
          created_at: string;
        };
        Insert: {
          company_name: string;
          source?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["sponsor_friendly_companies"]["Insert"]>;
        Relationships: [];
      };
      pipeline_logs: {
        Row: {
          id: string;
          run_date: string;
          steps: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          run_date?: string;
          steps: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["pipeline_logs"]["Insert"]>;
        Relationships: [];
      };
    };
  };
}

// ============================================
// Domain Types
// ============================================

export interface ParsedResume {
  name: string;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  summary: string | null;
  skills: {
    languages: string[];
    frameworks: string[];
    databases: string[];
    tools: string[];
    other: string[];
  };
  skills_flat: string[];
  experience: ResumeExperience[];
  education: ResumeEducation[];
  projects: ResumeProject[];
  certifications: string[];
  total_years_experience: number;
  highest_degree: "bachelors" | "masters" | "phd" | "other" | null;
  target_roles_inferred: string[];
  _parsing_confidence: "high" | "medium" | "low";
  _flags: string[];
}

export interface ResumeExperience {
  company: string;
  title: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  description: string;
  technologies: string[];
}

export interface ResumeEducation {
  institution: string;
  degree: string;
  field: string;
  gpa: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  coursework: string[];
}

export interface ResumeProject {
  name: string;
  description: string;
  technologies: string[];
  url: string | null;
}

export interface ScoreBreakdown {
  title: number;
  skills: number;
  location: number;
  experience: number;
  recency: number;
  sponsor: number;
  total: number;
  explanation: string;
  is_h1b_sponsor?: boolean;
  is_everify?: boolean;
}

export type InteractionAction =
  | "view"
  | "save"
  | "unsave"
  | "dismiss"
  | "undismiss"
  | "apply"
  | "click_apply_link";

export type EmailCategory =
  | "application_confirmation"
  | "interview_invite"
  | "offer"
  | "rejection"
  | "recruiter_outreach"
  | "unknown";
