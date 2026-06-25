import AppLayout from '@/components/Layouts/AppLayout';
import { TrendingUp } from 'lucide-react';

export default function Insights() {
  return (
    <AppLayout>
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-8 text-center text-muted-foreground">
        <div className="rounded-full bg-muted p-4">
          <TrendingUp className="h-12 w-12" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Coming Soon</h2>
          <p>We are actively working on AI Insights. Stay tuned!</p>
        </div>
      </div>
    </AppLayout>
  );
}
