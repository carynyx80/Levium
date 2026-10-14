import { TELEGRAM_URL, X_URL, isExternalHttp } from "@/lib/socials";
import { cn } from "@/lib/utils";

/** Official X mark (Simple Icons, CC0). */
function XMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644z" />
    </svg>
  );
}

/** Official Telegram glyph (Simple Icons, CC0). */
function TelegramMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

const linkCls =
  "inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-forest-700 text-sage transition hover:border-gold hover:text-gold";

/** Clickable X + Telegram icons. External, new tab, hardened rel. */
export function SocialIcons({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {isExternalHttp(X_URL) && (
        <a href={X_URL} target="_blank" rel="noopener noreferrer" aria-label="Levium on X" className={linkCls}>
          <XMark />
        </a>
      )}
      {isExternalHttp(TELEGRAM_URL) && (
        <a
          href={TELEGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Levium on Telegram"
          className={linkCls}
        >
          <TelegramMark />
        </a>
      )}
    </span>
  );
}
