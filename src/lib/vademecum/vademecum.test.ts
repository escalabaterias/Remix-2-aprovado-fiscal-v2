import { describe, it, expect } from "vitest";
import { searchVadeMecum, VADE_MECUM_DATABASE } from "./search";

describe("Vade Mecum Inteligente e Motor de Busca", () => {
  it("deve carregar com sucesso a base de dados de legislação seca tributária", () => {
    expect(VADE_MECUM_DATABASE.length).toBeGreaterThan(0);
    const ctn113 = VADE_MECUM_DATABASE.find((art) => art.id === "CTN-ART113");
    expect(ctn113).toBeDefined();
    expect(ctn113?.articleNumber).toBe("Art. 113");
    expect(ctn113?.diploma).toBe("CTN");
  });

  it("deve filtrar corretamente artigos por diploma legal", () => {
    const cfArticles = searchVadeMecum({ diploma: "CF/88" });
    const ctnArticles = searchVadeMecum({ diploma: "CTN" });

    expect(cfArticles.every((art) => art.diploma === "CF/88")).toBe(true);
    expect(ctnArticles.every((art) => art.diploma === "CTN")).toBe(true);
  });

  it("deve encontrar artigos pela busca textual livre (query)", () => {
    const results = searchVadeMecum({ query: "Imunidade Recíproca" });
    expect(results.length).toBeGreaterThan(0);

    const art150 = results.find((art) => art.id === "CF88-ART150");
    expect(art150).toBeDefined();
    expect(art150?.articleNumber).toBe("Art. 150");
  });

  it("deve filtrar artigos com relevância ou recorrência mínima de provas", () => {
    const highRelevance = searchVadeMecum({ relevance: "high" });
    expect(highRelevance.length).toBeGreaterThan(0);
    expect(highRelevance.every((art) => art.intelligence?.relevanceLevel === "high")).toBe(true);

    // Filtrar artigos cobrados pelo menos 200 vezes
    const highlyRecurrent = searchVadeMecum({ minRecurrence: 200 });
    expect(highlyRecurrent.length).toBeGreaterThan(0);
    expect(highlyRecurrent.every((art) => (art.intelligence?.recurrenceCount || 0) >= 200)).toBe(
      true,
    );
  });

  it("deve extrair com integridade as pegadinhas e os estilos de cobrança por banca", () => {
    const art150 = VADE_MECUM_DATABASE.find((art) => art.id === "CF88-ART150");
    expect(art150?.intelligence).toBeDefined();

    const traps = art150?.intelligence?.commonTraps || [];
    expect(traps.length).toBeGreaterThan(0);

    const fgvStyle = art150?.intelligence?.bankStyles.find((b) => b.bank === "FGV");
    expect(fgvStyle).toBeDefined();
    expect(fgvStyle?.styleDescription).toContain("benefícios fiscais");
  });
});
