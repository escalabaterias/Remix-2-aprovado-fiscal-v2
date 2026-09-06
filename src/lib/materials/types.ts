import type { Database } from "@/integrations/supabase/types";

export type SourceType = Database["public"]["Enums"]["source_type"];
export type ProcessingStatus = Database["public"]["Enums"]["processing_status"];

export type MaterialRow = Database["public"]["Tables"]["sources"]["Row"];
export type MaterialInsert = Database["public"]["Tables"]["sources"]["Insert"];
export type MaterialUpdate = Database["public"]["Tables"]["sources"]["Update"];

export interface CreateMaterialInput {
  title: string;
  type?: SourceType;
  url?: string | null;
  filePath?: string | null;
  origin?: string | null;
  topicId?: string | null;
  subjectId?: string | null;
  contestId?: string | null;
  author?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UpdateMaterialInput {
  title?: string;
  type?: SourceType;
  url?: string | null;
  filePath?: string | null;
  origin?: string | null;
  topicId?: string | null;
  subjectId?: string | null;
  contestId?: string | null;
  author?: string | null;
  metadata?: Record<string, unknown>;
  processingStatus?: ProcessingStatus;
}

export interface MaterialFilter {
  topicId?: string;
  subjectId?: string;
  contestId?: string;
  type?: SourceType;
}
