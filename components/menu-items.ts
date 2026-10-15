import {
  Compass,
  Home,
  LineChart,
  PiggyBank,
  Rocket,
  Settings,
  Trophy,
  User,
  Wallet,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  /** Static route. Use "dynamic:profile" for the wallet-resolved profile link. */
  href: string;
  icon: LucideIcon;
}

/**
 * SINGLE SOURCE of drawer navigation. To add a future page, append one entry
 * here — the drawer, tests, and sitemap pick it up automatically.
 * NOTE: /admin is deliberately excluded (restricted; never advertised in nav).
 */
export const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Explore Tokens", href: "/explore", icon: Compass },
  { label: "Launch Token", href: "/launch", icon: Rocket },
  { label: "Spot Trading", href: "/explore", icon: LineChart },
  { label: "Perpetual Futures", href: "/perps", icon: Zap },
  { label: "Stake $LEV", href: "/stake", icon: PiggyBank },
  { label: "Portfolio", href: "/portfolio", icon: Wallet },
  { label: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { label: "Creator Dashboard", href: "/creator", icon: Wrench },
  { label: "My Profile", href: "dynamic:profile", icon: User },
  { label: "Settings", href: "/settings", icon: Settings },
];

/** Every static route the drawer may link to (profile resolves at runtime). */
export const KNOWN_ROUTES = [
  "/",
  "/explore",
  "/launch",
  "/perps",
  "/stake",
  "/portfolio",
  "/leaderboard",
  "/creator",
  "/settings",
];
