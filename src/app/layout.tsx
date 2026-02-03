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
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { DemoBanner } from "@/components/demo-banner";
import { manageDemoState } from "@/lib/demo-service";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

async function getAppTitle() {
  try {
    const adminSupabase = await createAdminClient()
    const { data: settings } = await adminSupabase
      .from('app_settings' as any)
      .select('key, value')
      .eq('key', 'page_title')
      .single()
    
    return (settings as any)?.value || 'Playlist Manager'
  } catch (error) {
    return 'Playlist Manager'
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const title = await getAppTitle()
  
  return {
    title,
    description: "Collaborative playlist curator",
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies()
  const isDemo = cookieStore.get('site_mode')?.value === 'demo'

  if (isDemo) {
    // Check inactivity and reset if needed
    await manageDemoState()
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(
          "min-h-screen bg-zinc-950 font-sans antialiased",
          inter.variable
        )}>
        <MobileMenuProvider>
          <TourProvider>
            <div className="flex flex-col md:flex-row h-screen overflow-hidden">
              {/* Mobile menu button and sidebar overlay */}
              <MobileNavButton />
              <MobileSidebarWrapper />
              
              {/* Desktop sidebar */}
              <Sidebar className="hidden md:block overflow-y-auto" />
              
              {/* Main content */}
              <main className="flex-1 overflow-y-auto">
                {isDemo && <DemoBanner />}
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
