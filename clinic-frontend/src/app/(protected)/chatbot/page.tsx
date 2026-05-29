import React from 'react';
import ChatbotDashboard from '@/components/Chatbot/ChatbotDashboard';
import AppLayout from '@/components/Layouts/AppLayout';

export default function ChatbotPage() {
  return (
    <AppLayout>
      <div className="animate-in fade-in zoom-in-95 duration-300 w-full h-full">
        <ChatbotDashboard />
      </div>
    </AppLayout>
  );
}
