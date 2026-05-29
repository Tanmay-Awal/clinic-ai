import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/store/authStore";
import { exportInsightsPdf } from "@/lib/exportInsightsPdf";

export type InsightCategory = "Reservation" | "Feedback";

interface InsightsHeaderProps {
  category: InsightCategory;
  setCategory: (category: InsightCategory) => void;
  reportData?: Record<string, any> | null;
  onOpenHistory?: () => void;
  tabLabels?: { Reservation?: string; Feedback?: string };
}

const CATEGORIES: InsightCategory[] = ["Reservation", "Feedback"];
export function InsightsHeader({ category, setCategory, reportData, onOpenHistory, tabLabels }: InsightsHeaderProps) {
  const { toast } = useToast();
  const user = useAuthStore((state) => state.user);
  const sitesEnabled = user?.sites_enabled === true;

  const handleSave = () => {
    if (!reportData) {
      toast({ title: "No report to save", description: "Generate a report first.", variant: "destructive" });
      return;
    }
    exportInsightsPdf(reportData as any);
  };

  return (
    <div className="sticky top-0 z-10 border-b border-border bg-background">
      <div className="flex h-16 items-center justify-between gap-4 px-6">
        <h1 className="text-xl font-semibold tracking-tight">Insights</h1>

        {/* Category Selector - Segmented Control */}
        <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${category === cat
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              {tabLabels?.[cat] ?? cat}
            </button>
          ))}
        </div>

        {/* Site Selector - Only show when sites_enabled is true */}
        {sitesEnabled && (
          <Select defaultValue="all-sites">
            <SelectTrigger className="w-48 h-9 bg-background">
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


        {/* Export Menu */}
        <div className="flex gap-2">
          {/* <Select onValueChange={handleExport}>
            <SelectTrigger className="w-32">
              <Download className="h-4 w-4" />
              <SelectValue placeholder="Export" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="snapshot">Dashboard Snapshot</SelectItem>
            </SelectContent>
          </Select> */}

          {onOpenHistory && (
            <Button variant="outline" size="icon" onClick={onOpenHistory} className="text-muted-foreground hover:text-foreground">
              <History className="h-4 w-4" />
            </Button>
          )}

          <Button variant="outline" onClick={handleSave}>
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
