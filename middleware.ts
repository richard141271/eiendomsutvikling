import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

async function reportDebugEvent(hypothesisId: "A" | "B" | "C" | "D" | "E", location: string, msg: string, data: Record<string, unknown>) {
  // #region debug-point A:middleware-report
  if (process.env.TRAE_DEBUG !== "1") {
    return
  }
  try {
    const debugUrl = process.env.TRAE_DEBUG_URL || "http://127.0.0.1:7777/event"
    const sessionId = process.env.TRAE_DEBUG_SESSION || "app-speed-lag"
    await fetch(debugUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, runId: "pre-fix", hypothesisId, location, msg, data, ts: Date.now() }),
      cache: "no-store",
    }).catch(() => undefined)
  } catch {}
  // #endregion
}

export async function middleware(request: NextRequest) {
  const startedAt = Date.now()
  const pathname = request.nextUrl.pathname

  const cookieNames = request.cookies.getAll().map((c) => c.name)
  const hasSupabaseCookie = cookieNames.some((name) => name.startsWith("sb-") || name.includes("supabase"))

  if (!hasSupabaseCookie) {
    // #region debug-point A:middleware-skip-no-cookie
    await reportDebugEvent("A", "middleware.ts:skip", "[DEBUG] Middleware skipped (no supabase cookies)", {
      pathname,
      totalDurationMs: Date.now() - startedAt,
    })
    // #endregion
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    })
  }

  const shouldRefreshSession =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/projects") ||
    pathname.startsWith("/tasks") ||
    pathname.startsWith("/rydderen")

  if (!shouldRefreshSession) {
    // #region debug-point A:middleware-skip-path
    await reportDebugEvent("A", "middleware.ts:skip", "[DEBUG] Middleware skipped (path not in refresh list)", {
      pathname,
      totalDurationMs: Date.now() - startedAt,
    })
    // #endregion
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    })
  }

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

  // #region debug-point A:middleware-start
  await reportDebugEvent("A", "middleware.ts:start", "[DEBUG] Middleware start", {
    pathname: request.nextUrl.pathname,
  })
  // #endregion

  const authStartedAt = Date.now()
  const { data: { user } } = await supabase.auth.getUser()

  // #region debug-point A:middleware-auth-finished
  await reportDebugEvent("A", "middleware.ts:auth:getUser", "[DEBUG] Middleware auth resolved", {
    pathname,
    durationMs: Date.now() - authStartedAt,
    hasUser: Boolean(user),
    totalDurationMs: Date.now() - startedAt,
  })
  // #endregion

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
    '/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
