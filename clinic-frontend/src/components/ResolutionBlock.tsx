import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ResolutionBlockProps {
  initialData?: {
    requiresFollowup: boolean;
    compOffer: string;
    followupDueAt: string;
    followupOutcome: string;
  };
}

export function ResolutionBlock({ initialData }: ResolutionBlockProps) {
  const [requiresFollowup, setRequiresFollowup] = useState(initialData?.requiresFollowup ?? false);
  const [compOffer, setCompOffer] = useState(initialData?.compOffer ?? 'none');
  const [followupDueAt, setFollowupDueAt] = useState(initialData?.followupDueAt ?? '');
  const [followupOutcome, setFollowupOutcome] = useState(initialData?.followupOutcome ?? 'pending');
  const [hasChanges, setHasChanges] = useState(false);

  const handleChange = (setter: (value: any) => void) => (value: any) => {
    setter(value);
    setHasChanges(true);
  };

  const handleSave = () => {
    toast({ title: 'Success', description: 'Resolution details saved' });
    setHasChanges(false);
  };

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'completed':
        return 'bg-white text-black';
      case 'pending':
        return 'bg-[#333] text-white/80';
      case 'cancelled':
        return 'bg-white/10 text-white/60';
      default:
        return 'bg-[#333] text-white/80';
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-[#0A0A0A] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/80">
          Resolution & Follow-up
        </h3>
        {hasChanges && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleSave}
            className="text-xs"
          >
            <Check className="h-3 w-3 mr-1" />
            Save
          </Button>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="followup"
            checked={requiresFollowup}
            onCheckedChange={handleChange(setRequiresFollowup)}
          />
          <label
            htmlFor="followup"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-white/85"
          >
            Requires Follow-up
          </label>
        </div>

        {requiresFollowup && (
          <>
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-white/60 mb-2 block">
                Comp Offer
              </label>
              <select
                value={compOffer}
                onChange={(e) => handleChange(setCompOffer)(e.target.value)}
                className="w-full rounded-lg border border-border bg-[#000000] px-3 py-2 text-sm text-white"
              >
                <option value="none">None</option>
                <option value="10_percent">10% Discount</option>
                <option value="free_dessert">Free Dessert</option>
                <option value="free_drink">Free Drink</option>
                <option value="full_refund">Full Refund</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-white/60 mb-2 block">
                Follow-up Due At
              </label>
              <input
                type="datetime-local"
                value={followupDueAt}
                onChange={(e) => handleChange(setFollowupDueAt)(e.target.value)}
                className="w-full rounded-lg border border-border bg-[#000000] px-3 py-2 text-sm text-white"
              />
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-white/60 mb-2 block">
                Follow-up Outcome
              </label>
              <select
                value={followupOutcome}
                onChange={(e) => handleChange(setFollowupOutcome)(e.target.value)}
                className="w-full rounded-lg border border-border bg-[#000000] px-3 py-2 text-sm text-white"
              >
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_response">No Response</option>
              </select>
            </div>

            <div className="pt-2">
              <Badge className={getOutcomeColor(followupOutcome)}>
                {followupOutcome.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          </>
        )}

        <div className="text-xs text-white/40 pt-2 border-t border-border">
          Last updated by System at 2025-11-12 17:45
        </div>
      </div>
    </div>
  );
}
