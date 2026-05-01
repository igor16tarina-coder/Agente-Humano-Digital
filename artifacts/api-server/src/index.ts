import app from "./app";
import { logger } from "./lib/logger";
import { bootstrap } from "./lib/whatsapp/server";

const port = process.env.PORT || 8080;

app.listen(port, async (err: any) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  try {
    await bootstrap();
  } catch (e) {
    logger.error({ err: e }, "WhatsApp bootstrap failed");
  }
});
