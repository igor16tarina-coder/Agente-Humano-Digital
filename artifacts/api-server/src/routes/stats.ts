import { Router, type IRouter } from "express";
import { db, contactsTable, whatsappMessagesTable } from "@workspace/db";
import { sql, and, gte, eq } from "drizzle-orm";
import { GetStatsResponse } from "@workspace/api-zod";
import { getState, ensureSettings } from "../lib/whatsapp/service";

const router: IRouter = Router();

router.get("/stats", async (_req, res): Promise<void> => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [{ contacts }] = await db
    .select({ contacts: sql<number>`count(*)::int` })
    .from(contactsTable);
  const [{ messages }] = await db
    .select({ messages: sql<number>`count(*)::int` })
    .from(whatsappMessagesTable);
  const [{ aiToday }] = await db
    .select({ aiToday: sql<number>`count(*)::int` })
    .from(whatsappMessagesTable)
    .where(
      and(
        eq(whatsappMessagesTable.fromMe, true),
        eq(whatsappMessagesTable.isAi, true),
        gte(whatsappMessagesTable.createdAt, startOfDay),
      ),
    );
  const [{ ownerToday }] = await db
    .select({ ownerToday: sql<number>`count(*)::int` })
    .from(whatsappMessagesTable)
    .where(
      and(
        eq(whatsappMessagesTable.fromMe, true),
        eq(whatsappMessagesTable.isAi, false),
        gte(whatsappMessagesTable.createdAt, startOfDay),
      ),
    );
  const [{ incomingToday }] = await db
    .select({ incomingToday: sql<number>`count(*)::int` })
    .from(whatsappMessagesTable)
    .where(
      and(
        eq(whatsappMessagesTable.fromMe, false),
        gte(whatsappMessagesTable.createdAt, startOfDay),
      ),
    );

  const settings = await ensureSettings();
  const state = getState();

  res.json(
    GetStatsResponse.parse({
      totalContacts: contacts,
      totalMessages: messages,
      aiRepliesToday: aiToday,
      manualRepliesToday: ownerToday,
      incomingToday,
      connected: state.status === "connected",
      mode: settings.mode,
    }),
  );
});

export default router;
