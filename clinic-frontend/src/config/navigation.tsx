import {
  LayoutDashboard,
  Phone,
  TrendingUp,
  ClipboardList,
  FileBarChart,
  Settings,
  MessageCircle,
  User,
  PhoneOutgoing,
  Bot
} from 'lucide-react';
import React from 'react';

// Special icon component for Netra AI
export const SparkleIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"
      fill="url(#sparkle-gradient)"
    />
    <circle cx="18" cy="6" r="1.5" fill="#F472B6" />
    <circle cx="6" cy="18" r="1" fill="#22D3EE" />
    <defs>
      <linearGradient id="sparkle-gradient" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F472B6" />
        <stop offset="0.5" stopColor="#A855F7" />
        <stop offset="1" stopColor="#22D3EE" />
      </linearGradient>
    </defs>
  </svg>
);

export const NAVIGATION_ITEMS = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Calls', href: '/calls', icon: Phone },
  { name: 'WhatsApp', href: '/whatsapp', icon: MessageCircle, requiresWhatsappToken: true },
  { name: 'Actions', href: '/actions', icon: ClipboardList },
  { name: 'Insights', href: '/insights', icon: TrendingUp },
  { name: 'Reports', href: '/reports', icon: FileBarChart },
  { name: 'Admin', href: '/admin', icon: Settings, isAdminOnly: true },
  { name: 'Profile', href: '/profile', icon: User, isProfile: true },
];
