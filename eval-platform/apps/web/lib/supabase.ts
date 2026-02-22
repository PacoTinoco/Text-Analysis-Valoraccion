import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://pobczhvcxksqojtoazco.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvYmN6aHZjeGtzcW9qdG9hemNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3ODc4NjMsImV4cCI6MjA4NzM2Mzg2M30.lm52bBHUnJ3ncPIDH4_6IvOI48-MESfdrRsC9ovigCc";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "user";
  created_at: string;
};

export type SavedReport = {
  id: string;
  user_id: string;
  file_id: string | null;
  title: string;
  config: any;
  results: any;
  ai_summary: string | null;
  created_at: string;
};

export type UploadedFile = {
  id: string;
  user_id: string;
  filename: string;
  file_path: string;
  size_mb: number;
  row_count: number;
  columns: any;
  created_at: string;
};
