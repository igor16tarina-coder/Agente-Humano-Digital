import { useListContacts, type Contact } from "@workspace/api-client-react";
import { formatTime } from "@/lib/format";
import { MessageCircle } from "lucide-react";

interface Props {
  selectedJid: string | null;
  onSelect: (c: Contact) => void;
}

export function ContactsList({ selectedJid, onSelect }: Props) {
  const { data, isLoading } = useListContacts({
    query: { refetchInterval: 3000 },
  });

  return (
    <div className="rounded-3xl bg-white/70 border border-emerald-100 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="px-4 py-3 border-b border-emerald-100 flex items-center gap-2">
        <MessageCircle className="w-4 h-4 text-emerald-700" />
        <h3 className="font-semibold text-emerald-900">Conversas</h3>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <p className="text-sm text-emerald-700/60 px-4 py-6 text-center">
            Carregando…
          </p>
        )}
        {!isLoading && (data?.length ?? 0) === 0 && (
          <p className="text-sm text-emerald-700/60 px-4 py-6 text-center">
            Nenhuma conversa ainda. Quando alguém te chamar, vai aparecer
            aqui.
          </p>
        )}
        {data?.map((c) => {
          const active = c.jid === selectedJid;
          return (
            <button
              key={c.jid}
              onClick={() => onSelect(c)}
              className={`w-full text-left px-4 py-3 border-b border-emerald-50 hover:bg-emerald-50/70 transition ${
                active ? "bg-emerald-100/70" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center text-sm font-semibold shrink-0">
                    {(c.name || "?").trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-emerald-900 truncate">
                      {c.name}
                    </p>
                    <p className="text-xs text-emerald-700/70 truncate">
                      {c.lastMessagePreview ?? "—"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0 gap-1">
                  <span className="text-[10px] text-emerald-700/60">
                    {formatTime(c.lastMessageAt)}
                  </span>
                  {c.unread > 0 && (
                    <span className="text-[10px] bg-emerald-600 text-white rounded-full px-2 py-0.5 min-w-[18px] text-center">
                      {c.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
