import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/sidebar";
import { MobileNavButton, MobileSidebarWrapper } from "@/components/mobile-nav";
import { MobileMenuProvider } from "@/lib/mobile-menu-context";
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
          "min-h-screen bg-zinc-950 font-sans antialiased",
          inter.variable
        )}>
        <MobileMenuProvider>
          <TourProvider>
            <div className="flex flex-col md:flex-row min-h-screen">
              {/* Mobile menu button and sidebar overlay */}
              <MobileNavButton />
              <MobileSidebarWrapper />
              
              {/* Desktop sidebar */}
              <Sidebar className="hidden md:block" />
              
              {/* Main content */}
              <main className="flex-1 overflow-y-auto">
                <TourTrigger />
                <TourOverlay />
                {children}
              </main>
            </div>
          </TourProvider>
        </MobileMenuProvider>
      </body>
    </html>
  );
}
