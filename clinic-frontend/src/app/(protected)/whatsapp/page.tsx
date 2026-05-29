import React from 'react';
import WhatsappDashboard from '@/components/Whatsapp/WhatsappDashboard';
import AppLayout from '@/components/Layouts/AppLayout';

export default function WhatsappPage() {
  return (
    <AppLayout>
      <div className="animate-in fade-in zoom-in-95 duration-300 w-full h-full">
        <WhatsappDashboard />
      </div>
    </AppLayout>
  );
}
