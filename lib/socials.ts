/**
 * Official social accounts. Defaults are Levium's real profiles (provided by
 * the team); both are overridable via environment without a code change.
 */
export const X_URL = process.env.NEXT_PUBLIC_X_URL || "https://x.com/Leviumdotworld";
export const TELEGRAM_URL =
  process.env.NEXT_PUBLIC_TELEGRAM_URL || "https://t.me/Leviumdotworld";

export function isExternalHttp(url: string): boolean {
  return /^https:\/\//.test(url);
}
