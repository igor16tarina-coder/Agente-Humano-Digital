import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListContactMessages,
  useSendContactMessage,
  getListContactMessagesQueryKey,
  getListContactsQueryKey,
  type Contact,
} from "@workspace/api-client-react";
import { formatTime, formatDuration, formatPhone } from "@/lib/format";
import { Send, Bot, Mic, Loader2 } from "lucide-react";

interface Props {
  contact: Contact | null;
}

export function MessageThread({ contact }: Props) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const jid = contact?.jid ?? "";
  const { data, isLoading } = useListContactMessages(jid, {
    query: { enabled: !!jid, refetchInterval: 2500 },
  });

  const send = useSendContactMessage({
    mutation: {
      onSuccess: () => {
        setText("");
        qc.invalidateQueries({
          queryKey: getListContactMessagesQueryKey(jid),
        });
        qc.invalidateQueries({ queryKey: getListContactsQueryKey() });
      },
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [data?.length, jid]);

  if (!contact) {
    return (
      <div className="rounded-3xl bg-white/70 border border-emerald-100 shadow-sm flex items-center justify-center text-emerald-700/60 h-full p-12 text-center">
        <div>
          <p className="text-lg">Selecione uma conversa</p>
          <p className="text-sm mt-1">
            Toque em alguém na lista pra ver as mensagens.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-white/70 border border-emerald-100 shadow-sm flex flex-col h-full overflow-hidden">
      <div className="px-5 py-3 border-b border-emerald-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center font-semibold">
          {contact.name.trim().charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-emerald-900 truncate">
            {contact.name}
          </p>
          <p className="text-xs text-emerald-700/70">
            {formatPhone(contact.jid)}
          </p>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-5 py-4 space-y-2 bg-gradient-to-b from-emerald-50/40 to-transparent"
      >
        {isLoading && (
          <p className="text-xs text-emerald-700/60 text-center py-4">
            Carregando mensagens…
          </p>
        )}
        {data?.map((m) => {
          const fromMe = m.fromMe;
          return (
            <div
              key={m.id}
              className={`flex ${fromMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                  fromMe
                    ? m.isAi
                      ? "bg-violet-100 text-violet-900 rounded-br-md"
                      : "bg-emerald-600 text-white rounded-br-md"
                    : "bg-white text-emerald-900 rounded-bl-md border border-emerald-50"
                }`}
              >
                {m.kind === "audio" && (
                  <div
                    className={`flex items-center gap-2 mb-1 text-xs ${
                      fromMe && !m.isAi ? "text-emerald-50" : "text-emerald-700"
                    }`}
                  >
                    <Mic className="w-3 h-3" />
                    Áudio · {formatDuration(m.durationSeconds)}
                  </div>
                )}
                {m.text && (
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                )}
                <div
                  className={`flex items-center gap-1 mt-1 text-[10px] ${
                    fromMe && !m.isAi
                      ? "text-emerald-100/80"
                      : "text-emerald-700/60"
                  }`}
                >
                  {m.isAi && (
                    <span className="inline-flex items-center gap-1">
                      <Bot className="w-3 h-3" /> atendente
                    </span>
                  )}
                  <span className="ml-auto">{formatTime(m.createdAt)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim() || !contact) return;
          send.mutate({ jid: contact.jid, data: { text } });
        }}
        className="border-t border-emerald-100 p-3 flex items-center gap-2"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Responder você mesmo…"
          className="flex-1 rounded-2xl border border-emerald-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
        <button
          type="submit"
          disabled={send.isPending || !text.trim()}
          className="rounded-2xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 inline-flex items-center gap-2"
        >
          {send.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Enviar
        </button>
      </form>
    </div>
  );
}
