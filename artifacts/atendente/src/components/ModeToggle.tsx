import { useQueryClient } from "@tanstack/react-query";
import {
  useGetSettings,
  useUpdateSettings,
  getGetSettingsQueryKey,
  getGetStatsQueryKey,
} from "@workspace/api-client-react";
import { Bot, User, Loader2 } from "lucide-react";

export function ModeToggle() {
  const qc = useQueryClient();
  const { data } = useGetSettings({ query: { refetchInterval: 5000 } });
  const update = useUpdateSettings({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetStatsQueryKey() });
      },
    },
  });

  const mode = data?.mode ?? "agent";

  function set(next: "agent" | "owner") {
    update.mutate({ data: { mode: next } });
  }

  return (
    <div className="inline-flex bg-white/70 border border-emerald-100 rounded-2xl p-1 shadow-sm">
      <button
        onClick={() => set("agent")}
        className={`px-4 py-2 rounded-xl text-sm font-medium inline-flex items-center gap-2 transition ${
          mode === "agent"
            ? "bg-emerald-600 text-white shadow"
            : "text-emerald-800 hover:bg-emerald-50"
        }`}
      >
        {update.isPending && mode !== "agent" ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Bot className="w-4 h-4" />
        )}
        Atendente cuida
      </button>
      <button
        onClick={() => set("owner")}
        className={`px-4 py-2 rounded-xl text-sm font-medium inline-flex items-center gap-2 transition ${
          mode === "owner"
            ? "bg-amber-500 text-white shadow"
            : "text-emerald-800 hover:bg-emerald-50"
        }`}
      >
        {update.isPending && mode !== "owner" ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <User className="w-4 h-4" />
        )}
        Eu respondo
      </button>
    </div>
  );
}
