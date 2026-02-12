import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

interface PlaylistCardProps {
  slug: string;
  title: string;
  description: string | null;
  gradientClasses: string;
}

export function PlaylistCard({ slug, title, description, gradientClasses }: PlaylistCardProps) {
  return (
    <div 
      className={`relative group rounded-2xl p-px bg-gradient-to-br ${gradientClasses} hover:scale-105 transition-transform duration-300`}
    >
      <Link
        href={`/playlist/${slug}`}
        className="relative block h-full p-8 overflow-hidden rounded-[15px] bg-black/80 backdrop-blur-lg"
      >
        <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
        <p className="text-sm text-zinc-400 mb-4">{description}</p>
        
        <div className="flex items-center text-xs font-semibold text-zinc-300 group-hover:text-white transition-colors">
          View Playlist
          <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
        </div>
      </Link>
    </div>
  );
}
