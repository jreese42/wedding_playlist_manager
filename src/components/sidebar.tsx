import Link from "next/link";
import { Home, Music, Settings, LogOut, LogIn, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";
import { checkIfAdmin } from "@/lib/auth/helpers";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export async function Sidebar({ className }: SidebarProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAdmin = await checkIfAdmin();

  // Fetch playlists from database only if authenticated
  let playlists: any[] = []
  if (user) {
    const { data } = await supabase
        .from('playlists')
        .select('id, title')
        .order('display_order', { ascending: true });
    playlists = data || []
  }

  return (
    <div className={cn("pb-12 h-full w-64 border-r bg-zinc-950 text-white hidden md:block", className)} data-tour="navigation">
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

        {/* Dynamic Playlists Section */}
        {user && (
        <div className="px-3 py-2">
          <div className="flex items-center justify-between mb-2">
            <h2 className="px-4 text-lg font-semibold tracking-tight">
              Playlists
            </h2>
            <Link href="/playlists">
              <button className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors text-zinc-400 hover:text-white" title="Manage playlists">
                <Edit2 className="h-4 w-4" />
              </button>
            </Link>
          </div>
          <div className="space-y-1">
            {(!playlists || playlists.length === 0) ? (
              <p className="px-4 py-2 text-xs text-zinc-500">No playlists yet. Click the edit button to add one.</p>
            ) : (
              playlists.map((playlist: any) => (
                <Link key={playlist.id} href={`/playlist/${playlist.id}`}>
                  <button className="w-full justify-start flex items-center gap-2 px-4 py-2 hover:bg-zinc-800 rounded-md transition-colors text-sm font-medium">
                    <Music className="h-4 w-4" />
                    {playlist.title}
                  </button>
                </Link>
              ))
            )}
          </div>
        </div>
        )}
        
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

        {user && (
          <div className="px-3 py-2">
            <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
              Account
            </h2>
            <div className="space-y-1">
              <Link href="/settings">
                <button className="w-full justify-start flex items-center gap-2 px-4 py-2 hover:bg-zinc-800 rounded-md transition-colors text-sm font-medium">
                  <Settings className="h-4 w-4" />
                  Profile
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
