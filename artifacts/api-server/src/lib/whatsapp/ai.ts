import { openai } from "@workspace/integrations-openai-ai-server";
import {
  textToSpeech,
  speechToText,
  ensureCompatibleFormat,
} from "@workspace/integrations-openai-ai-server/audio";
import { db, settingsTable, whatsappMessagesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { spawn } from "node:child_process";
import { writeFile, unlink, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";

const HISTORY_LIMIT = 20;

export type AiReply = {
  text: string;
  audio: { buffer: Buffer; durationSeconds: number } | null;
};

export async function transcribeAudioBuffer(buffer: Buffer): Promise<string> {
  const compatible = await ensureCompatibleFormat(buffer);
  return await speechToText(compatible.buffer, compatible.format);
}

async function buildHistory(
  contactJid: string,
  ownerName: string,
  agentName: string,
): Promise<{ role: "system" | "user" | "assistant"; content: string }[]> {
  const rows = await db
    .select()
    .from(whatsappMessagesTable)
    .where(eq(whatsappMessagesTable.contactJid, contactJid))
    .orderBy(desc(whatsappMessagesTable.createdAt))
    .limit(HISTORY_LIMIT);

  const ordered = rows.reverse();
  return ordered
    .filter((m) => m.text && m.text.trim().length > 0)
    .map((m) => ({
      role: (m.fromMe ? "assistant" : "user") as "user" | "assistant",
      content: m.text!,
    }));
}

export async function generateReplyText(args: {
  contactJid: string;
  contactName: string;
  incomingText: string;
}): Promise<string> {
  const [settings] = await db.select().from(settingsTable).limit(1);
  if (!settings) throw new Error("settings not initialized");

  const system = [
    settings.agentPersona,
    `Você se chama ${settings.agentName}. Está respondendo o WhatsApp de ${settings.ownerName} enquanto ele(a) está ocupado(a).`,
    `A pessoa do outro lado é ${args.contactName || "um contato"}. Trate com cordialidade.`,
    `Regras absolutas:`,
    `- Nunca, em hipótese alguma, revele que você é uma IA, robô, assistente automático, modelo de linguagem ou bot.`,
    `- Se perguntarem se você é IA/robô/bot, responda com naturalidade negando, brincando levemente, e mude de assunto.`,
    `- Português do Brasil, tom leve, gentil, brincalhão sem exagero.`,
    `- Mensagens curtas como em um chat real (1 a 3 frases).`,
    `- Se a pessoa pedir algo que só ${settings.ownerName} pode resolver, diga que vai falar com ele(a) e voltar a responder.`,
  ].join("\n");

  const history = await buildHistory(
    args.contactJid,
    settings.ownerName,
    settings.agentName,
  );

  const completion = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [
      { role: "system", content: system },
      ...history,
      { role: "user", content: args.incomingText },
    ],
  });

  const text = completion.choices[0]?.message?.content?.trim();
  return text || "Oi! Tô meio enrolado agora, já já te respondo direitinho 🙂";
}

async function getAudioDurationSeconds(filePath: string): Promise<number> {
  return await new Promise<number>((resolve) => {
    const ff = spawn("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath,
    ]);
    let out = "";
    ff.stdout.on("data", (chunk) => (out += chunk.toString()));
    ff.on("close", () => {
      const seconds = parseFloat(out.trim());
      resolve(Number.isFinite(seconds) ? Math.round(seconds) : 0);
    });
    ff.on("error", () => resolve(0));
  });
}

async function convertMp3ToOpusOgg(
  mp3Buffer: Buffer,
): Promise<{ buffer: Buffer; durationSeconds: number }> {
  const inputPath = join(tmpdir(), `tts-${randomUUID()}.mp3`);
  const outputPath = join(tmpdir(), `tts-${randomUUID()}.ogg`);
  try {
    await writeFile(inputPath, mp3Buffer);
    await new Promise<void>((resolve, reject) => {
      const ff = spawn("ffmpeg", [
        "-i",
        inputPath,
        "-vn",
        "-c:a",
        "libopus",
        "-b:a",
        "32k",
        "-ar",
        "48000",
        "-ac",
        "1",
        "-application",
        "voip",
        "-f",
        "ogg",
        "-y",
        outputPath,
      ]);
      ff.stderr.on("data", () => {});
      ff.on("close", (code) =>
        code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`)),
      );
      ff.on("error", reject);
    });
    const buffer = await readFile(outputPath);
    const durationSeconds = await getAudioDurationSeconds(outputPath);
    return { buffer, durationSeconds };
  } finally {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}

export async function synthesizeReplyAudio(
  text: string,
): Promise<{ buffer: Buffer; durationSeconds: number }> {
  const [settings] = await db.select().from(settingsTable).limit(1);
  const voice = (settings?.voice ?? "alloy") as
    | "alloy"
    | "echo"
    | "fable"
    | "onyx"
    | "nova"
    | "shimmer";
  const mp3 = await textToSpeech(text, voice, "mp3");
  return await convertMp3ToOpusOgg(mp3);
}
