import { Suspense } from 'react';
import AppLayout from '@/components/Layouts/AppLayout';
import { Loader2 } from 'lucide-react';
import { ActionsPageContent } from './ActionsPageContent';

function ActionsLoading() {
    return (
        <div className="flex h-[200px] w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
}

export default function ActionsPage() {
    return (
        <AppLayout>
            <Suspense fallback={<ActionsLoading />}>
                <ActionsPageContent />
            </Suspense>
        </AppLayout>
    );
}
