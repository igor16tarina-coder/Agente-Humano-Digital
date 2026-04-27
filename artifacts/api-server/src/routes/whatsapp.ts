import { Router, type IRouter } from "express";
import { GetWhatsappStateResponse } from "@workspace/api-zod";
import {
  getState,
  startWhatsApp,
  stopWhatsApp,
} from "../lib/whatsapp/service";

const router: IRouter = Router();

function serialize(state: ReturnType<typeof getState>) {
  return {
    status: state.status,
    qrCode: state.qrCode,
    phoneNumber: state.phoneNumber,
    connectedAt: state.connectedAt ? state.connectedAt.toISOString() : null,
  };
}

router.get("/whatsapp/state", async (_req, res): Promise<void> => {
  res.json(GetWhatsappStateResponse.parse(serialize(getState())));
});

router.post("/whatsapp/connect", async (_req, res): Promise<void> => {
  const state = await startWhatsApp();
  res.json(GetWhatsappStateResponse.parse(serialize(state)));
});

router.post("/whatsapp/disconnect", async (_req, res): Promise<void> => {
  const state = await stopWhatsApp(true);
  res.json(GetWhatsappStateResponse.parse(serialize(state)));
});

export default router;
