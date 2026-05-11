import { cookies } from "next/headers";
import type { Lang } from "./i18n";

/** Read the current language from the cookie (server components). */
export async function getLang(): Promise<Lang> {
  const jar = await cookies();
  const val = jar.get("app-lang")?.value;
  return val === "en" ? "en" : "fr";
}
