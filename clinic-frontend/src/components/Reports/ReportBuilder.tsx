import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ACTION_REQUEST_TYPE_LABELS, ACTION_STATUS_LABELS, ActionRequestType, ActionStatus } from '@/types/actions';
import { ArrowLeft, Download, RotateCw, Printer } from 'lucide-react';
import { reportsApi, ReportMetadata, GenerateReportRequest, ReportFilter } from '@/lib/api/reports';
import { format } from 'date-fns';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import toast from 'react-hot-toast';
import ConfigurationPanel from './ConfigurationPanel';
import ReportTable from './ReportTable';
import { getReportTheme, PLACEHOLDER_EMAIL_SUFFIX, shouldHideCellValue } from './reportTheme';

interface Props {
  reportType: string;
  onBack: () => void;
}

const EXPORT_PAGE_SIZE = 100;
const EXPORT_MAX_PAGES = 100; // safety cap: max 10,000 rows

export default function ReportBuilder({ reportType, onBack }: Props) {
  const [metadata, setMetadata] = useState<ReportMetadata | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Report State
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<GenerateReportRequest['dateRange']>();
  const [filters, setFilters] = useState<GenerateReportRequest['filters']>([]);
  const [sort, setSort] = useState<GenerateReportRequest['sort']>();

  // Table State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    async function fetchMetadata() {
      try {
        setLoadingConfig(true);
        const data = await reportsApi.getReportMetadata(reportType);
        setMetadata(data);
        setSelectedColumns(data.defaultColumns.filter(c => !['area', 'channel'].includes(c)));
      } catch (err) {
        toast.error('Failed to load report configuring metadata.');
      } finally {
        setLoadingConfig(false);
      }
    }
    fetchMetadata();
  }, [reportType]);

  // Memoised so ReportTable's useEffect doesn't fire on every render
  const currentConfig = useMemo<GenerateReportRequest>(() => ({
    columns: selectedColumns,
    dateRange: (dateRange?.from || dateRange?.to) ? dateRange : undefined,
    filters,
    sort,
    page,
    pageSize,
  }), [selectedColumns, dateRange, filters, sort, page, pageSize]);

  const handleExport = async () => {
    if (!metadata) return;
    try {
      setIsExporting(true);

      const allRows: Record<string, any>[] = [];
      let currentPage = 1;
      let capped = false;

      while (currentPage <= EXPORT_MAX_PAGES) {
        const response = await reportsApi.generateReport(reportType, {
          columns: selectedColumns,
          dateRange: (dateRange?.from || dateRange?.to) ? dateRange : undefined,
          filters,
          sort,
          page: currentPage,
          pageSize: EXPORT_PAGE_SIZE,
        });
        allRows.push(...response.data);
        if (allRows.length >= response.total || response.data.length < EXPORT_PAGE_SIZE) break;
        currentPage++;
        if (currentPage > EXPORT_MAX_PAGES) { capped = true; break; }
      }

      if (capped) {
        toast('Export capped at 10,000 rows. Apply filters to narrow results.', { icon: '⚠️' });
      }

      const nameColumns = new Set(
        Object.keys(metadata.columns).filter(k => k.toLowerCase().includes('name') || k.toLowerCase().includes('customer'))
      );

      const formatCell = (value: any, type: string, colId: string, row?: Record<string, any>): string => {
        // Business logic overrides
        if (shouldHideCellValue(reportType, colId, row)) {
          return '';
        }

        let finalValue = value;
        if (finalValue === null || finalValue === undefined || String(finalValue).trim() === '' || String(finalValue).trim() === '-') {
          if (nameColumns.has(colId)) {
            finalValue = 'Unknown';
          } else {
            return '';
          }
        }
        if (typeof finalValue === 'string' && finalValue.includes(PLACEHOLDER_EMAIL_SUFFIX)) return '';
        
        if (colId === 'request_type' && typeof finalValue === 'string') {
          finalValue = ACTION_REQUEST_TYPE_LABELS[finalValue as ActionRequestType] || finalValue.replace(/_/g, ' ');
        }
        if (colId === 'status' && typeof finalValue === 'string') {
          finalValue = ACTION_STATUS_LABELS[finalValue.toLowerCase() as ActionStatus] || finalValue;
        }

        if (type === 'date') {
          try { 
            if (colId === 'created_at' || colId === 'due_at' || colId === 'resolved_at') {
              return format(new Date(finalValue), 'MMM d, yyyy, h:mm a'); 
            }
            return format(new Date(finalValue), 'MMM d, yyyy'); 
          } catch { return String(finalValue); }
        }

        // Fallback for valid ISO strings in case metadata type config is missing locally
        if (typeof finalValue === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(finalValue)) {
          try {
            return format(new Date(finalValue), 'MMM d, yyyy, h:mm a');
          } catch { /* ignore */ }
        }

        if (type === 'boolean') return finalValue ? 'Yes' : 'No';
        const str = String(finalValue);
        return str.includes(',') || str.includes('\n') || str.includes('"')
          ? `"${str.replace(/"/g, '""')}"` : str;
      };

      const headers = selectedColumns.map(c => metadata.columns[c.toLowerCase()]?.label || metadata.columns[c]?.label || c);
      const rows = allRows.map(row =>
        selectedColumns.map(c => formatCell(row[c], metadata.columns[c.toLowerCase()]?.type || metadata.columns[c]?.type || 'string', c.toLowerCase(), row)).join(',')
      );
      const csv = [headers.join(','), ...rows].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportType}-report-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      if (!capped) toast.success('Report downloaded successfully!');
    } catch (err) {
      toast.error('Failed to export report.');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loadingConfig || !metadata) {
    return (
      <div className="flex-1 space-y-8 p-8 flex items-center justify-center min-h-[400px]">
        <RotateCw className="h-8 w-8 animate-spin text-muted-foreground mr-2" />
        <span className="text-muted-foreground text-lg">Initializing Report Engine...</span>
      </div>
    );
  }

  const theme = getReportTheme(reportType);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-3 flex-shrink-0 bg-card/80 backdrop-blur-sm relative overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-r ${theme.headerGradient} pointer-events-none`} />
        <div className={`absolute -top-20 -left-20 w-40 h-40 rounded-full blur-3xl opacity-15 pointer-events-none bg-gradient-to-br ${theme.accentGradient}`} />

        <div className="flex items-center gap-3 z-10">
          <Button variant="outline" size="icon" onClick={onBack} className="h-8 w-8 rounded-full border-border/50 hover:bg-muted/50">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="#" onClick={(e) => { e.preventDefault(); onBack(); }} className="cursor-pointer text-muted-foreground hover:text-foreground">Reports</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="capitalize font-semibold">{reportType} Reports</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="flex items-center gap-2 z-10">
          <Button onClick={handlePrint} variant="outline" size="sm" className="gap-1.5 rounded-full border-border/50 hover:bg-muted/50 text-xs">
            <Printer className="h-3.5 w-3.5" />
            Print
          </Button>
          <Button onClick={handleExport} disabled={isExporting} size="sm" className={`gap-1.5 rounded-full text-xs font-semibold bg-gradient-to-r ${theme.accentGradient} text-white hover:opacity-90 shadow-sm transition-opacity`}>
            {isExporting ? <RotateCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Export CSV
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Side: Configuration Panel */}
        <div className="w-[360px] border-r border-border/50 flex flex-col bg-card/40 z-10 shadow-[1px_0_10px_-2px_rgba(0,0,0,0.05)] hidden md:flex no-print">
          <ConfigurationPanel
            reportType={reportType}
            metadata={metadata}
            selectedColumns={selectedColumns}
            onChangeColumns={setSelectedColumns}
            dateRange={dateRange}
            onChangeDateRange={(range: GenerateReportRequest['dateRange']) => { setDateRange(range); setPage(1); }}
            filters={filters || []}
            onChangeFilters={(f: ReportFilter[]) => { setFilters(f); setPage(1); }}
          />
        </div>

        {/* Right Side: Data Table */}
        <div className="flex-1 flex flex-col overflow-hidden bg-muted/10">
          <ReportTable
            reportType={reportType}
            metadata={metadata}
            config={currentConfig}
            onSortChange={(s: GenerateReportRequest['sort']) => { setSort(s); setPage(1); }}
            onPageChange={setPage}
            onPageSizeChange={(s: number) => { setPageSize(s); setPage(1); }}
          />
        </div>
      </div>
    </div>
  );
}
