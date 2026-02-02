import { type NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for auth routes, API, and static files
  if (
    pathname.startsWith('/auth/signin') ||
    pathname.startsWith('/auth/complete-profile') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }

  // Get the auth token from cookies
  const authToken = request.cookies.get('sb-access-token')?.value

  // If not logged in, allow (pages will redirect to login if needed)
  if (!authToken) {
    return NextResponse.next()
  }

  // User is logged in, allow through
  // The complete-profile page will handle the redirect on the server side
  // where we have access to the database
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
  runtime: 'nodejs',
}
