import { describe, expect, it } from "vitest";
import { DocumentBlock } from "./types";
import { blockToMarkdown, blocksToMarkdown, markdownToBlocks } from "./markdown";

describe("Editor Rich-Text / Markdown Engine — Suíte de Testes (Etapa 3.1)", () => {
  it("deve converter parágrafos simples e marcadores inline (bold, italic) para Markdown", () => {
    const block: DocumentBlock = {
      id: "b1",
      type: "paragraph",
      properties: {
        content: [
          { text: "Olá aluno, revise o " },
          { text: "conteúdo de Direito Tributário", marks: [{ type: "bold" }] },
          { text: " com atenção " },
          { text: "focada", marks: [{ type: "italic" }] },
          { text: "." },
        ],
      },
    };

    const md = blockToMarkdown(block);
    expect(md).toBe(
      "Olá aluno, revise o **conteúdo de Direito Tributário** com atenção *focada*.\n\n",
    );
  });

  it("deve converter callouts de avisos fiscais com marcações inline", () => {
    const block: DocumentBlock = {
      id: "b2",
      type: "callout",
      properties: {
        style: "danger",
        icon: "🚨",
        content: [
          { text: "Atenção: pegadinha recorrente de " },
          { text: "Sujeito Passivo", marks: [{ type: "highlight", color: "#f1fa8c" }] },
        ],
      },
    };

    const md = blockToMarkdown(block);
    expect(md).toContain(
      '> 🚨 [DANGER] Atenção: pegadinha recorrente de <mark style="background-color: #f1fa8c">Sujeito Passivo</mark>\n\n',
    );
  });

  it("deve converter listas de bullets de forma encadeada", () => {
    const block: DocumentBlock = {
      id: "b3",
      type: "bullet-list",
      properties: {
        items: [[{ text: "Item prioritário 1" }], [{ text: "Item prioritário 2" }]],
      },
    };

    const md = blockToMarkdown(block);
    expect(md).toBe("* Item prioritário 1\n* Item prioritário 2\n\n");
  });

  it("deve converter fórmulas matemáticas (LaTeX) de forma isolada", () => {
    const block: DocumentBlock = {
      id: "b4",
      type: "formula",
      properties: {
        expression: "E = mc^2",
      },
    };

    const md = blockToMarkdown(block);
    expect(md).toBe("$$\nE = mc^2\n$$\n\n");
  });

  it("deve converter tabelas simples comparativas jurídicas", () => {
    const block: DocumentBlock = {
      id: "b5",
      type: "table",
      properties: {
        headers: [{ text: "Banca" }, { text: "Incidência" }],
        rows: [
          [[{ text: "CEBRASPE" }], [{ text: "Alta" }]],
          [[{ text: "FCC" }], [{ text: "Média" }]],
        ],
      },
    };

    const md = blockToMarkdown(block);
    expect(md).toContain("| Banca | Incidência |");
    expect(md).toContain("| CEBRASPE | Alta |");
    expect(md).toContain("| FCC | Média |");
  });

  it("deve parserizar Markdown básico de volta para blocos estruturados", () => {
    const md = "# Direito Tributário\n\n* Princípio da Legalidade\n* Princípio da Anterioridade";
    const blocks = markdownToBlocks(md);

    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe("heading-1");
    expect((blocks[0].properties as any).content[0].text).toBe("Direito Tributário");

    expect(blocks[1].type).toBe("bullet-list");
    expect((blocks[1].properties as any).items).toHaveLength(2);
    expect((blocks[1].properties as any).items[0][0].text).toBe("Princípio da Legalidade");
  });
});
