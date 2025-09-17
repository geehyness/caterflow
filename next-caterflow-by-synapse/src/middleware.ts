import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  async function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    console.log(`\n--- NextAuth Middleware Start ---`);
    console.log(`[Middleware] Current Pathname: ${pathname}`);
    console.log(`[Middleware] Token: ${token ? 'Present' : 'Not Present'}`);

    const protectedRoutes = {
      '/': ['admin', 'siteManager', 'stockController', 'dispatchStaff', 'auditor'],
      '/actions': ['admin', 'siteManager', 'stockController', 'dispatchStaff'],
      '/approvals': ['admin', 'siteManager'],
      '/activity': ['admin', 'siteManager', 'stockController', 'auditor'],
      '/low-stock': ['admin', 'siteManager', 'stockController', 'auditor'],
      '/inventory': ['admin', 'siteManager', 'stockController', 'auditor'],
      '/operations/purchases': ['admin', 'siteManager', 'auditor'],
      '/operations/receipts': ['admin', 'siteManager', 'auditor'],
      '/operations/dispatches': ['admin', 'dispatchStaff', 'auditor'],
      '/operations/transfers': ['admin', 'siteManager', 'dispatchStaff', 'auditor'],
      '/operations/counts': ['admin', 'siteManager', 'stockController', 'auditor'],
      '/operations/adjustments': ['admin', 'siteManager', 'stockController', 'auditor'],
      '/reporting': ['admin', 'auditor'],
      '/admin': ['admin'],
    };

    const isProtectedRoute = Object.keys(protectedRoutes).some(
      (route) => pathname === route || pathname.startsWith(route + '/')
    );

    if (isProtectedRoute) {
      if (!token) {
        const url = new URL('/login', req.url);
        url.searchParams.set('redirect', pathname);
        console.log(`[Middleware] ACTION: Redirecting to login from ${pathname} (no token).`);
        return NextResponse.redirect(url);
      }

      const userRole = (token as any)?.role;
      const requiredRoles = Object.keys(protectedRoutes).find(route => pathname.startsWith(route))
        ? protectedRoutes[Object.keys(protectedRoutes).find(route => pathname.startsWith(route)) as keyof typeof protectedRoutes]
        : [];

      if (requiredRoles.length > 0 && (!userRole || !requiredRoles.includes(userRole))) {
        const url = new URL('/unauthorized', req.url);
        console.log(`[Middleware] ACTION: Redirecting to unauthorized from ${pathname} (insufficient role: ${userRole}).`);
        return NextResponse.redirect(url);
      }
    }

    console.log(`[Middleware] Allowing access to ${pathname}.`);
    console.log(`--- NextAuth Middleware End ---\n`);

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  }
);

export const config = {
  matcher: [
    '/',
    '/actions',
    '/approvals',
    '/activity',
    '/low-stock',
    '/inventory',
    '/operations/:path*',
    '/reporting',
    '/admin',
    // Removed '/login' from here
  ],
};