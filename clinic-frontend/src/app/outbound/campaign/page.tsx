'use client';
import { useState } from 'react';
import { Upload, Download, ChevronRight, Clock, AlertCircle, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import AppLayout from '@/components/Layouts/AppLayout';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import 'react-datepicker/dist/react-datepicker.css';
import { apiClient } from '@/lib/api/client';
import { useAuthStore, hasActionsOnlyRole } from '@/store/authStore';
import { DisabledPageMessage } from '@/components/DisabledPageMessage';
interface ContactRow {
  phone: string;
  name: string;
  email: string;
  notes: string;
  valid: boolean;
}

const outboundScripts = [
  {
    id: 'feedback-collection',
    name: 'Feedback Collection Script',
    description: 'Collect post-visit feedback',
    goal: 'Gather customer satisfaction data',
    sample: "Hi {name}, thank you for dining with us. We'd love to hear about your experience.",
    requiredFields: ['name']
  }
];

export default function Outbound() {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuthStore();
  const isActionsRole = hasActionsOnlyRole(user);
  const [step, setStep] = useState(1);

  const [campaignName, setCampaignName] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [selectedScript, setSelectedScript] = useState('feedback-collection');
  const [startDateTime, setStartDateTime] = useState<Date | null>(null);
  const [endDateTime, setEndDateTime] = useState<Date | null>(null);
  const [leaveVoicemail, setLeaveVoicemail] = useState(true);
  const [retryAfterHours, setRetryAfterHours] = useState('2');
  const [maxAttempts, setMaxAttempts] = useState('2');
  const [timeWindow, setTimeWindow] = useState('9am-7pm');
  const [scheduleType, setScheduleType] = useState('immediate');
  const [status, setStatus] = useState('draft');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(null);

  // ── Role gate (after all hooks) ──
  if (isActionsRole) {
    return (
      <AppLayout>
        <DisabledPageMessage title="Outbound Disabled" />
      </AppLayout>
    );
  }

  const handleDownloadSample = async () => {
    try {
      const response = await apiClient.get('/campaigns/download-sample', {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'outbound_sample.csv');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Error",
        description: "Failed to download sample file",
        variant: "destructive"
      });
    }
  };

  const handleCreateAndUpload = async () => {
    if (!campaignName.trim() || !uploadedFile) return;

    setIsSubmitting(true);
    try {
      // 1. Create Campaign
      const createResponse = await apiClient.post('/campaigns', {
        name: campaignName,
        script_id: selectedScript,
        schedule_type: scheduleType,
        status: status
      });

      const campaignId = createResponse.data.id;
      setCreatedCampaignId(campaignId);

      // 2. Upload Contacts
      const formData = new FormData();
      formData.append('file', uploadedFile);

      await apiClient.post(`/campaigns/${campaignId}/upload-contacts`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast({
        title: "Success",
        description: `Campaign created and contacts uploaded successfully.`
      });

      setStep(2);

      // Redirect to campaign list after short delay or immediately
      router.push('/outbound');
    } catch (error: any) {
      console.error('Campaign creation error:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create campaign or upload contacts",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (2MB = 2 * 1024 * 1024 bytes)
      const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB in bytes

      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "File too large",
          description: "The file is larger than 2MB. Please select a smaller file.",
          variant: "destructive"
        });
        // Reset the input
        e.target.value = '';
        return;
      }

      setUploadedFile(file);
      toast({
        title: "File uploaded successfully",
      });
    }
  };

  const handleLaunchCampaign = () => {
    toast({
      title: "Campaign launched!",
      description: "Outbound calls will begin shortly"
    });
  };

  const validContacts = contacts.filter(c => c.valid);
  const selectedScriptData = outboundScripts.find(s => s.id === selectedScript);

  return (
    <AppLayout>
      <div className="min-h-dvh bg-background p-6 animate-fade-in">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight">Outbound Calling Module</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload contacts, select a script, and launch automated outbound campaigns
            </p>
          </div>

          {/* Progress Steps */}
          {/* <div className="mb-8 flex items-center gap-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-all",
                    step >= s
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground"
                  )}
                >
                  {s}
                </div>
                <span className={cn("text-sm", step >= s ? "text-foreground" : "text-muted-foreground")}>
                  {s === 1 ? 'Upload' : s === 2 ? 'Script' : 'Launch'}
                </span>
                {s < 3 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </div>
            ))}
          </div> */}

          <div className="grid gap-6 lg:grid-cols-5">
            {/* Left Column - Wizard */}
            <div className="lg:col-span-3 space-y-6">
              {/* Step 1: Campaign Details & Upload */}
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload Phone List for Outbound Calls
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Campaign Name */}
                  <div className="space-y-2">
                    <Label htmlFor="campaign-name">Campaign Name</Label>
                    <Input
                      id="campaign-name"
                      placeholder="Enter campaign name"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                    />
                  </div>

                  {/* Script Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="script">Choose Script</Label>
                    <Select value={selectedScript} onValueChange={setSelectedScript}>
                      <SelectTrigger id="script">
                        <SelectValue placeholder="Select a script..." />
                      </SelectTrigger>
                      <SelectContent>
                        {outboundScripts.map((script) => (
                          <SelectItem key={script.id} value={script.id}>
                            {script.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="status">Campaign Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger id="status">
                        <SelectValue placeholder="Select status..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="running">Running</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Optional Settings */}
                  {/* <div className="space-y-4 rounded-lg border border-border p-4">
                    <h4 className="text-sm font-medium">Optional Settings</h4>

                    <div className="space-y-2">
                      <Label htmlFor="start-datetime">Start Date & Time</Label>
                      <div className="relative">
                        <DatePicker
                          selected={startDateTime}
                          onChange={(date: Date | null) => setStartDateTime(date)}
                          showTimeSelect
                          timeIntervals={15}
                          dateFormat="MMMM d, yyyy h:mm aa"
                          placeholderText="Select date and time"
                          customInput={
                            <Input
                              id="start-datetime"
                              className="pr-10"
                              readOnly
                            />
                          }
                          wrapperClassName="w-full"
                          calendarClassName="!bg-card !border-border"
                          popperClassName="!z-50"
                        />
                        <CalendarIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="end-datetime">End Date & Time</Label>
                      <div className="relative">
                        <DatePicker
                          selected={endDateTime}
                          onChange={(date: Date | null) => setEndDateTime(date)}
                          showTimeSelect
                          timeIntervals={15}
                          dateFormat="MMMM d, yyyy h:mm aa"
                          placeholderText="Select date and time"
                          minDate={startDateTime || undefined}
                          customInput={
                            <Input
                              id="end-datetime"
                              className="pr-10"
                              readOnly
                            />
                          }
                          wrapperClassName="w-full"
                          calendarClassName="!bg-card !border-border"
                          popperClassName="!z-50"
                        />
                        <CalendarIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>
                  </div> */}

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Upload Contact List</span>
                    </div>
                  </div>

                  {/* Upload Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Support .csv, .xlsx, .txt files
                      </p>
                      <Button variant="ghost" size="sm" className="gap-2" onClick={handleDownloadSample}>
                        <Download className="h-4 w-4" />
                        Download sample file
                      </Button>
                    </div>

                    <div className="relative">
                      <input
                        type="file"
                        id="file-upload"
                        className="sr-only"
                        accept=".csv,.xlsx,.txt"
                        onChange={handleFileUpload}
                      />
                      <label
                        htmlFor="file-upload"
                        className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-background/50 p-12 transition-colors hover:border-foreground/50 hover:bg-secondary/30"
                      >
                        <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-sm font-medium">Drop file here or click to upload</p>
                        <p className="text-xs text-muted-foreground mt-1">CSV, XLSX, or TXT</p>
                      </label>
                    </div>

                    {uploadedFile && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3">
                          <span className="text-sm font-medium">{uploadedFile.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setUploadedFile(null);
                              setContacts([]);
                            }}
                          >
                            Clear File
                          </Button>
                        </div>

                        {/* Contact preview hidden as requested */}
                      </div>
                    )}

                    {/* Submit Button */}
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleCreateAndUpload}
                      disabled={!campaignName.trim() || !uploadedFile || isSubmitting}
                    >
                      {isSubmitting ? "Creating..." : "Create Campaign"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Step 2: Select Script */}
              {step >= 2 && (
                <Card className="border-border bg-card">
                  <CardHeader>
                    <CardTitle>Select Outbound Voice Script</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Choose Script</Label>
                      <Select value={selectedScript} onValueChange={setSelectedScript}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a script..." />
                        </SelectTrigger>
                        <SelectContent>
                          {outboundScripts.map((script) => (
                            <SelectItem key={script.id} value={script.id}>
                              {script.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedScriptData && (
                      <div className="space-y-3 rounded-lg border border-border bg-secondary/30 p-4">
                        <div>
                          <p className="text-xs font-medium uppercase text-muted-foreground">Description</p>
                          <p className="text-sm mt-1">{selectedScriptData.description}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase text-muted-foreground">Goal</p>
                          <p className="text-sm mt-1">{selectedScriptData.goal}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase text-muted-foreground">Sample Dialogue</p>
                          <div className="mt-2 rounded-md bg-background/50 p-3">
                            <p className="text-sm text-muted-foreground italic">{selectedScriptData.sample}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase text-muted-foreground">Required Fields</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {selectedScriptData.requiredFields.map((field) => (
                              <span
                                key={field}
                                className="rounded-full border border-border bg-background px-2 py-1 text-xs"
                              >
                                {field}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4 rounded-lg border border-border p-4">
                      <h4 className="text-sm font-medium">Optional Settings</h4>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="voicemail">Leave Voicemail if unanswered</Label>
                        <Switch
                          id="voicemail"
                          checked={leaveVoicemail}
                          onCheckedChange={setLeaveVoicemail}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="retry">Retry after (hours)</Label>
                        <Select value={retryAfterHours} onValueChange={setRetryAfterHours}>
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="2">2</SelectItem>
                            <SelectItem value="4">4</SelectItem>
                            <SelectItem value="8">8</SelectItem>
                            <SelectItem value="24">24</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="attempts">Max Attempts</Label>
                        <Select value={maxAttempts} onValueChange={setMaxAttempts}>
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="2">2</SelectItem>
                            <SelectItem value="3">3</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="timewindow">Time Window</Label>
                        <Select value={timeWindow} onValueChange={setTimeWindow}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="9am-7pm">9AM - 7PM</SelectItem>
                            <SelectItem value="8am-8pm">8AM - 8PM</SelectItem>
                            <SelectItem value="10am-6pm">10AM - 6PM</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => setStep(3)}
                      disabled={!selectedScript}
                    >
                      Next: Review & Launch
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - Summary & Launch */}
            <div className="lg:col-span-2">
              <Card className="border-border bg-card sticky top-6">
                <CardHeader>
                  <CardTitle>Campaign Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {uploadedFile && (
                    <>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">List Name</span>
                          <span className="font-medium">{uploadedFile.name}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total Numbers</span>
                          <span className="font-medium">{contacts.length}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Valid Numbers</span>
                          <span className="font-medium text-success">{validContacts.length}</span>
                        </div>
                      </div>

                      {selectedScriptData && (
                        <>
                          <div className="border-t border-border pt-4 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Script</span>
                              <span className="font-medium text-right max-w-[180px]">
                                {selectedScriptData.name}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Est. Duration</span>
                              <span className="font-medium">~45 sec/call</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Total Time</span>
                              <span className="font-medium">~{Math.ceil((validContacts.length * 45) / 60)} min</span>
                            </div>
                          </div>

                          {step >= 3 && (
                            <>
                              <div className="border-t border-border pt-4 space-y-3">
                                <Label>Schedule Options</Label>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      id="immediate"
                                      name="schedule"
                                      value="immediate"
                                      checked={scheduleType === 'immediate'}
                                      onChange={(e) => setScheduleType(e.target.value)}
                                      className="h-4 w-4"
                                    />
                                    <Label htmlFor="immediate" className="font-normal cursor-pointer">
                                      Start Immediately
                                    </Label>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      id="scheduled"
                                      name="schedule"
                                      value="scheduled"
                                      checked={scheduleType === 'scheduled'}
                                      onChange={(e) => setScheduleType(e.target.value)}
                                      className="h-4 w-4"
                                    />
                                    <Label htmlFor="scheduled" className="font-normal cursor-pointer">
                                      Schedule Start Time
                                    </Label>
                                  </div>

                                </div>

                                {scheduleType === 'scheduled' && (
                                  <Input type="datetime-local" className="text-sm" />
                                )}
                              </div>

                              <Button
                                className="w-full"
                                size="lg"
                                onClick={handleLaunchCampaign}
                              >
                                Start Outbound Campaign
                              </Button>

                              <p className="text-xs text-muted-foreground text-center">
                                This will begin automated voice calls using the selected script
                              </p>
                            </>
                          )}
                        </>
                      )}
                    </>
                  )}

                  {!uploadedFile && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Upload a contact list to see campaign summary
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AppLayout >
  );
}
