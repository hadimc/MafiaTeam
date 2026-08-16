import type { Metadata, Viewport } from "next";
import { Cinzel, Geist, Vazirmatn } from "next/font/google";
import { LangProvider } from "@/lib/lang";
import { AppShell } from "@/components/AppShell";
import { getSessionUser } from "@/lib/auth";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const vazir = Vazirmatn({
  variable: "--font-vazir",
  subsets: ["arabic", "latin"],
});

export const metadata: Metadata = {
  title: "MafiaTeam",
  description: "Organize, deal, and narrate in-person Mafia nights",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0908",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getSessionUser();
  return (
    <html
      lang="en"
      dir="ltr"
      className={`${geist.variable} ${cinzel.variable} ${vazir.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <LangProvider>
          <AppShell user={user}>{children}</AppShell>
        </LangProvider>
      </body>
    </html>
  );
}
