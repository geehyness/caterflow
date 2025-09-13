// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log(`\n--- Middleware Start ---`);
  console.log(`[Middleware] Current Pathname: ${pathname}`);

  const authToken = request.cookies.get('auth_token')?.value;
  const userRole = request.cookies.get('user_role')?.value;

  console.log(`[Middleware] Auth Token: ${authToken ? 'Present' : 'Not Present'}`);
  console.log(`[Middleware] User Role: ${userRole || 'N/A'}`);

  // Define protected routes and their required roles for Caterflow
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
    '/operations/adjustments': ['admin', 'siteManager', 'stockController', 'auditor'],
    '/operations/counts': ['admin', 'siteManager', 'stockController', 'auditor'],
    '/admin': ['admin'],
    '/profile': ['admin', 'siteManager', 'stockController', 'dispatchStaff', 'auditor'],
  };

  // Check if the current path is a protected route
  let isProtectedRoute = false;
  console.log(`[Middleware] Checking if ${pathname} is a protected route...`);

  for (const routePrefix in protectedRoutes) {
    if (pathname.startsWith(routePrefix)) {
      isProtectedRoute = true;
      console.log(`[Middleware] MATCH: Pathname "${pathname}" starts with protected route prefix "${routePrefix}".`);
      break;
    } else {
      console.log(`[Middleware] NO MATCH: Pathname "${pathname}" does NOT start with "${routePrefix}".`);
    }
  }

  console.log(`[Middleware] Final isProtectedRoute status: ${isProtectedRoute}`);

  // If accessing the login page, allow it
  if (pathname === '/login') {
    console.log('[Middleware] Allowing access to /login page.');
    console.log(`--- Middleware End ---\n`);
    return NextResponse.next();
  }

  // If accessing a protected route without an auth token, redirect to login
  if (isProtectedRoute && !authToken) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    // Only set redirect param if we're not already going to login and it's not the dashboard
    if (pathname !== '/') {
      url.searchParams.set('redirect', pathname);
    }
    console.log(`[Middleware] ACTION: Redirecting to login from ${pathname} (no auth token).`);
    console.log(`--- Middleware End ---\n`);
    return NextResponse.redirect(url);
  }

  // If there's an auth token, validate role for protected routes
  if (isProtectedRoute && authToken) {
    const matchedRoutePrefix = Object.keys(protectedRoutes).find(route => pathname.startsWith(route));
    const requiredRoles = matchedRoutePrefix ? protectedRoutes[matchedRoutePrefix as keyof typeof protectedRoutes] : [];

    console.log(`[Middleware] Required Roles for ${pathname}: ${requiredRoles.join(', ')}`);
    if (requiredRoles.length > 0 && (!userRole || !requiredRoles.includes(userRole))) {
      const url = request.nextUrl.clone();
      url.pathname = '/unauthorized';
      console.log(`[Middleware] ACTION: Redirecting to unauthorized from ${pathname} (insufficient role: ${userRole}).`);
      console.log(`--- Middleware End ---\n`);
      return NextResponse.redirect(url);
    }
  }

  console.log(`[Middleware] Allowing access to ${pathname}.`);
  console.log(`--- Middleware End ---\n`);
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/actions',
    '/approvals',
    '/activity',
    '/low-stock',
    '/inventory/:path*',
    '/operations/:path*',
    '/admin/:path*',
    '/profile',
  ],
};