import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { AgentsProvider } from "@/context/AgentsContext";
import { ActionItemsProvider } from "@/context/ActionItemsContext";
import { ApprovalBanner } from "@/components/ApprovalBanner";
import { ModalHost } from "@/components/ModalHost";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Shinko1 — Agent Dashboard",
  description: "Shinko1 Solution Development Lifecycle Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-white text-zinc-900 antialiased font-[family-name:var(--font-inter)]">
        <ActionItemsProvider>
        <AgentsProvider>
          <Topbar />
          <Sidebar />
          <main className="ml-[216px] mt-[52px] min-h-[calc(100vh-52px)] px-8 py-7">
            {children}
          </main>
          <ApprovalBanner />
          <ModalHost />
        </AgentsProvider>
        </ActionItemsProvider>
      </body>
    </html>
  );
}
