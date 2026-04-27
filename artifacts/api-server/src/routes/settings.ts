import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  GetSettingsResponse,
  UpdateSettingsBody,
} from "@workspace/api-zod";
import { ensureSettings } from "../lib/whatsapp/service";

const router: IRouter = Router();

router.get("/settings", async (_req, res): Promise<void> => {
  const row = await ensureSettings();
  res.json(GetSettingsResponse.parse(row));
});

router.patch("/settings", async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const current = await ensureSettings();
  const update: Record<string, unknown> = { updatedAt: new Date() };
  for (const k of Object.keys(parsed.data) as (keyof typeof parsed.data)[]) {
    const v = parsed.data[k];
    if (v !== undefined) update[k] = v;
  }
  const [row] = await db
    .update(settingsTable)
    .set(update)
    .where(eq(settingsTable.id, current.id))
    .returning();
  res.json(GetSettingsResponse.parse(row));
});

export default router;
