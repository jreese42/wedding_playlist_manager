import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Routes that require authentication
const protectedPaths = ['/admin', '/playlist', '/playlists', '/settings', '/auth/complete-profile']
// Routes that are only for unauthenticated users
const authOnlyPaths = ['/login']

export async function middleware(request: NextRequest) {
  // Refresh session
  const { response, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  // Allow demo login without auth
  if (pathname === '/login/demo') {
    return response
  }

  // Redirect unauthenticated users away from protected routes
  const isProtected = protectedPaths.some(p => pathname.startsWith(p))
  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from login page
  const isAuthOnly = authOnlyPaths.some(p => pathname === p)
  if (isAuthOnly && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
