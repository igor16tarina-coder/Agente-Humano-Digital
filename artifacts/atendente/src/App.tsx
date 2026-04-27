import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useGetWhatsappState,
  useGetSettings,
  type Contact,
} from "@workspace/api-client-react";
import { ConnectionPanel } from "@/components/ConnectionPanel";
import { ContactsList } from "@/components/ContactsList";
import { MessageThread } from "@/components/MessageThread";
import { ModeToggle } from "@/components/ModeToggle";
import { StatsBar } from "@/components/StatsBar";
import { SettingsDrawer } from "@/components/SettingsDrawer";
import { Sparkles } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false },
  },
});

function Dashboard() {
  const { data: state } = useGetWhatsappState({
    query: { refetchInterval: 3000 },
  });
  const { data: settings } = useGetSettings();
  const [selected, setSelected] = useState<Contact | null>(null);

  const connected = state?.status === "connected";

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between flex-wrap gap-3 border-b border-emerald-100/80 bg-white/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-emerald-900">
              {settings?.agentName ?? "Atendente"}
            </h1>
            <p className="text-xs text-emerald-700/70">
              Seu WhatsApp atendido com carinho 24/7
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 border border-emerald-100 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                connected ? "bg-emerald-500 pulse-dot" : "bg-zinc-400"
              }`}
            />
            <span className="text-emerald-900 font-medium">
              {connected
                ? state?.phoneNumber
                  ? `+${state.phoneNumber}`
                  : "Conectado"
                : "Desconectado"}
            </span>
          </div>
          {connected && <ModeToggle />}
          <SettingsDrawer />
        </div>
      </header>

      {!connected ? (
        <main className="flex-1 flex items-center justify-center p-6">
          <ConnectionPanel />
        </main>
      ) : (
        <main className="flex-1 flex flex-col gap-4 p-4 md:p-6">
          <StatsBar />
          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 flex-1 min-h-[60vh]">
            <ContactsList
              selectedJid={selected?.jid ?? null}
              onSelect={setSelected}
            />
            <MessageThread contact={selected} />
          </div>
        </main>
      )}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  );
}

export default App;
