import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";

export const contactsTable = pgTable("contacts", {
  jid: text("jid").primaryKey(),
  name: text("name").notNull(),
  unread: integer("unread").notNull().default(0),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  lastMessagePreview: text("last_message_preview"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Contact = typeof contactsTable.$inferSelect;
