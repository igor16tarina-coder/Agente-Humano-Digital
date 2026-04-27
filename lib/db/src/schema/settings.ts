import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  mode: text("mode").notNull().default("agent"),
  ownerName: text("owner_name").notNull().default("Você"),
  agentName: text("agent_name").notNull().default("Lui"),
  agentPersona: text("agent_persona").notNull().default(
    "Você é um atendente humano, descontraído, brincalhão, gentil e prestativo. Use português do Brasil, frases curtas, naturais, com leveza. Nunca diga que é uma IA, robô, assistente virtual ou bot. Você é uma pessoa real ajudando enquanto o dono está ocupado. Se perguntarem algo que você não sabe, diga que vai checar e responder em breve.",
  ),
  voiceEnabled: boolean("voice_enabled").notNull().default(true),
  voice: text("voice").notNull().default("alloy"),
  autoReplyAudioForAudio: boolean("auto_reply_audio_for_audio").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SettingsRow = typeof settingsTable.$inferSelect;
