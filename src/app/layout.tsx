import type { Metadata, Viewport } from "next";
import { Cinzel, Vazirmatn } from "next/font/google";
import { LangProvider } from "@/lib/lang";
import { PhoneShell } from "@/components/PhoneShell";
import { getSessionUser } from "@/lib/auth";
import "./globals.css";

const vazir = Vazirmatn({
  variable: "--font-vazir",
  subsets: ["arabic", "latin"],
});

const cinzel = Cinzel({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "700"],
});

export const metadata: Metadata = {
  title: "MafiaTeam",
  description: "Organize, deal, and narrate in-person Mafia nights",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b090c",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getSessionUser();
  return (
    <html lang="fa" dir="rtl" className={`${vazir.variable} ${cinzel.variable} h-full antialiased`}>
      <body className="min-h-full">
        <LangProvider>
          <PhoneShell user={user}>{children}</PhoneShell>
        </LangProvider>
      </body>
    </html>
  );
}
