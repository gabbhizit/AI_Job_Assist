import type { Metadata } from "next";
import "./globals.css";
import { Geist, DM_Sans } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' });

export const metadata: Metadata = {
  title: "OfferPath — AI Job Copilot for International Students",
  description: "AI-powered job matching for CS students on F1/OPT visas. Daily personalized matches, visa sponsorship filters, and automated applications.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable, dmSans.variable)}>
      <body>{children}</body>
    </html>
  );
}
