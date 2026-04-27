import { Router, type IRouter } from "express";
import { db, contactsTable, whatsappMessagesTable } from "@workspace/db";
import { desc, eq, sql } from "drizzle-orm";
import {
  ListContactsResponse,
  ListContactMessagesResponse,
  SendContactMessageBody,
  ListContactMessagesResponseItem,
} from "@workspace/api-zod";
import { sendOwnerText, markContactRead } from "../lib/whatsapp/service";

const router: IRouter = Router();

router.get("/contacts", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      jid: contactsTable.jid,
      name: contactsTable.name,
      lastMessageAt: contactsTable.lastMessageAt,
      lastMessagePreview: contactsTable.lastMessagePreview,
      unread: contactsTable.unread,
      messageCount: sql<number>`(
        select count(*) from ${whatsappMessagesTable}
        where ${whatsappMessagesTable.contactJid} = ${contactsTable.jid}
      )::int`,
    })
    .from(contactsTable)
    .orderBy(desc(contactsTable.lastMessageAt));

  res.json(
    ListContactsResponse.parse(
      rows.map((r) => ({
        jid: r.jid,
        name: r.name,
        lastMessageAt: r.lastMessageAt ? r.lastMessageAt.toISOString() : null,
        lastMessagePreview: r.lastMessagePreview,
        unread: r.unread,
        messageCount: r.messageCount,
      })),
    ),
  );
});

router.get("/contacts/:jid/messages", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.jid) ? req.params.jid[0] : req.params.jid;
  if (typeof raw !== "string") {
    res.status(400).json({ error: "Invalid jid" });
    return;
  }
  const jid = decodeURIComponent(raw);
  await markContactRead(jid);
  const rows = await db
    .select()
    .from(whatsappMessagesTable)
    .where(eq(whatsappMessagesTable.contactJid, jid))
    .orderBy(whatsappMessagesTable.createdAt);

  res.json(
    ListContactMessagesResponse.parse(
      rows.map((m) => ({
        id: m.id,
        contactJid: m.contactJid,
        fromMe: m.fromMe,
        isAi: m.isAi,
        kind: m.kind,
        text: m.text,
        audioUrl: m.audioUrl,
        durationSeconds: m.durationSeconds,
        createdAt: m.createdAt.toISOString(),
      })),
    ),
  );
});

router.post("/contacts/:jid/messages", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.jid) ? req.params.jid[0] : req.params.jid;
  if (typeof raw !== "string") {
    res.status(400).json({ error: "Invalid jid" });
    return;
  }
  const jid = decodeURIComponent(raw);
  const parsed = SendContactMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (!parsed.data.text.trim()) {
    res.status(400).json({ error: "Mensagem vazia" });
    return;
  }

  try {
    await sendOwnerText(jid, parsed.data.text);
  } catch (err) {
    req.log.error({ err }, "send message failed");
    res.status(400).json({ error: (err as Error).message });
    return;
  }

  const [row] = await db
    .select()
    .from(whatsappMessagesTable)
    .where(eq(whatsappMessagesTable.contactJid, jid))
    .orderBy(desc(whatsappMessagesTable.createdAt))
    .limit(1);

  res.status(201).json(
    ListContactMessagesResponseItem.parse({
      id: row.id,
      contactJid: row.contactJid,
      fromMe: row.fromMe,
      isAi: row.isAi,
      kind: row.kind,
      text: row.text,
      audioUrl: row.audioUrl,
      durationSeconds: row.durationSeconds,
      createdAt: row.createdAt.toISOString(),
    }),
  );
});

export default router;
