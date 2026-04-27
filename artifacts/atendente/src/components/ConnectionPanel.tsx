import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetWhatsappState,
  useConnectWhatsapp,
  useDisconnectWhatsapp,
  getGetWhatsappStateQueryKey,
} from "@workspace/api-client-react";
import { Loader2, QrCode, Smartphone, Power, RefreshCw } from "lucide-react";

export function ConnectionPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useGetWhatsappState({
    query: { refetchInterval: 2500 },
  });
  const connect = useConnectWhatsapp({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetWhatsappStateQueryKey() });
      },
    },
  });
  const disconnect = useDisconnectWhatsapp({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetWhatsappStateQueryKey() });
      },
    },
  });

  useEffect(() => {
    // auto-trigger connect if disconnected on first load (so QR appears)
    if (data?.status === "disconnected" || data?.status === "logged_out") {
      // intentionally not auto-connecting; user has to click
    }
  }, [data?.status]);

  const status = data?.status ?? "loading";

  return (
    <div className="rounded-3xl bg-white/70 backdrop-blur-md border border-emerald-100 shadow-sm p-8 w-full max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-700">
          <Smartphone className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-emerald-900">
            Conectar WhatsApp
          </h2>
          <p className="text-sm text-emerald-700/70">
            Use seu celular para escanear o QR code abaixo.
          </p>
        </div>
      </div>

      {(status === "loading" || isLoading) && (
        <div className="flex flex-col items-center justify-center py-10 text-emerald-700">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="mt-3 text-sm">Carregando…</p>
        </div>
      )}

      {(status === "disconnected" || status === "logged_out") && (
        <div className="flex flex-col items-center text-center gap-4 py-6">
          <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-700">
            <QrCode className="w-10 h-10" />
          </div>
          <p className="text-emerald-900 font-medium">
            {status === "logged_out"
              ? "Sessão encerrada. Conecte de novo para gerar um QR."
              : "Vamos lá! Clique abaixo para gerar o QR code."}
          </p>
          <button
            onClick={() => connect.mutate()}
            disabled={connect.isPending}
            className="px-6 py-3 rounded-2xl bg-emerald-600 text-white font-semibold shadow-md hover:bg-emerald-700 disabled:opacity-60 inline-flex items-center gap-2"
          >
            {connect.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <QrCode className="w-4 h-4" />
            )}
            Gerar QR code
          </button>
        </div>
      )}

      {status === "connecting" && !data?.qrCode && (
        <div className="flex flex-col items-center py-10 text-emerald-700 gap-3">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm">Conectando…</p>
        </div>
      )}

      {status === "qr_pending" && data?.qrCode && (
        <div className="flex flex-col items-center text-center gap-4">
          <div className="bg-white p-3 rounded-2xl border border-emerald-200 shadow-inner">
            <img src={data.qrCode} alt="QR code" className="w-64 h-64" />
          </div>
          <ol className="text-sm text-emerald-900/80 text-left max-w-sm space-y-1 list-decimal list-inside">
            <li>Abra o WhatsApp no seu celular</li>
            <li>Toque em <strong>Mais opções</strong> → <strong>Aparelhos conectados</strong></li>
            <li>Toque em <strong>Conectar um aparelho</strong> e escaneie o código</li>
          </ol>
          <button
            onClick={() => connect.mutate()}
            className="text-sm text-emerald-700 inline-flex items-center gap-1 hover:underline"
          >
            <RefreshCw className="w-3 h-3" /> Gerar novo QR
          </button>
        </div>
      )}

      {status === "connected" && (
        <div className="flex flex-col items-center text-center gap-4 py-6">
          <div className="relative">
            <div className="w-4 h-4 rounded-full bg-emerald-500 pulse-dot" />
          </div>
          <h3 className="text-lg font-semibold text-emerald-900">
            Conectado!
          </h3>
          {data?.phoneNumber && (
            <p className="text-sm text-emerald-700">+{data.phoneNumber}</p>
          )}
          <button
            onClick={() => disconnect.mutate()}
            disabled={disconnect.isPending}
            className="px-4 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 inline-flex items-center gap-2"
          >
            <Power className="w-4 h-4" />
            Desconectar
          </button>
        </div>
      )}
    </div>
  );
}
