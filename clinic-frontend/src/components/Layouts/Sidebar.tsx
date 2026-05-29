'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Phone,
  TrendingUp,
  ClipboardCheck,
  CheckSquare,
  Settings,
  ChevronLeft,
  LogOut,
  User,
  PhoneOutgoing,
  ClipboardList,
  FileBarChart,
  Sparkles,
  MessageCircle
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { NAVIGATION_ITEMS } from '@/config/navigation';
import { useAuthStore, getUserFullName, hasActionsOnlyRole, isAdmin } from '@/store/authStore';
import { authApi } from '@/lib/api/auth';
import toast from 'react-hot-toast';

// Local navigation filters out Profile as it's handled in the bottom section
const sidebarNavigation = NAVIGATION_ITEMS.filter(item => !item.isProfile);

interface SidebarProps {
  isMobile?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isMobile = false, onClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const isActionsRole = hasActionsOnlyRole(user);

  const restrictedHrefs = ['/calls', '/insights', '/outbound', '/admin', '/reports'];

  const handleLogout = async () => {
    try {
      // Clear React Query cache before logout
      queryClient.clear();
      await authApi.logout();
      toast.success('Logged out successfully');
      router.push('/login');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  return (
    <aside
      className={cn(
        "border-r border-border bg-card transition-all duration-300 flex-shrink-0",
        "max-w-[100vw] overflow-x-hidden",
        isMobile ? "w-full border-none h-full bg-background" : (collapsed ? "w-[76px]" : "w-[260px]"),
        isMobile ? "flex" : "hidden md:flex"
      )}
    >

      <div
        className={cn(
          "flex flex-col w-full h-dvh overflow-hidden",
          !isMobile && "sticky top-0"
        )}
      >

        {/* Logo */}
        <div className={cn(
          "flex h-16 items-center border-b border-border overflow-hidden",
          (!collapsed || isMobile) ? "px-6" : "justify-center px-2"
        )}>
          <img
            src="/logo.png"
            alt="Convo Logo"
            className={cn(
              "object-contain object-left dark:invert-0 invert",
              (!collapsed || isMobile) ? "h-5 max-w-full" : "h-5 w-auto object-center"
            )}
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {sidebarNavigation.filter(item => {
            if (item.isAdminOnly && !isAdmin(user)) return false;
            if (item.requiresWhatsappToken && !user?.whatsapp_bot_enabled) return false;
            return true;
          }).map((item: any) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
            const isDisabled = isActionsRole && restrictedHrefs.includes(item.href);
            const isAi = item.isAi;

            return (
              <button
                key={item.name}
                onClick={() => {
                  if (isDisabled) return;
                  router.push(item.href);
                  if (isMobile && onClose) onClose();
                }}
                aria-disabled={isDisabled}
                tabIndex={isDisabled ? -1 : 0}
                className={cn(
                  'group relative flex h-11 w-full min-w-0 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors text-left overflow-hidden',
                  isDisabled
                    ? 'opacity-40 cursor-not-allowed'
                    : isActive
                      ? 'bg-accent text-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-accent/80 hover:text-foreground'
                )}
              >

                {isActive && (
                  <div className={cn(
                    "absolute left-0 h-full w-[3px] rounded-r",
                    isAi ? "bg-purple-500" : "bg-primary"
                  )} />
                )}

                <item.icon className={cn(
                  "h-5 w-5 shrink-0 transition-all duration-200 group-hover:scale-110",
                  isAi
                    ? "text-purple-500 fill-purple-500/20"
                    : (isActive ? "text-foreground" : "text-muted-foreground")
                )} />

                {(!collapsed || isMobile) && (
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className={cn(
                      "truncate transition-all duration-200",
                      isAi && "font-bold text-foreground"
                    )}>
                      {item.name}
                    </span>
                    {item.description && (
                      <span className="text-[11px] text-muted-foreground transition-all duration-200">
                        {item.description}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>


        {/* User Info & Logout */}
        <div className="border-t border-border p-4 space-y-2 overflow-hidden max-w-full">
          {/* User Info */}
          {isAuthenticated && user && (
            <button
              onClick={() => router.push('/profile')}
              className="
        flex w-full min-w-0 items-center gap-3
        rounded-lg px-3 py-2
        hover:bg-accent
        transition-colors text-left
        overflow-hidden
      "
            >
              {/* Avatar */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-medium text-foreground">
                {user.first_name
                  ? user.first_name.charAt(0).toUpperCase()
                  : user.email.charAt(0).toUpperCase()}
              </div>

              {/* Text */}
              {(!collapsed || isMobile) && (
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium text-foreground">
                    {getUserFullName(user) || user.email}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              )}
            </button>
          )}

          {/* Logout Button */}
          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className="
        flex w-full min-w-0 items-center gap-3
        rounded-lg px-3 py-2
        text-muted-foreground
        hover:bg-accent hover:text-foreground
        transition-colors
        overflow-hidden
      "
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {(!collapsed || isMobile) && (
                <span className="truncate text-sm">Logout</span>
              )}
            </button>
          )}

          {/* Collapse toggle */}
          {!isMobile && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="flex w-full items-center justify-center rounded-lg py-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft
                className={cn(
                  "h-4 w-4 transition-transform",
                  collapsed && "rotate-180"
                )}
              />
            </button>
          )}
        </div>

      </div>
    </aside>
  );
}

