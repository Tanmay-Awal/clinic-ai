'use client';
import AppLayout from '@/components/Layouts/AppLayout';

export default function QA() {
    return (
      <AppLayout>
        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-6 animate-fade-in">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">QA Workbench</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Quality assurance and call review tools
              </p>
            </div>
            <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-border bg-card shadow-premium-sm">
              <p className="text-muted-foreground">QA workbench in development</p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }
  