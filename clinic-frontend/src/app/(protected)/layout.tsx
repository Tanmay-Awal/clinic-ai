'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

const PUBLIC_ROUTES = ['/', '/login', '/forgot-password', '/reset-password'];

const isPublicRoute = (pathname: string) =>
  PUBLIC_ROUTES.some(route =>
    route === '/' ? pathname === '/' : pathname.startsWith(route)
  );

const readStoredAuthToken = () => {
  try {
    const raw = window.localStorage.getItem('auth-storage');
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return !!parsed?.state?.token;
  } catch {
    return false;
  }
};

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, token } = useAuthStore();

  // Track hydration so server and first client render match — avoids hydration errors
  // when localStorage is only readable on the client.
  const [hasMounted, setHasMounted] = useState(false);
  const [hasStoredAuthToken, setHasStoredAuthToken] = useState(false);

  useEffect(() => {
    setHasStoredAuthToken(readStoredAuthToken());
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;
    if (isPublicRoute(pathname)) return;

    if (!isAuthenticated || !token) {
      if (hasStoredAuthToken) return;
      const returnUrl = encodeURIComponent(pathname);
      router.push(`/login?returnUrl=${returnUrl}`);
    }
  }, [hasMounted, isAuthenticated, token, pathname, router, hasStoredAuthToken]);

  if (
    hasMounted &&
    (!isAuthenticated || !token) &&
    !isPublicRoute(pathname) &&
    !hasStoredAuthToken
  ) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
