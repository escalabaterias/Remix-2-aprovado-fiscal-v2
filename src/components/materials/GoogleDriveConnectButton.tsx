/**
 * GOOGLE DRIVE CONNECT BUTTON — P0.1-B
 *
 * Componente UI para visualização e gerenciamento do status da conexão com o Google Drive.
 *
 * ESTADOS MÍNIMOS:
 *   - Desconectado: Botão "Conectar Google Drive"
 *   - Conectando: "Conectando..."
 *   - Conectado: "✓ Google Drive conectado" + botão "Desconectar"
 *   - Erro: Mensagem de falha + botão "Tentar novamente"
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { HardDrive, CheckCircle2, AlertCircle, Loader2, LogOut, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  serverGetDriveStatus,
  serverInitiateDriveOAuth,
  serverDisconnectDrive,
} from "@/lib/materials/drive/drive-server-fn";

export function GoogleDriveConnectButton() {
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);

  // Consulta status da conexão via Server Function
  const {
    data: status,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["google-drive-connection-status"],
    queryFn: async () => {
      return serverGetDriveStatus();
    },
  });

  // Inicia o fluxo de autorização via Server Function
  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      const redirectUri = `${window.location.origin}/_authenticated/configuracoes`;
      const { authUrl } = await serverInitiateDriveOAuth({ data: { redirectUri } });

      // Informa o usuário e redireciona para a tela oficial de autorização do Google
      toast.info("Redirecionando para autorização do Google Drive...");

      // Armazena marcação temporária para simular callback ou processamento
      setTimeout(() => {
        setIsConnecting(false);
        // Em ambiente web real, abre a URL de consentimento
        if (typeof window !== "undefined") {
          window.location.href = authUrl;
        }
      }, 800);
    } catch (err: any) {
      setIsConnecting(false);
      toast.error(err.message || "Erro ao iniciar conexão com o Google Drive.");
    }
  };

  // Desconecta a integração via Server Function
  const disconnect = useMutation({
    mutationFn: async () => {
      return serverDisconnectDrive();
    },
    onSuccess: () => {
      toast.success("Google Drive desconectado com sucesso.");
      queryClient.invalidateQueries({ queryKey: ["google-drive-connection-status"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao desconectar Google Drive.");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Verificando conexão com Google Drive…</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
        <div className="flex items-center gap-2 font-medium text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>Não foi possível conectar o Google Drive.</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Ocorreu uma falha ao consultar o status da sua conexão. Tente novamente.
        </p>
        <div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-1">
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  const isConnected = status?.connected === true;

  return (
    <div className="panel max-w-2xl space-y-4 px-5 py-5 border rounded-lg bg-card text-card-foreground shadow-xs">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-base">Integração Google Drive</h3>
            {isConnected ? (
              <Badge
                variant="outline"
                className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 gap-1"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Conectado
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-muted-foreground">
                Não conectado
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {isConnected
              ? "Sua conta do Google Drive está autorizada. O Aprovado Fiscal poderá localizar seus materiais de estudo vinculados aos tópicos do edital."
              : "Conecte sua conta do Google Drive para permitir que o Aprovado Fiscal encontre seus PDFs, apostilas e resumos de estudo."}
          </p>
        </div>
      </div>

      {isConnected && (
        <div className="rounded-md bg-muted/50 p-3 text-xs space-y-1.5 border">
          <div className="flex justify-between text-muted-foreground">
            <span>Escopo autorizado:</span>
            <span className="font-mono text-[11px] text-foreground">drive.metadata.readonly</span>
          </div>
          {status.accountEmail && (
            <div className="flex justify-between text-muted-foreground">
              <span>Conta vinculada:</span>
              <span className="font-medium text-foreground">{status.accountEmail}</span>
            </div>
          )}
          {status.connectedAt && (
            <div className="flex justify-between text-muted-foreground">
              <span>Conectado em:</span>
              <span>{new Date(status.connectedAt).toLocaleDateString("pt-BR")}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        {!isConnected ? (
          <Button onClick={handleConnect} disabled={isConnecting} className="gap-2">
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Conectando...
              </>
            ) : (
              <>
                <ExternalLink className="h-4 w-4" />
                Conectar Google Drive
              </>
            )}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => disconnect.mutate()}
            disabled={disconnect.isPending}
            className="text-destructive hover:text-destructive gap-2"
          >
            {disconnect.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            Desconectar Google Drive
          </Button>
        )}
      </div>
    </div>
  );
}
