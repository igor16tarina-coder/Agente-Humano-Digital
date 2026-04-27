import { db, whatsappAuthTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  initAuthCreds,
  BufferJSON,
  proto,
  type AuthenticationCreds,
  type AuthenticationState,
  type SignalDataTypeMap,
} from "@whiskeysockets/baileys";

async function readKey(key: string): Promise<unknown | null> {
  const rows = await db
    .select()
    .from(whatsappAuthTable)
    .where(eq(whatsappAuthTable.key, key));
  if (!rows[0]) return null;
  return JSON.parse(rows[0].value, BufferJSON.reviver);
}

async function writeKey(key: string, value: unknown): Promise<void> {
  const json = JSON.stringify(value, BufferJSON.replacer);
  await db
    .insert(whatsappAuthTable)
    .values({ key, value: json, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: whatsappAuthTable.key,
      set: { value: json, updatedAt: new Date() },
    });
}

async function deleteKey(key: string): Promise<void> {
  await db.delete(whatsappAuthTable).where(eq(whatsappAuthTable.key, key));
}

export async function clearAuthState(): Promise<void> {
  await db.delete(whatsappAuthTable);
}

export async function useDbAuthState(): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
}> {
  let creds = (await readKey("creds")) as AuthenticationCreds | null;
  if (!creds) {
    creds = initAuthCreds();
    await writeKey("creds", creds);
  }

  const keys = {
    get: async <T extends keyof SignalDataTypeMap>(
      type: T,
      ids: string[],
    ): Promise<{ [id: string]: SignalDataTypeMap[T] }> => {
      const result: { [id: string]: SignalDataTypeMap[T] } = {};
      await Promise.all(
        ids.map(async (id) => {
          const value = await readKey(`${type}-${id}`);
          if (value) {
            if (type === "app-state-sync-key") {
              result[id] = proto.Message.AppStateSyncKeyData.fromObject(
                value as object,
              ) as SignalDataTypeMap[T];
            } else {
              result[id] = value as SignalDataTypeMap[T];
            }
          }
        }),
      );
      return result;
    },
    set: async (data: {
      [category in keyof SignalDataTypeMap]?: {
        [id: string]: SignalDataTypeMap[category] | null;
      };
    }): Promise<void> => {
      const tasks: Promise<void>[] = [];
      for (const category of Object.keys(data) as (keyof SignalDataTypeMap)[]) {
        const map = data[category];
        if (!map) continue;
        for (const id of Object.keys(map)) {
          const value = map[id];
          const key = `${category}-${id}`;
          if (value) tasks.push(writeKey(key, value));
          else tasks.push(deleteKey(key));
        }
      }
      await Promise.all(tasks);
    },
  };

  return {
    state: { creds: creds!, keys },
    saveCreds: async () => {
      await writeKey("creds", creds!);
    },
  };
}
