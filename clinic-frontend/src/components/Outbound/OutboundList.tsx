'use client';
import { useEffect, useState } from 'react';
import { Plus, Download, Play, Pause, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import KPITile from '@/components/KPITile';
import FunnelChartBW from '@/components/FunnelChartBW';
import DonutChartBW from '@/components/DonutChartBW';
import { cn } from '@/lib/utils';
import AppLayout from '@/components/Layouts/AppLayout';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';

interface Campaign {
  id: string;
  name: string;
  total_contacts?: number;
  totalContacts?: number;
  status: 'draft' | 'running' | 'completed' | 'paused';
  created_at?: string;
}

export default function OutboundList() {
  const router = useRouter();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('7d');

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/campaigns?page=1&limit=10');
      // Handle both direct array or paginated response
      const data = Array.isArray(response.data) ? response.data : response.data.data;
      setCampaigns(data || []);
    } catch (error: any) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: "Error",
        description: "Failed to load campaigns",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      toast({
        title: "Exporting...",
        description: "Preparing your CSV file.",
      });

      // Fetch all campaigns for export (high limit)
      const response = await apiClient.get('/campaigns?page=1&limit=1000');
      const data = Array.isArray(response.data) ? response.data : response.data.data;
      const allCampaigns: Campaign[] = data || [];

      if (allCampaigns.length === 0) {
        toast({
          title: "Export Failed",
          description: "No campaigns to export.",
          variant: "destructive"
        });
        return;
      }

      const headers = ['Campaign Name', 'Total Contacts', 'Created At'];
      const rows = allCampaigns.map(c => [
        `"${c.name.replace(/"/g, '""')}"`, // Escape quotes
        c.total_contacts ?? c.totalContacts ?? 0,
        c.created_at ? `"${new Date(c.created_at).toISOString().split('T')[0]}"` : '""'
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `campaign_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Complete",
        description: "Your campaign data has been exported.",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Could not export campaigns.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex flex-col p-6 overflow-y-auto">
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Outbound Campaigns</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage and track automated outbound calling campaigns
            </p>
          </div>
          <Button onClick={() => router.push('/outbound/campaign')} className="gap-2">
            <Plus className="h-4 w-4" />
            New Outbound Campaign
          </Button>
        </div>

        <Card className="border-border bg-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Campaign List Performance</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={fetchCampaigns} disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Refresh
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                      Campaign Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                      Total Contacts
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Loading campaigns...</span>
                        </div>
                      </td>
                    </tr>
                  ) : campaigns.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                        No campaigns found. Create your first campaign to get started.
                      </td>
                    </tr>
                  ) : (
                    campaigns.map((campaign) => (
                      <tr
                        key={campaign.id}
                        className="transition-colors hover:bg-secondary/30"
                      >
                        <td className="px-4 py-4">
                          <span className="text-sm font-medium">{campaign.name}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm font-mono">
                            {campaign.total_contacts ?? campaign.totalContacts ?? 0}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <Badge
                            variant="outline"
                            className={cn(
                              'capitalize',
                              campaign.status === 'running' && 'border-green-500/20 bg-green-500/10 text-green-500',
                              campaign.status === 'completed' && 'border-blue-500/20 bg-blue-500/10 text-blue-500',
                              campaign.status === 'draft' && 'border-slate-500/20 bg-slate-500/10 text-slate-500',
                              campaign.status === 'paused' && 'border-yellow-500/20 bg-yellow-500/10 text-yellow-500'
                            )}
                          >
                            {campaign.status === 'running' && <Play className="h-3 w-3 mr-1" />}
                            {campaign.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/outbound/${campaign.id}`)}
                            className="gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            View Details
                          </Button>
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
  );
}
