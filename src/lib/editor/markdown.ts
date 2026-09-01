import { DocumentBlock, RichTextSegment, BlockType } from "./types";

/**
 * Converte um segmento de texto formatado com InlineMarks para representação Markdown
 */
export function segmentsToMarkdown(segments: RichTextSegment[] = []): string {
  return segments
    .map((seg) => {
      let text = seg.text;
      if (!seg.marks) return text;

      seg.marks.forEach((mark) => {
        if (mark.type === "bold") {
          text = `**${text}**`;
        } else if (mark.type === "italic") {
          text = `*${text}*`;
        } else if (mark.type === "underline") {
          text = `<u>${text}</u>`;
        } else if (mark.type === "highlight") {
          text = `<mark style="background-color: ${mark.color || "#50fa7b"}">${text}</mark>`;
        } else if (mark.type === "law-tag") {
          const law = mark.metadata?.lawNumber || "Lei";
          const art = mark.metadata?.articleNumber || "Art.";
          text = `[${text}](law:${law}#${art})`;
        }
      });

      return text;
    })
    .join("");
}

/**
 * Converte um bloco específico para Markdown plano
 */
export function blockToMarkdown(block: DocumentBlock): string {
  const props = block.properties;

  switch (block.type) {
    case "paragraph": {
      const pData = props as any;
      return segmentsToMarkdown(pData.content) + "\n\n";
    }
    case "heading-1": {
      const hData = props as any;
      return `# ${segmentsToMarkdown(hData.content)}\n\n`;
    }
    case "heading-2": {
      const hData = props as any;
      return `## ${segmentsToMarkdown(hData.content)}\n\n`;
    }
    case "heading-3": {
      const hData = props as any;
      return `### ${segmentsToMarkdown(hData.content)}\n\n`;
    }
    case "callout": {
      const cData = props as any;
      const emoji = cData.icon ? `${cData.icon} ` : "💡 ";
      const styleLabel = cData.style ? `[${cData.style.toUpperCase()}] ` : "";
      return `> ${emoji}${styleLabel}${segmentsToMarkdown(cData.content)}\n\n`;
    }
    case "bullet-list": {
      const lData = props as any;
      return (
        (lData.items || [])
          .map((item: RichTextSegment[]) => `* ${segmentsToMarkdown(item)}`)
          .join("\n") + "\n\n"
      );
    }
    case "numbered-list": {
      const lData = props as any;
      return (
        (lData.items || [])
          .map((item: RichTextSegment[], idx: number) => `${idx + 1}. ${segmentsToMarkdown(item)}`)
          .join("\n") + "\n\n"
      );
    }
    case "formula": {
      const fData = props as any;
      return `$$\n${fData.expression || ""}\n$$\n\n`;
    }
    case "table": {
      const tData = props as any;
      if (!tData.headers || tData.headers.length === 0) return "";

      const headerStr = `| ${tData.headers.map((h: any) => segmentsToMarkdown([h])).join(" | ")} |`;
      const dividerStr = `| ${tData.headers.map(() => "---").join(" | ")} |`;
      const rowsStr = (tData.rows || [])
        .map((row: any) => `| ${row.map((cell: any) => segmentsToMarkdown(cell)).join(" | ")} |`)
        .join("\n");

      return `${headerStr}\n${dividerStr}\n${rowsStr}\n\n`;
    }
    case "divider": {
      return "---\n\n";
    }
    default:
      return "";
  }
}

/**
 * Converte um conjunto completo de blocos para um documento Markdown consolidado
 */
export function blocksToMarkdown(blocks: DocumentBlock[]): string {
  return blocks.map(blockToMarkdown).join("");
}

/**
 * Converte Markdown simples para um array de blocos estruturados básico
 */
export function markdownToBlocks(markdown: string): DocumentBlock[] {
  if (!markdown) return [];

  const lines = markdown.split(/\n+/);
  const blocks: DocumentBlock[] = [];

  let currentListBlock: DocumentBlock | null = null;

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Detectar Headings
    if (trimmed.startsWith("# ")) {
      blocks.push({
        id: `block-${idx}-${Math.random().toString(36).substr(2, 5)}`,
        type: "heading-1",
        properties: { content: [{ text: trimmed.substring(2) }] },
      });
      currentListBlock = null;
    } else if (trimmed.startsWith("## ")) {
      blocks.push({
        id: `block-${idx}-${Math.random().toString(36).substr(2, 5)}`,
        type: "heading-2",
        properties: { content: [{ text: trimmed.substring(3) }] },
      });
      currentListBlock = null;
    } else if (trimmed.startsWith("### ")) {
      blocks.push({
        id: `block-${idx}-${Math.random().toString(36).substr(2, 5)}`,
        type: "heading-3",
        properties: { content: [{ text: trimmed.substring(4) }] },
      });
      currentListBlock = null;
    }
    // Detectar bullets
    else if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
      const text = trimmed.substring(2);
      if (currentListBlock && currentListBlock.type === "bullet-list") {
        (currentListBlock.properties as any).items.push([{ text }]);
      } else {
        currentListBlock = {
          id: `block-${idx}-${Math.random().toString(36).substr(2, 5)}`,
          type: "bullet-list",
          properties: { items: [[{ text }]] },
        };
        blocks.push(currentListBlock);
      }
    }
    // Outros parágrafos comuns
    else {
      blocks.push({
        id: `block-${idx}-${Math.random().toString(36).substr(2, 5)}`,
        type: "paragraph",
        properties: { content: [{ text: trimmed }] },
      });
      currentListBlock = null;
    }
  });

  return blocks;
}
