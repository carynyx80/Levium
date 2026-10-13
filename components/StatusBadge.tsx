import { cn } from "@/lib/utils";
import type { PerpsStatus } from "@/lib/store";

const STYLE: Record<PerpsStatus | "SPOT_LIVE", string> = {
  SPOT_LIVE: "bg-tradegreen/15 text-tradegreen border-tradegreen/30",
  PERPS_PENDING: "bg-gold/10 text-gold border-gold/30",
  PERPS_LIVE: "bg-emeraldbrand/20 text-tradegreen border-tradegreen/30",
  PERPS_PAUSED: "bg-tradered/10 text-tradered border-tradered/30",
};

const LABEL: Record<PerpsStatus | "SPOT_LIVE", string> = {
  SPOT_LIVE: "SPOT LIVE",
  PERPS_PENDING: "PERPS PENDING",
  PERPS_LIVE: "PERPS LIVE",
  PERPS_PAUSED: "PERPS PAUSED",
};

export function StatusBadge({ status }: { status: PerpsStatus | "SPOT_LIVE" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wide",
        STYLE[status],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {LABEL[status]}
    </span>
  );
}
