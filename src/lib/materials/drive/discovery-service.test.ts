import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mapMimeTypeToSourceType,
  buildDriveApiQuery,
  discoverDriveFiles,
  listSharedDrives,
  importDriveFileToSources,
  type DriveDiscoveryItem,
} from "./discovery-service";

describe("DRIVE DISCOVERY SERVICE — Unit Tests (P0.2-CORRECTION)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("mapMimeTypeToSourceType", () => {
    it("should map PDF mimeTypes to 'pdf'", () => {
      expect(mapMimeTypeToSourceType("application/pdf")).toBe("pdf");
    });

    it("should map video mimeTypes to 'video'", () => {
      expect(mapMimeTypeToSourceType("video/mp4")).toBe("video");
      expect(mapMimeTypeToSourceType("video/x-matroska")).toBe("video");
    });

    it("should map Google Docs/Sheets/Slides to 'documento'", () => {
      expect(mapMimeTypeToSourceType("application/vnd.google-apps.document")).toBe("documento");
      expect(mapMimeTypeToSourceType("application/vnd.google-apps.spreadsheet")).toBe("documento");
      expect(mapMimeTypeToSourceType("application/vnd.google-apps.presentation")).toBe("documento");
    });

    it("should default unknown mimeTypes to 'pdf'", () => {
      expect(mapMimeTypeToSourceType("unknown/mime")).toBe("pdf");
    });
  });

  describe("1 & 2. Meu Drive Raiz e Subpastas", () => {
    it("should build query for my_drive allowing subfolders and root without restricting to root only [UNITARIO]", () => {
      const q = buildDriveApiQuery({ location: "my_drive" });
      expect(q).toContain("('me' in owners or 'root' in parents)");
      expect(q).toContain("sharedWithMe = false");
    });
  });

  describe("3. Shared with me", () => {
    it("should build query adding sharedWithMe = true [UNITARIO]", () => {
      const q = buildDriveApiQuery({ location: "shared_with_me" });
      expect(q).toContain("sharedWithMe = true");
    });
  });

  describe("4. Pasta Compartilhada", () => {
    it("should extract parents array for items inside shared folders [UNITARIO]", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          files: [
            {
              id: "file_in_shared_folder",
              name: "Aula 04 ICMS.pdf",
              mimeType: "application/pdf",
              shared: true,
              parents: ["shared_folder_999"],
            },
          ],
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await discoverDriveFiles("mock_token", { location: "shared_with_me" });
      expect(result.items[0].parents).toEqual(["shared_folder_999"]);
    });
  });

  describe("5. Shared Drive", () => {
    it("should query with corpora=drive and driveId when driveId is provided [UNITARIO]", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          files: [
            {
              id: "sd_file_1",
              name: "Manual Fiscal.pdf",
              mimeType: "application/pdf",
              driveId: "sd_999",
            },
          ],
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await discoverDriveFiles("mock_token", {
        location: "shared_drive",
        driveId: "sd_999",
      });

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain("corpora=drive");
      expect(callUrl).toContain("driveId=sd_999");
      expect(result.items[0].location).toBe("shared_drive");
      expect(result.items[0].driveId).toBe("sd_999");
    });
  });

  describe("6. Múltiplos Shared Drives", () => {
    it("should list available Shared Drives via listSharedDrives [UNITARIO]", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          drives: [
            { id: "sd_01", name: "Equipe Fiscal" },
            { id: "sd_02", name: "Biblioteca Jurídica" },
          ],
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const drives = await listSharedDrives("mock_token");
      expect(drives).toHaveLength(2);
      expect(drives[0].name).toBe("Equipe Fiscal");
      expect(drives[1].id).toBe("sd_02");
    });
  });

  describe("7. Shortcut Query", () => {
    it("should build query adding shortcut mimeType clause [UNITARIO]", () => {
      const q = buildDriveApiQuery({ location: "shortcut" });
      expect(q).toContain("mimeType = 'application/vnd.google-apps.shortcut'");
    });
  });

  describe("8 & 12. Shortcut Target Resolution & Deduplicação", () => {
    it("should resolve shortcutTargetId and deduplicate using targetFileId [UNITARIO]", async () => {
      const mockShortcutItem: DriveDiscoveryItem = {
        id: "shortcut_file_123",
        name: "Atalhos Aula 01.pdf",
        mimeType: "application/vnd.google-apps.shortcut",
        shortcutTargetId: "real_target_file_999",
        shortcutTargetMimeType: "application/pdf",
        location: "shortcut",
        shared: false,
      };

      let updateCalled = false;
      const mockUpdate = vi.fn().mockImplementation((payload) => {
        updateCalled = true;
        return {
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: "mat_existing_01", title: payload.title, origin: "google_drive" },
                error: null,
              }),
              select: () => ({
                single: async () => ({
                  data: { id: "mat_existing_01", title: payload.title, origin: "google_drive" },
                  error: null,
                }),
              }),
            }),
          }),
        };
      });

      const mockClient: any = {
        from: (table: string) => {
          if (table === "sources") {
            return {
              select: () => {
                const chain: any = {
                  eq: () => chain,
                  order: () =>
                    Promise.resolve({
                      data: [
                        {
                          id: "mat_existing_01",
                          title: "Atalhos Aula 01.pdf",
                          user_id: "user_123",
                          metadata: {
                            provider: "google_drive",
                            driveFileId: "real_target_file_999",
                          },
                        },
                      ],
                      error: null,
                    }),
                  maybeSingle: async () => ({
                    data: {
                      id: "mat_existing_01",
                      title: "Atalhos Aula 01.pdf",
                      user_id: "user_123",
                      metadata: { provider: "google_drive", driveFileId: "real_target_file_999" },
                    },
                    error: null,
                  }),
                };
                return chain;
              },
              update: mockUpdate,
            };
          }
          return {};
        },
      };

      const result = await importDriveFileToSources(mockClient, "user_123", mockShortcutItem);

      expect(updateCalled).toBe(true);
      expect(result.id).toBe("mat_existing_01");
    });
  });

  describe("9. Target sem Acesso", () => {
    it("should throw clean error when importing shortcut without accessible targetId [UNITARIO]", async () => {
      const mockInaccessibleShortcut: DriveDiscoveryItem = {
        id: "shortcut_no_target",
        name: "Atalho Bloqueado",
        mimeType: "application/vnd.google-apps.shortcut",
        shortcutTargetId: null,
        location: "shortcut",
        shared: false,
      };

      const mockClient = {} as any;

      await expect(
        importDriveFileToSources(mockClient, "user_123", mockInaccessibleShortcut),
      ).rejects.toThrow("O atalho fornecido não possui um arquivo alvo acessível.");
    });
  });

  describe("10. Paginação", () => {
    it("should pass pageToken and return nextPageToken [UNITARIO]", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          nextPageToken: "page_token_next",
          files: [{ id: "f1", name: "Doc.pdf", mimeType: "application/pdf" }],
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await discoverDriveFiles("mock_token", { pageToken: "page_token_prev" });
      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain("pageToken=page_token_prev");
      expect(result.nextPageToken).toBe("page_token_next");
    });
  });

  describe("11. incompleteSearch", () => {
    it("should parse incompleteSearch flag from Google Drive API response [UNITARIO]", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          incompleteSearch: true,
          files: [],
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await discoverDriveFiles("mock_token", { location: "all" });
      expect(result.incompleteSearch).toBe(true);
    });
  });

  describe("13. Google API Error", () => {
    it("should throw formatted error when Google Drive API returns error status [UNITARIO]", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => "Insufficient Permission",
      });
      vi.stubGlobal("fetch", mockFetch);

      await expect(discoverDriveFiles("bad_token")).rejects.toThrow(
        "Erro na API do Google Drive (403): Insufficient Permission",
      );
    });
  });

  describe("14. Usuário Não Autenticado", () => {
    it("should throw error if userId is missing on import [UNITARIO]", async () => {
      const mockItem: DriveDiscoveryItem = {
        id: "d1",
        name: "Test",
        mimeType: "application/pdf",
        location: "my_drive",
        shared: false,
      };

      await expect(importDriveFileToSources({} as any, "", mockItem)).rejects.toThrow(
        "Usuário não autenticado.",
      );
    });
  });
});
