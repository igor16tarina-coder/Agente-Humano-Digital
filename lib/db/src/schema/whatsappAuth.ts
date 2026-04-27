import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const whatsappAuthTable = pgTable("whatsapp_auth", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type WhatsappAuth = typeof whatsappAuthTable.$inferSelect;
