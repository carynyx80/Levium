"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, darkTheme, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, http } from "wagmi";
import { useState } from "react";
import { robinhoodChain, ROBINHOOD_RPC_URL } from "@/lib/chain";

const config = getDefaultConfig({
  appName: "LEVIUM",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "levium-dev",
  chains: [robinhoodChain as never],
  transports: { [robinhoodChain.id]: http(ROBINHOOD_RPC_URL) } as never,
  ssr: true,
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({ accentColor: "#A66BFF", accentColorForeground: "#100A1E" })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
