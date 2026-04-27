import {
  makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
  type WASocket,
  type proto,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import qrcode from "qrcode";
import { db, contactsTable, whatsappMessagesTable, settingsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { Buffer } from "node:buffer";
import { logger } from "../logger";
import { useDbAuthState, clearAuthState } from "./store";
import {
  generateReplyText,
  synthesizeReplyAudio,
  transcribeAudioBuffer,
} from "./ai";

type ConnectionStatus =
  | "disconnected"
  | "qr_pending"
  | "connecting"
  | "connected"
  | "logged_out";

type State = {
  status: ConnectionStatus;
  qrCode: string | null;
  phoneNumber: string | null;
  connectedAt: Date | null;
};

let socket: WASocket | null = null;
let starting = false;
let state: State = {
  status: "disconnected",
  qrCode: null,
  phoneNumber: null,
  connectedAt: null,
};

export function getState(): State {
  return state;
}

export async function ensureSettings() {
  const [existing] = await db.select().from(settingsTable).limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(settingsTable)
    .values({})
    .returning();
  return created;
}

function jidToPhone(jid: string): string {
  return jid.split("@")[0]?.split(":")[0] ?? jid;
}

async function upsertContact(jid: string, displayName?: string | null) {
  const fallback = jidToPhone(jid);
  const name = displayName?.trim() || `+${fallback}`;
  await db
    .insert(contactsTable)
    .values({ jid, name })
    .onConflictDoUpdate({
      target: contactsTable.jid,
      set: { name, updatedAt: new Date() },
    });
}

async function recordMessage(args: {
  contactJid: string;
  whatsappMessageId?: string | null;
  fromMe: boolean;
  isAi: boolean;
  kind: "text" | "audio";
  text?: string | null;
  audioUrl?: string | null;
  durationSeconds?: number | null;
}) {
  await db.insert(whatsappMessagesTable).values({
    contactJid: args.contactJid,
    whatsappMessageId: args.whatsappMessageId ?? null,
    fromMe: args.fromMe,
    isAi: args.isAi,
    kind: args.kind,
    text: args.text ?? null,
    audioUrl: args.audioUrl ?? null,
    durationSeconds: args.durationSeconds ?? null,
  });
  const preview =
    args.kind === "audio"
      ? "🎤 Áudio"
      : (args.text ?? "").slice(0, 80);
  await db
    .update(contactsTable)
    .set({
      lastMessageAt: new Date(),
      lastMessagePreview: preview,
      unread: args.fromMe
        ? 0
        : sql`${contactsTable.unread} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(contactsTable.jid, args.contactJid));
}

export async function markContactRead(jid: string) {
  await db
    .update(contactsTable)
    .set({ unread: 0 })
    .where(eq(contactsTable.jid, jid));
}

async function handleIncomingMessage(m: proto.IWebMessageInfo) {
  if (!m.message) return;
  if (m.key.fromMe) return;
  const jid = m.key.remoteJid;
  if (!jid) return;
  if (jid.endsWith("@g.us")) return; // ignore groups
  if (jid === "status@broadcast") return;
  if (jid.endsWith("@broadcast")) return;

  const contactName = m.pushName || null;
  await upsertContact(jid, contactName);

  let incomingText = "";
  let kind: "text" | "audio" = "text";

  const text =
    m.message.conversation ||
    m.message.extendedTextMessage?.text ||
    m.message.imageMessage?.caption ||
    "";
  if (text) incomingText = text;

  const audioMsg = m.message.audioMessage || m.message.pttMessage;
  if (audioMsg) {
    kind = "audio";
    try {
      const buffer = (await downloadMediaMessage(
        m,
        "buffer",
        {},
      )) as Buffer;
      incomingText = await transcribeAudioBuffer(buffer);
    } catch (err) {
      logger.error({ err }, "audio transcription failed");
      incomingText = "";
    }
  }

  await recordMessage({
    contactJid: jid,
    whatsappMessageId: m.key.id ?? null,
    fromMe: false,
    isAi: false,
    kind,
    text: incomingText || null,
    durationSeconds: audioMsg?.seconds ?? null,
  });

  const settings = await ensureSettings();
  if (settings.mode !== "agent") {
    return; // Owner is online; AI stays silent.
  }
  if (!incomingText.trim()) {
    return; // Nothing to reply to (e.g. unknown media).
  }

  try {
    if (socket) {
      await socket.sendPresenceUpdate(
        kind === "audio" ? "recording" : "composing",
        jid,
      );
    }

    const replyText = await generateReplyText({
      contactJid: jid,
      contactName: contactName || "",
      incomingText,
    });

    const shouldReplyWithAudio =
      settings.voiceEnabled &&
      kind === "audio" &&
      settings.autoReplyAudioForAudio;

    if (shouldReplyWithAudio && socket) {
      const { buffer, durationSeconds } = await synthesizeReplyAudio(replyText);
      const sent = await socket.sendMessage(jid, {
        audio: buffer,
        mimetype: "audio/ogg; codecs=opus",
        ptt: true,
      });
      await recordMessage({
        contactJid: jid,
        whatsappMessageId: sent?.key?.id ?? null,
        fromMe: true,
        isAi: true,
        kind: "audio",
        text: replyText,
        durationSeconds,
      });
    } else if (socket) {
      const sent = await socket.sendMessage(jid, { text: replyText });
      await recordMessage({
        contactJid: jid,
        whatsappMessageId: sent?.key?.id ?? null,
        fromMe: true,
        isAi: true,
        kind: "text",
        text: replyText,
      });
    }
  } catch (err) {
    logger.error({ err }, "AI auto-reply failed");
  } finally {
    if (socket) {
      await socket.sendPresenceUpdate("paused", jid).catch(() => {});
    }
  }
}

export async function sendOwnerText(jid: string, text: string) {
  if (!socket || state.status !== "connected") {
    throw new Error("WhatsApp não está conectado");
  }
  await upsertContact(jid);
  const sent = await socket.sendMessage(jid, { text });
  await recordMessage({
    contactJid: jid,
    whatsappMessageId: sent?.key?.id ?? null,
    fromMe: true,
    isAi: false,
    kind: "text",
    text,
  });
}

export async function startWhatsApp(): Promise<State> {
  if (socket && (state.status === "connected" || state.status === "qr_pending")) {
    return state;
  }
  if (starting) return state;
  starting = true;

  try {
    const { state: authState, saveCreds } = await useDbAuthState();
    const { version } = await fetchLatestBaileysVersion().catch(() => ({
      version: [2, 3000, 1023223821] as [number, number, number],
    }));

    state = { ...state, status: "connecting", qrCode: null };

    const sock = makeWASocket({
      version,
      auth: authState,
      printQRInTerminal: false,
      browser: ["Atendente", "Chrome", "1.0"],
      syncFullHistory: false,
      markOnlineOnConnect: false,
    });

    socket = sock;

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        try {
          const dataUrl = await qrcode.toDataURL(qr, { width: 320, margin: 1 });
          state = { ...state, status: "qr_pending", qrCode: dataUrl };
        } catch (err) {
          logger.error({ err }, "qr encode failed");
        }
      }
      if (connection === "open") {
        const me = sock.user?.id;
        state = {
          status: "connected",
          qrCode: null,
          phoneNumber: me ? jidToPhone(me) : null,
          connectedAt: new Date(),
        };
        logger.info({ me }, "WhatsApp connected");
      }
      if (connection === "close") {
        const code = (lastDisconnect?.error as Boom | undefined)?.output
          ?.statusCode;
        const loggedOut = code === DisconnectReason.loggedOut;
        logger.warn({ code, loggedOut }, "WhatsApp connection closed");
        socket = null;
        if (loggedOut) {
          await clearAuthState().catch(() => {});
          state = {
            status: "logged_out",
            qrCode: null,
            phoneNumber: null,
            connectedAt: null,
          };
        } else {
          state = { ...state, status: "disconnected", qrCode: null };
          setTimeout(() => {
            startWhatsApp().catch((err) =>
              logger.error({ err }, "reconnect failed"),
            );
          }, 2500);
        }
      }
    });

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify" && type !== "append") return;
      for (const msg of messages) {
        try {
          await handleIncomingMessage(msg);
        } catch (err) {
          logger.error({ err }, "message handling failed");
        }
      }
    });
  } finally {
    starting = false;
  }

  return state;
}

export async function stopWhatsApp(forget = true): Promise<State> {
  try {
    if (socket) {
      await socket.logout().catch(() => {});
      socket.end(undefined);
    }
  } catch {}
  socket = null;
  if (forget) {
    await clearAuthState();
  }
  state = {
    status: "disconnected",
    qrCode: null,
    phoneNumber: null,
    connectedAt: null,
  };
  return state;
}

export async function bootstrap() {
  await ensureSettings();
  // Auto-start if there is existing auth saved
  const { state: authState } = await useDbAuthState();
  if (authState.creds.registered) {
    logger.info("Restoring saved WhatsApp session");
    await startWhatsApp().catch((err) =>
      logger.error({ err }, "auto-start failed"),
    );
  }
}
