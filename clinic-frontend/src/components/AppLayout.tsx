'use client';
import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Phone,
  TrendingUp,
  ClipboardCheck,
  CheckSquare,
  Settings,
  User,
  PhoneOutgoing,
  MessageCircle,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NAVIGATION_ITEMS } from '@/config/navigation';
import { useAuthStore, isAdmin, getUserFullName } from '@/store/authStore';

interface AppLayoutProps {
  children: ReactNode;
}

// Filtering out profile for sidebar display if needed, or keep all
const appNavigation = NAVIGATION_ITEMS;

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();

  return (
    <div className="flex min-h-dvh w-full">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b border-border px-6">
            <img src="/logo.png" alt="CliniCall Logo" className="h-5 w-auto" />

          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {appNavigation.filter(item => {
              if (item.isAdminOnly && !isAdmin(user)) return false;
              if (item.requiresWhatsappToken && !user?.whatsapp_bot_enabled) return false;
              return true;
            }).map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="border-t border-border p-4">
            <div className="flex items-center gap-3 rounded-lg px-3 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                {user?.first_name ? user.first_name.charAt(0).toUpperCase() : user?.email.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{getUserFullName(user) || user?.email || 'User'}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.role || 'Member'}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <header className="flex h-16 items-center border-b border-border bg-card px-6">
          <div className="flex flex-1 items-center justify-between">
            <div className="flex items-center gap-4">
              <select className="h-9 rounded-lg border border-border bg-background px-3 text-sm">
                <option>All Sites</option>
                <option>Mayfair Location</option>
                <option>City Location</option>
                <option>Shoreditch Location</option>
              </select>
              <select className="h-9 rounded-lg border border-border bg-background px-3 text-sm">
                <option>Last 7 days</option>
                <option>Last 30 days</option>
                <option>Last 90 days</option>
                <option>Custom range</option>
              </select>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
