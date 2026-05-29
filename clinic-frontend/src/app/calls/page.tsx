'use client';

import { Suspense } from 'react';
import AppLayout from '@/components/Layouts/AppLayout';
import CallsList from '@/components/Calls/CallsList';
import { Loader2 } from 'lucide-react';
import { useAuthStore, hasActionsOnlyRole } from '@/store/authStore';
import { DisabledPageMessage } from '@/components/DisabledPageMessage';

function CallsListLoading() {
  return (
    <div className="flex h-[200px] w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function CallsPage() {
  const { user } = useAuthStore();
  const isActionsRole = hasActionsOnlyRole(user);

  if (isActionsRole) {
    return (
      <AppLayout>
        <DisabledPageMessage title="Calls Disabled" />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Suspense fallback={<CallsListLoading />}>
        <CallsList />
      </Suspense>
    </AppLayout>
  );
}
