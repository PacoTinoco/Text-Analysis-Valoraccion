import { supabase } from "@/lib/supabase";

type SaveReportParams = {
  title: string;
  config: any;
  results: any;
  aiSummary?: string | null;
};

export async function saveReport(params: SaveReportParams): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "No has iniciado sesión" };
  }

  const { error } = await supabase.from("reports").insert({
    user_id: user.id,
    title: params.title,
    config: params.config,
    results: params.results,
    ai_summary: params.aiSummary || null,
  });

  if (error) {
    console.error("Error saving report:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}