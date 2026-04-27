import { pgTable, serial, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { contactsTable } from "./contacts";

export const whatsappMessagesTable = pgTable("whatsapp_messages", {
  id: serial("id").primaryKey(),
  contactJid: text("contact_jid")
    .notNull()
    .references(() => contactsTable.jid, { onDelete: "cascade" }),
  whatsappMessageId: text("whatsapp_message_id"),
  fromMe: boolean("from_me").notNull().default(false),
  isAi: boolean("is_ai").notNull().default(false),
  kind: text("kind").notNull().default("text"),
  text: text("text"),
  audioUrl: text("audio_url"),
  durationSeconds: integer("duration_seconds"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type WhatsappMessage = typeof whatsappMessagesTable.$inferSelect;
