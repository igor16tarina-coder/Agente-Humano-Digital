import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetSettings,
  useUpdateSettings,
  getGetSettingsQueryKey,
  type Settings,
} from "@workspace/api-client-react";
import { Settings2, X, Save, Loader2 } from "lucide-react";

const VOICES = [
  { value: "alloy", label: "Alloy (neutra)" },
  { value: "nova", label: "Nova (suave)" },
  { value: "shimmer", label: "Shimmer (calorosa)" },
  { value: "echo", label: "Echo (firme)" },
  { value: "fable", label: "Fable (jovem)" },
  { value: "onyx", label: "Onyx (grave)" },
];

export function SettingsDrawer() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const { data } = useGetSettings();
  const update = useUpdateSettings({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        setOpen(false);
      },
    },
  });

  const [form, setForm] = useState<Settings | null>(null);

  useEffect(() => {
    if (data && (!form || open === false)) {
      setForm(data);
    }
  }, [data, open]);

  function update_<K extends keyof Settings>(key: K, value: Settings[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  function save() {
    if (!form) return;
    update.mutate({
      data: {
        ownerName: form.ownerName,
        agentName: form.agentName,
        agentPersona: form.agentPersona,
        voice: form.voice,
        voiceEnabled: form.voiceEnabled,
        autoReplyAudioForAudio: form.autoReplyAudioForAudio,
      },
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-2xl bg-white/80 border border-emerald-100 px-4 py-2 inline-flex items-center gap-2 text-emerald-800 hover:bg-emerald-50 shadow-sm"
      >
        <Settings2 className="w-4 h-4" />
        Personalizar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-emerald-950/30 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md h-full bg-white shadow-xl flex flex-col animate-in slide-in-from-right">
            <div className="flex items-center justify-between p-4 border-b border-emerald-100">
              <h3 className="font-semibold text-emerald-900">
                Como o atendente fala
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-full hover:bg-emerald-50"
              >
                <X className="w-5 h-5 text-emerald-700" />
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              <Field label="Seu nome (do dono)">
                <input
                  className="input"
                  value={form?.ownerName ?? ""}
                  onChange={(e) => update_("ownerName", e.target.value)}
                />
              </Field>
              <Field label="Nome do atendente">
                <input
                  className="input"
                  value={form?.agentName ?? ""}
                  onChange={(e) => update_("agentName", e.target.value)}
                />
              </Field>
              <Field label="Personalidade">
                <textarea
                  rows={8}
                  className="input"
                  value={form?.agentPersona ?? ""}
                  onChange={(e) => update_("agentPersona", e.target.value)}
                />
                <p className="text-xs text-emerald-700/70 mt-1">
                  O atendente nunca vai dizer que é uma IA.
                </p>
              </Field>
              <Field label="Voz para áudios">
                <select
                  className="input"
                  value={form?.voice ?? "alloy"}
                  onChange={(e) => update_("voice", e.target.value)}
                >
                  {VOICES.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </Field>
              <ToggleRow
                label="Permitir respostas em áudio"
                value={!!form?.voiceEnabled}
                onChange={(v) => update_("voiceEnabled", v)}
              />
              <ToggleRow
                label="Responder em áudio quando receber áudio"
                value={!!form?.autoReplyAudioForAudio}
                onChange={(v) => update_("autoReplyAudioForAudio", v)}
              />
            </div>
            <div className="p-4 border-t border-emerald-100">
              <button
                onClick={save}
                disabled={update.isPending}
                className="w-full rounded-2xl bg-emerald-600 text-white py-2.5 font-medium hover:bg-emerald-700 disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {update.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .input {
          width: 100%;
          border-radius: 12px;
          border: 1px solid rgb(167 243 208);
          padding: 8px 12px;
          font-size: 14px;
          background: white;
          color: rgb(6 78 59);
        }
        .input:focus {
          outline: none;
          box-shadow: 0 0 0 2px rgb(110 231 183);
        }
      `}</style>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-emerald-900">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="w-full flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2"
    >
      <span className="text-sm text-emerald-900">{label}</span>
      <span
        className={`relative inline-block w-10 h-6 rounded-full transition ${
          value ? "bg-emerald-600" : "bg-emerald-200"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            value ? "translate-x-4" : ""
          }`}
        />
      </span>
    </button>
  );
}
