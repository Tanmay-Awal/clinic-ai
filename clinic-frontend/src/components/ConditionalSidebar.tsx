'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Layouts/Sidebar';

export default function ConditionalSidebar() {
  const pathname = usePathname();
  
  // Don't show sidebar on root path
  if (pathname === '/') {
    return null;
  }
  
  return <Sidebar />;
}

