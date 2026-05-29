'use client';

import { use, useEffect, useState } from 'react';
import { ArrowLeft, Download, StopCircle, RotateCcw, Play, Phone, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/Layouts/AppLayout';
import { apiClient } from '@/lib/api/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore, hasActionsOnlyRole } from '@/store/authStore';
import { DisabledPageMessage } from '@/components/DisabledPageMessage';

interface CampaignDetail {
  id: string;
  name: string;
  script_id: string;
  status: 'draft' | 'running' | 'completed' | 'paused';
  total_contacts: number;
  created_at?: string;
  schedule_type?: string;
  max_attempts?: number;
}

interface Contact {
  id: string;
  phone_number: string;
  name?: string;
  email?: string;
  status?: string;
  outcome?: string;
  last_call_at?: string;
  attempts?: number;
}

export default function OutboundCampaignDetail({ params }: { params: Promise<{ outboundId: string }> }) {
  const { outboundId } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const isActionsRole = hasActionsOnlyRole(user);

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isContactsLoading, setIsContactsLoading] = useState(true);

  useEffect(() => {
    if (isActionsRole) return;
    const fetchCampaignDetail = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get(`/campaigns/${outboundId}`);
        setCampaign(response.data);
      } catch (error: any) {
        console.error('Error fetching campaign details:', error);
        toast({
          title: "Error",
          description: "Could not load campaign details. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    const fetchContacts = async () => {
      setIsContactsLoading(true);
      try {
        const response = await apiClient.get(`/campaigns/${outboundId}/contacts?page=1&limit=10`);
        // Handle both direct array or paginated response
        const data = Array.isArray(response.data) ? response.data : response.data.data;
        setContacts(data || []);
      } catch (error: any) {
        console.error('Error fetching contacts:', error);
      } finally {
        setIsContactsLoading(false);
      }
    };

    fetchCampaignDetail();
    fetchContacts();
  }, [outboundId, toast, isActionsRole]);

  const handleStopCampaign = () => {
    toast({
      title: "Campaign stopped",
      description: "All pending calls have been cancelled"
    });
  };

  const handleRetryFailed = () => {
    toast({
      title: "Retry initiated",
      description: "Failed numbers will be retried shortly"
    });
  };

  const handleExport = () => {
    toast({
      title: "Data exported",
      description: "Campaign data has been exported to CSV"
    });
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!campaign) return;
    try {
      await apiClient.put(`/campaigns/${campaign.id}`, { status: newStatus });
      setCampaign({ ...campaign, status: newStatus as any });
      toast({
        title: "Status updated",
        description: `Campaign status changed to ${newStatus}`
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update campaign status",
        variant: "destructive"
      });
    }
  };

  const getOutcomeColor = (outcome: string) => {
    const o = outcome?.toLowerCase();
    if (o === 'conversion' || o === 'interested') return 'border-success/20 bg-success/5 text-success';
    if (o === 'failed' || o === 'no response' || o === 'busy') return 'border-destructive/20 bg-destructive/5 text-destructive';
    if (o === 'not interested') return 'border-muted/20 bg-muted/5 text-muted-foreground';
    return 'border-warning/20 bg-warning/5 text-warning';
  };

  // ── Role gate (after all hooks) ──
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
        <div className="flex h-dvh items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading campaign details...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!campaign) {
    return (
      <AppLayout>
        <div className="flex h-dvh items-center justify-center">
          <div className="text-center space-y-4">
            <h2 className="text-xl font-semibold">Campaign not found</h2>
            <Button onClick={() => router.push('/outbound')}>Back to List</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-dvh max-h-dvh overflow-hidden p-6">
        <div className="space-y-6 animate-fade-in overflow-y-auto">
          {/* Back Button & Header */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/outbound')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Campaigns
            </Button>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">{campaign.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Campaign ID: {campaign.id}
              </p>
            </div>

            <div className="w-[180px]">
              <Select
                value={campaign.status}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger className={cn(
                  "w-full capitalize",
                  campaign.status === 'running' && 'border-green-500/20 bg-green-500/10 text-green-500',
                  campaign.status === 'completed' && 'border-blue-500/20 bg-blue-500/10 text-blue-500',
                  campaign.status === 'draft' && 'border-slate-500/20 bg-slate-500/10 text-slate-500',
                  campaign.status === 'paused' && 'border-yellow-500/20 bg-yellow-500/10 text-yellow-500'
                )}>
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      {campaign.status === 'running' && <Play className="h-3 w-3" />}
                      <span className="capitalize">{campaign.status}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Campaign Summary Panel */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Campaign Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs uppercase text-muted-foreground mb-1">Script Used</p>
                  <p className="text-sm font-medium">{campaign.script_id}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground mb-1">Created At</p>
                  <p className="text-sm font-medium">
                    {campaign.created_at ? new Date(campaign.created_at).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground mb-1">Total Contacts</p>
                  <p className="text-sm font-medium font-mono">{campaign.total_contacts}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground mb-1">Max Attempts</p>
                  <p className="text-sm font-medium">{campaign.max_attempts || 1}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground mb-1">Schedule Type</p>
                  <p className="text-sm font-medium capitalize">{campaign.schedule_type || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground mb-1">Status</p>
                  <p className="text-sm font-medium capitalize">{campaign.status}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Actions */}
          {/* <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={handleStopCampaign} className="gap-2" disabled={campaign.status !== 'running'}>
              <StopCircle className="h-4 w-4" />
              Stop Campaign
            </Button>
            <Button variant="outline" onClick={handleRetryFailed} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Retry Failed Numbers
            </Button>
            <Button variant="outline" onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Export to CSV
            </Button>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Sync to CRM/PMS
            </Button>
          </div> */}

          {/* Campaign Logs Table */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Campaign Contact List</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                        Number
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                        Status
                      </th>

                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {isContactsLoading ? (
                      <tr>
                        <td colSpan={2} className="px-4 py-8 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Loading contacts...</span>
                          </div>
                        </td>
                      </tr>
                    ) : contacts.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-4 py-8 text-center text-sm text-muted-foreground">
                          No contacts found for this campaign.
                        </td>
                      </tr>
                    ) : (
                      contacts.map((contact) => (
                        <tr key={contact.id} className="transition-colors hover:bg-secondary/30">
                          <td className="px-4 py-4">
                            <span className="text-sm font-mono">{contact.name}</span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm font-mono">{contact.phone_number}</span>
                          </td>
                          <td className="px-4 py-4">
                            <Badge variant="outline" className={cn('text-xs capitalize', getOutcomeColor(contact.status || contact.outcome || 'Pending'))}>
                              {contact.status || contact.outcome || 'Pending'}
                            </Badge>
                          </td>

                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout >
  );
}
