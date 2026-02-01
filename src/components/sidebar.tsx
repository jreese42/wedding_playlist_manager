import Link from "next/link";
import { Home, Music, Settings, ListMusic, LogOut, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";
import { checkIfAdmin } from "@/lib/auth/helpers";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export async function Sidebar({ className }: SidebarProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAdmin = await checkIfAdmin();

  return (
    <div className={cn("pb-12 min-h-screen w-64 border-r bg-zinc-950 text-white hidden md:block", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Wedding Music
          </h2>
          <div className="space-y-1">
             <Link href="/">
                <button className="w-full justify-start flex items-center gap-2 px-4 py-2 hover:bg-zinc-800 rounded-md transition-colors text-sm font-medium">
                    <Home className="h-4 w-4" />
                    Home
                </button>
             </Link>
          </div>
        </div>
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Playlists
          </h2>
          <div className="space-y-1">
            <Link href="/playlist/morning">
                <button className="w-full justify-start flex items-center gap-2 px-4 py-2 hover:bg-zinc-800 rounded-md transition-colors text-sm font-medium">
                    <Music className="h-4 w-4" />
                    Morning Prep
                </button>
            </Link>
            <Link href="/playlist/brunch">
                <button className="w-full justify-start flex items-center gap-2 px-4 py-2 hover:bg-zinc-800 rounded-md transition-colors text-sm font-medium">
                    <Music className="h-4 w-4" />
                    Brunch
                </button>
            </Link>
             <Link href="/playlist/ceremony">
                <button className="w-full justify-start flex items-center gap-2 px-4 py-2 hover:bg-zinc-800 rounded-md transition-colors text-sm font-medium">
                    <Music className="h-4 w-4" />
                    Ceremony
                </button>
            </Link>
            <Link href="/playlist/boat">
                 <button className="w-full justify-start flex items-center gap-2 px-4 py-2 hover:bg-zinc-800 rounded-md transition-colors text-sm font-medium">
                    <Music className="h-4 w-4" />
                    Boat Party
                </button>
            </Link>
            <Link href="/playlist/reception">
                 <button className="w-full justify-start flex items-center gap-2 px-4 py-2 hover:bg-zinc-800 rounded-md transition-colors text-sm font-medium">
                    <Music className="h-4 w-4" />
                    Reception
                </button>
            </Link>
             <Link href="/playlist/moments">
                 <button className="w-full justify-start flex items-center gap-2 px-4 py-2 hover:bg-zinc-800 rounded-md transition-colors text-sm font-medium">
                    <Music className="h-4 w-4" />
                    Specific Moments
                </button>
            </Link>
          </div>
        </div>
        
        {isAdmin && (
         <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Admin
          </h2>
          <div className="space-y-1">
             <Link href="/admin">
                <button className="w-full justify-start flex items-center gap-2 px-4 py-2 hover:bg-zinc-800 rounded-md transition-colors text-sm font-medium">
                    <Settings className="h-4 w-4" />
                    Settings
                </button>
             </Link>
          </div>
        </div>
        )}

        <div className="px-3 py-2 mt-auto">
            <div className="space-y-1">
                {user ? (
                    <form action={logout}>
                        <button className="w-full justify-start flex items-center gap-2 px-4 py-2 hover:bg-zinc-800 rounded-md transition-colors text-sm font-medium text-red-400">
                            <LogOut className="h-4 w-4" />
                            Sign Out
                        </button>
                    </form>
                ) : (
                    <Link href="/login">
                        <button className="w-full justify-start flex items-center gap-2 px-4 py-2 hover:bg-zinc-800 rounded-md transition-colors text-sm font-medium">
                            <LogIn className="h-4 w-4" />
                            Sign In
                        </button>
                    </Link>
                )}
            </div>
        </div>

      </div>
    </div>
  );
}
