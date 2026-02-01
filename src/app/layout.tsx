import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/sidebar";
import { TourProvider } from "@/lib/tour-context";
import { TourOverlay } from "@/components/tour/tour-overlay";
import { TourTrigger } from "@/components/tour/tour-trigger";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Dana's Wedding Playlist",
  description: "Collaborative wedding playlist planner",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(
          "min-h-screen bg-background font-sans antialiased flex",
          inter.variable
        )}>
        <TourProvider>
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <TourTrigger />
            <TourOverlay />
            {children}
          </main>
        </TourProvider>
      </body>
    </html>
  );
}
