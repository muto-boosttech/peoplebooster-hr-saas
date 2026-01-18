import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes that don't require authentication
const publicRoutes = [
  '/login',
  '/admin/login',
  '/password-reset',
  '/survey',
];

// Admin-only routes (SYSTEM_ADMIN)
const adminRoutes = [
  '/dashboard/companies',
  '/dashboard/admin',
];

// Company admin routes (COMPANY_ADMIN or higher)
const companyAdminRoutes = [
  '/dashboard/users',
  '/dashboard/billing',
  '/dashboard/reports',
];

// Check if path matches any route pattern
function matchesRoute(path: string, routes: string[]): boolean {
  return routes.some((route) => {
    if (route.endsWith('*')) {
      return path.startsWith(route.slice(0, -1));
    }
    return path === route || path.startsWith(route + '/');
  });
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  // Authentication is handled client-side using localStorage
  // Role-based access control is also handled client-side
  // since we need to decode the JWT to get the role

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
