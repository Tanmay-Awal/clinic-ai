import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Search, Upload, Loader2, Bell, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useImportDashboard } from '@/hooks/use-dashboard';
import { useAuthStore } from '@/store/authStore';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';

interface DashboardHeaderProps {
  category: string;
  onCategoryChange: (category: string) => void;
  categories?: string[];
  categoryLabels?: Record<string, string>;
  isLoadingCategories?: boolean;
  onNotificationClick?: () => void;
  unreadCount?: number;
  dateRange?: string;
  onDateRangeChange?: (range: string) => void;
  showExport?: boolean;
  onExportClick?: () => void;
  isExporting?: boolean;
}

// Default fallback categories
const defaultCategories = ['all', 'reservation', 'sales', 'feedback', 'enquiry', 'support', 'housekeeping'];
const defaultCategoryLabels: Record<string, string> = {
  all: 'All',
  reservation: 'Reservation',
  sales: 'Sales',
  feedback: 'Feedback',
  enquiry: 'Enquiry',
  support: 'Support',
  housekeeping: 'Housekeeping'
};

export default function DashboardHeader({
  category,
  onCategoryChange,
  categories = defaultCategories,
  categoryLabels = defaultCategoryLabels,
  isLoadingCategories = false,
  onNotificationClick,
  unreadCount = 0,
  dateRange = 'today',
  onDateRangeChange,
  showExport = false,
  onExportClick,
  isExporting = false,
}: DashboardHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importMutation = useImportDashboard();
  const user = useAuthStore((state) => state.user);
  const sitesEnabled = user?.sites_enabled === true;

  // Custom Date Picker State
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [customOpen, setCustomOpen] = useState(false);

  // Sync internal custom date state with the dateRange prop
  useEffect(() => {
    if (dateRange?.startsWith('custom|')) {
      const [, start, end] = dateRange.split('|');
      if (start && end) {
        // Use a safe date parser
        const startDate = new Date(start);
        const endDate = new Date(end);
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          setCustomFrom(startDate);
          setCustomTo(endDate);
        }
      }
    }
  }, [dateRange]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type - only allow CSV files
    const allowedExtensions = ['.csv'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    if (!allowedExtensions.includes(fileExtension)) {
      toast.error('Please upload only CSV files (.csv)');
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Validate file size (max 10MB)
    const maxSizeInBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSizeInBytes) {
      toast.error('File size must be less than 10MB');
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Use the mutation hook which handles loading state and API call
    importMutation.mutate(file, {
      onSettled: () => {
        // Reset file input after mutation completes (success or error)
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      },
    });
  };

  const handleDateRangeChange = (value: string) => {
    if (value === 'custom') {
      // Small delay to prevent flickering with Select's closing logic
      setTimeout(() => setCustomOpen(true), 150);
    } else {
      onDateRangeChange?.(value);
    }
  };

  const customLabel = customFrom && customTo
    ? `${format(customFrom, 'd MMM')} - ${format(customTo, 'd MMM')}`
    : customFrom
      ? `${format(customFrom, 'd MMM')} - …`
      : 'Custom';

  const currentSelectValue = dateRange?.startsWith('custom|') ? 'custom' : dateRange;

  return (
    <header className="sticky top-0 z-10 flex flex-col md:flex-row items-start md:items-center border-b border-border bg-background px-4 py-3 md:px-6 md:h-16 md:py-0 gap-3 md:gap-4">

      <div className="flex w-full items-center justify-between md:w-auto md:justify-start gap-4">
        {/* Page Title */}
        <h1 className="text-xl font-semibold">Dashboard</h1>

        {/* Mobile Notification Bell */}
        <div className="md:hidden">
          {onNotificationClick && (
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={onNotificationClick}
            >
              <Bell
                className={cn(
                  "h-5 w-5",
                  unreadCount > 0 && "fill-white text-white"
                )}
              />
              {unreadCount > 0 && (
                <Badge
                  className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center p-0 text-[10px] bg-green-500 text-black min-w-[16px] leading-none"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Category Segmented Control */}
      <div className="w-full overflow-x-auto pb-1 md:pb-0 md:w-auto no-scrollbar">
        <div className="flex min-w-max rounded-lg border border-border p-1">
          {isLoadingCategories ? (
            <div className="px-4 py-1.5 text-sm text-muted-foreground">Loading categories...</div>
          ) : (
            categories.map((cat) => (
              <button
                key={cat}
                onClick={() => onCategoryChange(cat)}
                className={`px-4 py-1.5 text-sm font-medium transition-all rounded-md ${category === cat
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                {categoryLabels[cat] || cat}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex w-full items-center gap-2 md:w-auto md:ml-auto">
        {/* Site Selector - Only show when sites_enabled is true */}
        {sitesEnabled && (
          <Select defaultValue="all-sites">
            <SelectTrigger className="flex-1 md:w-48 h-9 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-sites">All Sites</SelectItem>
              <SelectItem value="mayfair">Mayfair Location</SelectItem>
              <SelectItem value="city">City Location</SelectItem>
              <SelectItem value="shoreditch">Shoreditch Location</SelectItem>
              <SelectItem value="canary">Canary Wharf</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Date Range with Custom Picker */}
        <Popover open={customOpen} onOpenChange={setCustomOpen}>
          <PopoverTrigger asChild>
            <div>
              <Select value={currentSelectValue} onValueChange={handleDateRangeChange}>
                <SelectTrigger className="w-44 h-9 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem
                    value="custom"
                    onPointerDown={(e) => {
                      // Always open custom picker when "Custom" is clicked, even if already selected
                      if (currentSelectValue === 'custom') {
                        setTimeout(() => setCustomOpen(true), 150);
                      }
                    }}
                  >
                    {currentSelectValue === 'custom' ? customLabel : 'Custom'}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <div className="p-4 space-y-3">
              <p className="text-sm font-medium">Select date range</p>
              <div className="flex gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">From</p>
                  <Calendar
                    mode="single"
                    selected={customFrom}
                    onSelect={setCustomFrom}
                    className={cn("p-3 pointer-events-auto")}
                    disabled={(date) => {
                      const isFuture = date > new Date();
                      const isAfterTo = customTo ? date > customTo : false;
                      return isFuture || isAfterTo;
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">To</p>
                  <Calendar
                    mode="single"
                    selected={customTo}
                    onSelect={setCustomTo}
                    className={cn("p-3 pointer-events-auto")}
                    disabled={(date) => {
                      const isFuture = date > new Date();
                      const isBeforeFrom = customFrom ? date < customFrom : false;
                      return isFuture || isBeforeFrom;
                    }}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setCustomOpen(false); onDateRangeChange?.('7d'); }}>
                  Cancel
                </Button>
                <Button size="sm" onClick={() => {
                  if (customFrom && customTo) {
                    const start = format(customFrom, 'yyyy-MM-dd');
                    const end = format(customTo, 'yyyy-MM-dd');
                    onDateRangeChange?.(`custom|${start}|${end}`);
                  }
                  setCustomOpen(false);
                }} disabled={!customFrom || !customTo}>
                  Apply
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Export Button */}
        {showExport && onExportClick && (
          <Button
            variant="outline"
            size="sm"
            onClick={onExportClick}
            disabled={isExporting}
            className="h-9 gap-2 ml-1"
          >
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            <span className="hidden sm:inline">Export</span>
          </Button>
        )}
      </div>

      {/* Desktop Notification Bell */}
      <div className="hidden md:block">
        {onNotificationClick && (
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={onNotificationClick}
          >
            <Bell
              className={cn(
                "h-5 w-5",
                unreadCount > 0 && "fill-white text-white"
              )}
            />
            {unreadCount > 0 && (
              <Badge
                className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center p-0 text-[10px] bg-green-500 text-black min-w-[16px] leading-none"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>
        )}
      </div>
    </header>
  );
}
