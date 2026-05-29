'use client';

import AppLayout from '@/components/Layouts/AppLayout';
import OutboundList from '@/components/Outbound/OutboundList';
import { useOrganisationSettings } from '@/hooks/useOrganisationSettings';
import { Loader2, Ban } from 'lucide-react';
import { useAuthStore, hasActionsOnlyRole } from '@/store/authStore';
import { DisabledPageMessage } from '@/components/DisabledPageMessage';

export default function OutboundPage() {
  const { settings, isLoading } = useOrganisationSettings();
  const { user } = useAuthStore();
  const isActionsRole = hasActionsOnlyRole(user);

  if (isActionsRole) {
    return (
      <AppLayout>
        <DisabledPageMessage title="Outbound Disabled" />
      </AppLayout>
    );
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex h-full w-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!settings?.enable_outbound_calls) {
    return (
      <AppLayout>
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-8 text-center text-muted-foreground">
          <div className="rounded-full bg-muted p-4">
            <Ban className="h-12 w-12" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Outbound Calls Disabled</h2>
            <p>This feature has been disabled from the Admin Panel.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <OutboundList />
    </AppLayout>
  );
}
