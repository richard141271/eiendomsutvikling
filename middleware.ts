import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Custom Session Duration Logic
  if (user) {
    const role = user.user_metadata?.role;
    let maxAgeSeconds = 3600; // Default 1 hour

    if (role === 'OWNER' || role === 'ADMIN') {
      maxAgeSeconds = 7200; // 2 hours
    } else if (role === 'TENANT') {
      maxAgeSeconds = 900; // 15 minutes
    }

    // Extend session cookie lifetime on every request (Sliding Expiration)
    const cookiesList = request.cookies.getAll();
    
    cookiesList.forEach(cookie => {
      // Target Supabase Auth cookies
      if (cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token')) {
        response.cookies.set({
          name: cookie.name,
          value: cookie.value,
          maxAge: maxAgeSeconds,
          path: '/',
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          httpOnly: false // Allow client-side access for hydration
        });
      }
    });
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
     * - api/ (API routes - optional, usually we want auth there too, but maybe not refresh logic on every API call? Keeping it for safety)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
