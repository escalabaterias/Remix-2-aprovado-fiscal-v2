export type BlockType =
  | "paragraph"
  | "heading-1"
  | "heading-2"
  | "heading-3"
  | "callout"
  | "bullet-list"
  | "numbered-list"
  | "formula"
  | "table"
  | "divider";

export interface InlineMark {
  type: "bold" | "italic" | "underline" | "strikethrough" | "highlight" | "link" | "law-tag";
  color?: string;
  href?: string;
  metadata?: {
    lawNumber?: string;
    articleNumber?: string;
  };
}

export interface RichTextSegment {
  text: string;
  marks?: InlineMark[];
}

export interface CalloutData {
  style: "danger" | "warning" | "info" | "success";
  icon?: string;
  content: RichTextSegment[];
}

export interface ListData {
  items: RichTextSegment[][];
}

export interface TableData {
  headers: RichTextSegment[];
  rows: RichTextSegment[][][];
}

export interface FormulaData {
  expression: string;
}

export interface HeadingData {
  content: RichTextSegment[];
  isCollapsed?: boolean;
}

export interface ParagraphData {
  content: RichTextSegment[];
}

export interface DividerData {
  style?: "solid" | "dashed" | "double";
}

export interface DocumentBlock {
  id: string;
  type: BlockType;
  properties:
    ParagraphData | HeadingData | CalloutData | ListData | TableData | FormulaData | DividerData;
}

export interface StudyDocumentJSON {
  version: number;
  blocks: DocumentBlock[];
}
