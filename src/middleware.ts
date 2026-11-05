import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAuth = !!token
    const isAuthPage = req.nextUrl.pathname.startsWith('/login')

    if (isAuthPage) {
      if (isAuth) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
      return null
    }

    if (!isAuth) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    return null
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // Allow access if token exists
        return !!token
      },
    },
    pages: {
      signIn: '/login',
    },
  }
)

export const config = {
  matcher: ['/dashboard/:path*', '/attendance/:path*', '/guards/:path*', '/duty-points/:path*', '/reports/:path*', '/settings/:path*'],
}
