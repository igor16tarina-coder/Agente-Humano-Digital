import { useGetStats } from "@workspace/api-client-react";
import { MessageSquare, Bot, User, Inbox, Users } from "lucide-react";

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone: string;
}) {
  return (
    <div className="flex-1 min-w-[150px] rounded-2xl bg-white/70 border border-emerald-100 shadow-sm p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl ${tone}`}>{icon}</div>
        <div>
          <p className="text-xs text-emerald-700/70">{label}</p>
          <p className="text-2xl font-semibold text-emerald-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

export function StatsBar() {
  const { data } = useGetStats({ query: { refetchInterval: 4000 } });
  return (
    <div className="flex gap-3 flex-wrap">
      <Stat
        icon={<Users className="w-4 h-4 text-emerald-700" />}
        label="Contatos"
        value={data?.totalContacts ?? 0}
        tone="bg-emerald-100"
      />
      <Stat
        icon={<Inbox className="w-4 h-4 text-sky-700" />}
        label="Recebidas hoje"
        value={data?.incomingToday ?? 0}
        tone="bg-sky-100"
      />
      <Stat
        icon={<Bot className="w-4 h-4 text-violet-700" />}
        label="Atendente respondeu"
        value={data?.aiRepliesToday ?? 0}
        tone="bg-violet-100"
      />
      <Stat
        icon={<User className="w-4 h-4 text-amber-700" />}
        label="Você respondeu"
        value={data?.manualRepliesToday ?? 0}
        tone="bg-amber-100"
      />
      <Stat
        icon={<MessageSquare className="w-4 h-4 text-teal-700" />}
        label="Mensagens (total)"
        value={data?.totalMessages ?? 0}
        tone="bg-teal-100"
      />
    </div>
  );
}
