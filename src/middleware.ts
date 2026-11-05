import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth({
  pages: {
    signIn: '/login',
  },
})

export const config = {
  matcher: ['/dashboard/:path*', '/attendance/:path*', '/guards/:path*', '/duty-points/:path*', '/reports/:path*', '/settings/:path*', '/daily-assignments/:path*'],
}
