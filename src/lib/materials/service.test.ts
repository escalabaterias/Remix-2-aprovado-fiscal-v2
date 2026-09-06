import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getUserMaterials,
  getMaterialsByTopic,
  getMaterialsBySubject,
  getMaterialById,
  createMaterial,
  updateMaterial,
  deleteMaterial,
} from "./service";
import type { MaterialRow } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// MOCK SUPABASE CLIENT & IN-MEMORY STORE
// ─────────────────────────────────────────────────────────────────────────────

type StoreRow = MaterialRow;

function createMockSupabaseClient(initialStore: StoreRow[] = []) {
  const store: StoreRow[] = [...initialStore];

  const client = {
    from: (table: string) => {
      if (table !== "sources") {
        throw new Error(`Tabela não suportada no mock: ${table}`);
      }

      let currentData: StoreRow[] = [...store];
      const filterError: Error | null = null;
      let singleMode = false;
      let maybeSingleMode = false;
      let operation: "select" | "insert" | "update" | "delete" = "select";
      const insertPayload: Partial<StoreRow> | null = null;
      let updatePayload: Partial<StoreRow> | null = null;

      const builder = {
        select: (_cols?: string) => {
          return builder;
        },
        eq: (col: keyof StoreRow, val: unknown) => {
          currentData = currentData.filter((row) => row[col] === val);
          return builder;
        },
        order: (col: keyof StoreRow, opts?: { ascending?: boolean }) => {
          const asc = opts?.ascending ?? true;
          currentData.sort((a, b) => {
            const valA = String(a[col] ?? "");
            const valB = String(b[col] ?? "");
            return asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
          });
          return builder;
        },
        single: () => {
          singleMode = true;
          return builder;
        },
        maybeSingle: () => {
          maybeSingleMode = true;
          return builder;
        },
        insert: (payload: Partial<StoreRow>) => {
          operation = "insert";
          const newRow: StoreRow = {
            id: payload.id || `mat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            user_id: payload.user_id!,
            title: payload.title!,
            type: payload.type || "pdf",
            url: payload.url ?? null,
            file_path: payload.file_path ?? null,
            origin: payload.origin ?? "user_upload",
            topic_id: payload.topic_id ?? null,
            subject_id: payload.subject_id ?? null,
            contest_id: payload.contest_id ?? null,
            author: payload.author ?? null,
            metadata: payload.metadata ?? {},
            processing_status: payload.processing_status || "processado",
            reliability: payload.reliability ?? 1,
            published_at: payload.published_at ?? null,
            processed_at: payload.processed_at ?? null,
            created_at: payload.created_at || new Date().toISOString(),
            updated_at: payload.updated_at || new Date().toISOString(),
          };
          store.push(newRow);
          currentData = [newRow];
          return builder;
        },
        update: (payload: Partial<StoreRow>) => {
          operation = "update";
          updatePayload = payload;
          return builder;
        },
        delete: () => {
          operation = "delete";
          return builder;
        },
        then: (resolve: (res: { data: any; error: any }) => void) => {
          if (filterError) {
            resolve({ data: null, error: filterError });
            return;
          }

          if (operation === "update") {
            const updatedRows: StoreRow[] = [];
            currentData.forEach((row) => {
              const idx = store.findIndex((s) => s.id === row.id);
              if (idx !== -1) {
                store[idx] = { ...store[idx], ...updatePayload };
                updatedRows.push(store[idx]);
              }
            });
            currentData = updatedRows;
          } else if (operation === "delete") {
            currentData.forEach((row) => {
              const idx = store.findIndex((s) => s.id === row.id);
              if (idx !== -1) {
                store.splice(idx, 1);
              }
            });
            resolve({ data: null, error: null });
            return;
          }

          if (singleMode) {
            if (currentData.length === 0) {
              resolve({ data: null, error: new Error("Nenhum registro encontrado.") });
            } else {
              resolve({ data: currentData[0], error: null });
            }
            return;
          }

          if (maybeSingleMode) {
            resolve({ data: currentData.length > 0 ? currentData[0] : null, error: null });
            return;
          }

          resolve({ data: currentData, error: null });
        },
      };

      return builder;
    },
    // Método auxiliar para inspeção de testes
    _getStore: () => store,
  };

  return client as any;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUÍTE DE TESTES DO MATERIAL SERVICE
// ─────────────────────────────────────────────────────────────────────────────

describe("MaterialService (P0.1-A)", () => {
  const userId = "user-123";
  const otherUserId = "user-456";

  const sampleMaterial1: StoreRow = {
    id: "mat-1",
    user_id: userId,
    title: "Apostila de ICMS Geral",
    type: "pdf",
    url: "https://drive.google.com/file/d/abc123/view",
    file_path: null,
    origin: "user_upload",
    topic_id: "topic-icms",
    subject_id: "subj-tributario",
    contest_id: "contest-sefaz",
    author: "Professor Fiscal",
    metadata: { pages: 42 },
    processing_status: "processado",
    reliability: 1,
    published_at: null,
    processed_at: null,
    created_at: "2026-09-01T10:00:00Z",
    updated_at: "2026-09-01T10:00:00Z",
  };

  const sampleMaterial2: StoreRow = {
    id: "mat-2",
    user_id: userId,
    title: "Videoaula Substituição Tributária",
    type: "youtube",
    url: "https://youtube.com/watch?v=xyz789",
    file_path: null,
    origin: "user_upload",
    topic_id: "topic-st",
    subject_id: "subj-tributario",
    contest_id: null,
    author: null,
    metadata: {},
    processing_status: "processado",
    reliability: 1,
    published_at: null,
    processed_at: null,
    created_at: "2026-09-02T10:00:00Z",
    updated_at: "2026-09-02T10:00:00Z",
  };

  const otherUserMaterial: StoreRow = {
    id: "mat-3",
    user_id: otherUserId,
    title: "Material Privado de Outro Usuário",
    type: "pdf",
    url: "https://example.com/privado.pdf",
    file_path: null,
    origin: "user_upload",
    topic_id: "topic-icms",
    subject_id: "subj-tributario",
    contest_id: null,
    author: null,
    metadata: {},
    processing_status: "processado",
    reliability: 1,
    published_at: null,
    processed_at: null,
    created_at: "2026-09-03T10:00:00Z",
    updated_at: "2026-09-03T10:00:00Z",
  };

  let client: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    client = createMockSupabaseClient([sampleMaterial1, sampleMaterial2, otherUserMaterial]);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. CONSULTA (READ)
  // ───────────────────────────────────────────────────────────────────────────

  describe("getUserMaterials", () => {
    it("deve listar apenas os materiais do usuário autenticado", async () => {
      const result = await getUserMaterials(client, userId);
      expect(result).toHaveLength(2);
      expect(result.map((m) => m.id)).toContain("mat-1");
      expect(result.map((m) => m.id)).toContain("mat-2");
      expect(result.map((m) => m.id)).not.toContain("mat-3");
    });

    it("deve aplicar filtro por topicId corretamente", async () => {
      const result = await getUserMaterials(client, userId, { topicId: "topic-icms" });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("mat-1");
    });

    it("deve aplicar filtro por subjectId corretamente", async () => {
      const result = await getUserMaterials(client, userId, { subjectId: "subj-tributario" });
      expect(result).toHaveLength(2);
    });

    it("deve aplicar filtro por tipo corretamente", async () => {
      const result = await getUserMaterials(client, userId, { type: "youtube" });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("mat-2");
    });

    it("deve lançar erro se o usuário não estiver autenticado", async () => {
      await expect(getUserMaterials(client, "")).rejects.toThrow("Usuário não autenticado.");
    });
  });

  describe("getMaterialsByTopic / getMaterialsBySubject / getMaterialById", () => {
    it("getMaterialsByTopic deve retornar lista do tópico do usuário", async () => {
      const materials = await getMaterialsByTopic(client, userId, "topic-icms");
      expect(materials).toHaveLength(1);
      expect(materials[0].title).toBe("Apostila de ICMS Geral");
    });

    it("getMaterialsByTopic deve retornar array vazio se topicId for vazio", async () => {
      const materials = await getMaterialsByTopic(client, userId, "");
      expect(materials).toEqual([]);
    });

    it("getMaterialsBySubject deve retornar lista da matéria do usuário", async () => {
      const materials = await getMaterialsBySubject(client, userId, "subj-tributario");
      expect(materials).toHaveLength(2);
    });

    it("getMaterialById deve retornar o material se pertencer ao usuário", async () => {
      const material = await getMaterialById(client, userId, "mat-1");
      expect(material).not.toBeNull();
      expect(material?.id).toBe("mat-1");
    });

    it("getMaterialById deve retornar null se o material pertencer a outro usuário (isolamento)", async () => {
      const material = await getMaterialById(client, userId, "mat-3");
      expect(material).toBeNull();
    });

    it("getMaterialById deve retornar null se o ID for inexistente", async () => {
      const material = await getMaterialById(client, userId, "mat-inexistente");
      expect(material).toBeNull();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. CRIAÇÃO (CREATE)
  // ───────────────────────────────────────────────────────────────────────────

  describe("createMaterial", () => {
    it("deve criar um novo material válido com sucesso", async () => {
      const newMat = await createMaterial(client, userId, {
        title: "Lei Kandir Comentada",
        type: "pdf",
        url: "https://drive.google.com/file/d/kandir123/view",
        topicId: "topic-icms",
        subjectId: "subj-tributario",
      });

      expect(newMat.id).toBeDefined();
      expect(newMat.title).toBe("Lei Kandir Comentada");
      expect(newMat.user_id).toBe(userId);
      expect(newMat.type).toBe("pdf");

      const all = await getUserMaterials(client, userId);
      expect(all).toHaveLength(3);
    });

    it("deve rejeitar criação sem título ou com título apenas com espaços", async () => {
      await expect(
        createMaterial(client, userId, {
          title: "   ",
          type: "pdf",
        }),
      ).rejects.toThrow("Título do material é obrigatório e não pode ser vazio.");
    });

    it("deve rejeitar criação com tipo inválido", async () => {
      await expect(
        createMaterial(client, userId, {
          title: "Material Invalido",
          type: "tipo_inexistente" as any,
        }),
      ).rejects.toThrow("Tipo de material inválido");
    });

    it("deve rejeitar criação com URL inválida", async () => {
      await expect(
        createMaterial(client, userId, {
          title: "Material Com URL Quebrada",
          type: "pdf",
          url: "invalid-url-string",
        }),
      ).rejects.toThrow("URL informada é inválida.");
    });

    it("deve rejeitar se userId estiver ausente", async () => {
      await expect(
        createMaterial(client, "", {
          title: "Material Sem User",
        }),
      ).rejects.toThrow("Usuário não autenticado.");
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. ATUALIZAÇÃO (UPDATE)
  // ───────────────────────────────────────────────────────────────────────────

  describe("updateMaterial", () => {
    it("deve atualizar um material existente do usuário com sucesso", async () => {
      const updated = await updateMaterial(client, userId, "mat-1", {
        title: "Apostila de ICMS Geral - Edição 2026",
        url: "https://drive.google.com/file/d/abc123_v2/view",
      });

      expect(updated.title).toBe("Apostila de ICMS Geral - Edição 2026");
      expect(updated.url).toBe("https://drive.google.com/file/d/abc123_v2/view");
    });

    it("deve impedir atualização de material pertencente a outro usuário", async () => {
      await expect(
        updateMaterial(client, userId, "mat-3", {
          title: "Tentativa de Hack",
        }),
      ).rejects.toThrow("Material não encontrado ou acesso não autorizado.");
    });

    it("deve rejeitar atualização com título em branco", async () => {
      await expect(
        updateMaterial(client, userId, "mat-1", {
          title: "  ",
        }),
      ).rejects.toThrow("Título do material não pode ser vazio.");
    });

    it("deve rejeitar atualização com URL inválida", async () => {
      await expect(
        updateMaterial(client, userId, "mat-1", {
          url: "not-a-valid-url",
        }),
      ).rejects.toThrow("URL informada é inválida.");
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. EXCLUSÃO (DELETE)
  // ───────────────────────────────────────────────────────────────────────────

  describe("deleteMaterial", () => {
    it("deve excluir um material existente do usuário", async () => {
      const res = await deleteMaterial(client, userId, "mat-1");
      expect(res.success).toBe(true);
      expect(res.id).toBe("mat-1");

      const remaining = await getUserMaterials(client, userId);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe("mat-2");
    });

    it("deve impedir exclusão de material de outro usuário", async () => {
      await expect(deleteMaterial(client, userId, "mat-3")).rejects.toThrow(
        "Material não encontrado ou acesso não autorizado.",
      );

      // Garante que o material do outro usuário não foi deletado
      const otherMaterials = await getUserMaterials(client, otherUserId);
      expect(otherMaterials).toHaveLength(1);
    });

    it("deve impedir exclusão de material inexistente", async () => {
      await expect(deleteMaterial(client, userId, "mat-fake")).rejects.toThrow(
        "Material não encontrado ou acesso não autorizado.",
      );
    });
  });
});
