'use client';
import { useState, useEffect, useRef } from 'react';
import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { notificationSound } from '@/utils/notification-sound';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const audioInitialized = useRef(false);
  const router = useRouter();

  // Initialize audio on first user interaction & listen for push notifications
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (audioInitialized.current) return;
      notificationSound.init();
      audioInitialized.current = true;
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };

    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction);

    // Listen for messages from Service Worker
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PUSH_RECEIVED') {
        notificationSound.play();
      } else if (event.data?.type === 'NAVIGATE' && event.data?.url) {
        const url = new URL(event.data.url);
        router.push(url.pathname + url.search + url.hash);
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }

    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
    };
  }, []);

  return (
    <div className="flex h-dvh w-screen overflow-hidden bg-background">
      {/* Desktop Sidebar (fixed, never scrolls) */}
      <Sidebar />

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden flex shrink-0 items-center justify-between p-4 border-b border-border bg-card">
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Convo
          </span>

          <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>

            <SheetContent
              side="left"
              className="p-0 border-r border-border bg-card w-[80%] max-w-[300px]"
            >
              <SheetTitle className="sr-only">Navigation menu</SheetTitle>
              <Sidebar isMobile onClose={() => setIsMobileOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>

        {/* Main Content — ONLY SCROLL AREA */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
