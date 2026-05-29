import React, { useEffect, useState, useMemo } from 'react';
import { GenerateReportRequest, GenerateReportResponse, ReportMetadata, reportsApi } from '@/lib/api/reports';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, FileX, Search, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getReportTheme, PLACEHOLDER_EMAIL_SUFFIX, REPORT_LABELS, RECORD_LABELS, shouldHideCellValue } from './reportTheme';
import { ACTION_REQUEST_TYPE_LABELS, ACTION_STATUS_LABELS, ActionRequestType, ActionStatus } from '@/types/actions';
import { DEFAULT_DISPLAY_TIMEZONE, formatDateInTimezone, parseTimestampAsUtc } from '@/lib/timezone';

interface Props {
  reportType: string;
  metadata: ReportMetadata;
  config: GenerateReportRequest;
  onSortChange: (sort: GenerateReportRequest['sort']) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const AVATAR_COLORS = [
  'bg-amber-600', 'bg-orange-600', 'bg-emerald-600', 'bg-teal-600',
  'bg-cyan-600', 'bg-stone-500', 'bg-amber-700', 'bg-emerald-700',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function generateFallbackLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function ReportTable({ reportType, metadata, config, onSortChange, onPageChange, onPageSizeChange }: Props) {
  const [data, setData] = useState<GenerateReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { accentGradient, accentBg, accentText, accentBorder, tableHeaderGradient } = getReportTheme(reportType);

  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        if (!config.columns || config.columns.length === 0) {
          if (mounted) setData({ data: [], total: 0, page: 1, pageSize: 25 });
          return;
        }
        const response = await reportsApi.generateReport(reportType, config);
        if (mounted) setData(response);
      } catch (err: any) {
        if (mounted) setError(err?.response?.data?.message || 'Failed to fetch report data.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    const timer = setTimeout(fetchData, 300);
    return () => { mounted = false; clearTimeout(timer); };
  }, [reportType, config]);

  const filteredData = useMemo(() => {
    if (!data?.data || !search.trim()) return data?.data || [];
    const q = search.toLowerCase();
    return data.data.filter(row =>
      Object.values(row).some(v => v !== null && v !== undefined && String(v).toLowerCase().includes(q))
    );
  }, [data, search]);

  const handleSort = (column: string) => {
    if (config.sort?.column === column) {
      onSortChange(config.sort.direction === 'asc' ? { column, direction: 'desc' } : undefined);
    } else {
      onSortChange({ column, direction: 'asc' });
    }
  };

  // Name-like columns that should render as avatars
  const nameColumns = new Set(
    Object.entries(metadata.columns)
      .filter(([k]) => k.toLowerCase().includes('name') || k.toLowerCase().includes('customer'))
      .map(([k]) => k)
  );

  const renderCellContent = (value: any, type: string, colId: string, row?: Record<string, any>) => {
    // Business logic overrides
    if (shouldHideCellValue(reportType, colId, row)) {
      return <span className="text-muted-foreground/40">—</span>;
    }

    // Handling unknown names
    let isUnknownName = false;
    let finalValue = value;
    if (finalValue === null || finalValue === undefined || String(finalValue).trim() === '' || String(finalValue).trim() === '-') {
      if (nameColumns.has(colId)) {
        finalValue = 'Unknown';
        isUnknownName = true;
      } else {
        return <span className="text-muted-foreground/40">—</span>;
      }
    }
    if (typeof finalValue === 'string' && finalValue.includes(PLACEHOLDER_EMAIL_SUFFIX)) return <span className="text-muted-foreground/40">—</span>;

    if (nameColumns.has(colId) && typeof finalValue === 'string') {
      const displayName = finalValue;
      const color = isUnknownName ? 'bg-muted-foreground/30' : getAvatarColor(displayName);
      const initials = isUnknownName ? '?' : getInitials(displayName);
      return (
        <div className="flex items-center gap-2.5">
          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold shrink-0 ${color}`}>
            {initials}
          </span>
          <span className={`font-medium ${isUnknownName ? 'text-muted-foreground italic' : 'text-foreground'}`}>{displayName}</span>
        </div>
      );
    }

    if (colId === 'request_type' && typeof finalValue === 'string') {
      return <span className="font-medium text-foreground">{ACTION_REQUEST_TYPE_LABELS[finalValue as ActionRequestType] || finalValue.replace(/_/g, ' ')}</span>;
    }

    if (colId === 'status' && typeof finalValue === 'string') {
      return <span className="font-medium text-foreground">{ACTION_STATUS_LABELS[finalValue.toLowerCase() as ActionStatus] || finalValue}</span>;
    }

    if (type === 'date') {
      try {
        const date = parseTimestampAsUtc(finalValue);
        if (Number.isNaN(date.getTime())) return String(finalValue);
        if (colId === 'created_at' || colId === 'due_at' || colId === 'resolved_at') {
          return (
            <span className="tabular-nums text-muted-foreground">
              {formatDateInTimezone(
                date,
                { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' },
                DEFAULT_DISPLAY_TIMEZONE,
              )}
            </span>
          );
        }
        return (
          <span className="tabular-nums text-muted-foreground">
            {formatDateInTimezone(
              date,
              { day: 'numeric', month: 'short', year: 'numeric' },
              DEFAULT_DISPLAY_TIMEZONE,
            )}
          </span>
        );
      }
      catch { return String(finalValue); }
    }

    // Fallback: If it looks exactly like an ISO date, format it anyway (ignores missing metadata)
    if (typeof finalValue === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(finalValue)) {
      try {
        return (
          <span className="tabular-nums text-muted-foreground">
            {formatDateInTimezone(
              parseTimestampAsUtc(finalValue),
              { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' },
              DEFAULT_DISPLAY_TIMEZONE,
            )}
          </span>
        );
      } catch { /* ignore */ }
    }

    if (type === 'boolean') return finalValue ? 'Yes' : 'No';
    if (type === 'number') return <span className="tabular-nums font-medium">{String(finalValue)}</span>;
    return String(finalValue);
  };

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;
  const currentPage = data?.page || 1;

  // Generate page number buttons
  const getPageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '...')[] = [];
    if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
    return pages;
  };

  const reportLabel = REPORT_LABELS[reportType] || REPORT_LABELS.feedback;
  const recordLabel = RECORD_LABELS[reportType] || RECORD_LABELS.feedback;

  return (
    <div className="flex flex-col h-full bg-background rounded-tl-xl border-l shadow-inner relative">
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-20 bg-background/60 backdrop-blur-[2px] flex items-center justify-center rounded-tl-xl">
          <div className={`flex items-center gap-3 px-5 py-3 rounded-full bg-card border shadow-lg`}>
            <Loader2 className={`h-5 w-5 animate-spin ${accentText}`} />
            <span className="text-sm font-medium text-muted-foreground">Loading data…</span>
          </div>
        </div>
      )}

      {/* Table Sub-Header */}
      <div className={`flex items-center justify-between px-5 py-3.5 border-b ${accentBorder} bg-card/60 shrink-0`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${accentGradient} flex items-center justify-center shadow-sm`}>
            <Calendar className="w-4.5 h-4.5 text-white" strokeWidth={2} />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground leading-tight">{reportLabel}</p>
            {data && (
              <p className="text-xs text-muted-foreground">
                <span className={`font-semibold ${accentText}`}>{data.total.toLocaleString()}</span> {recordLabel} found
              </p>
            )}
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
          <Input
            placeholder="Search results…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 w-52 text-sm bg-muted/30 border-border/50 focus-visible:ring-1 focus-visible:ring-offset-0 rounded-full"
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 w-full relative overflow-auto custom-scrollbar">
        <div className="w-auto min-w-full inline-block align-middle p-4">
          <div className="border rounded-xl shadow-sm bg-card overflow-hidden">
            <Table>
              <TableHeader className="sticky top-0 z-10">
                <TableRow className={`bg-gradient-to-r ${tableHeaderGradient} border-b ${accentBorder}`}>
                  {config.columns.map(colId => {
                    const normalizedColId = colId.toLowerCase();
                    const colDef = metadata.columns[normalizedColId] || metadata.columns[colId];
                    const isSorted = config.sort?.column === colId;
                    return (
                      <TableHead
                        key={colId}
                        className={`cursor-pointer whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-colors
                          ${isSorted ? accentText : 'text-muted-foreground/70 hover:text-foreground'}`}
                        onClick={() => handleSort(colId)}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{colDef?.label || generateFallbackLabel(colId)}</span>
                          {isSorted ? (
                            <span className={`${accentText}`}>
                              {config.sort?.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                            </span>
                          ) : (
                            <ArrowUp className="w-3 h-3 opacity-0 group-hover:opacity-40" />
                          )}
                        </div>
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {error ? (
                  <TableRow>
                    <TableCell colSpan={config.columns.length} className="h-48 text-center text-red-400">
                      {error}
                    </TableCell>
                  </TableRow>
                ) : filteredData.length > 0 ? (
                  filteredData.map((row, index) => (
                    <TableRow
                      key={index}
                      className={`transition-colors hover:bg-muted/30 border-b border-border/30 ${index % 2 === 0 ? '' : 'bg-muted/5'}`}
                    >
                      {config.columns.map(colId => {
                        const normalizedColId = colId.toLowerCase();
                        const type = metadata.columns[normalizedColId]?.type || metadata.columns[colId]?.type || 'string';
                        return (
                          <TableCell key={colId} className="px-4 py-3 align-middle text-sm">
                            {renderCellContent(row[colId], type, normalizedColId, row)}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={config.columns.length} className="h-[360px]">
                      <div className="flex flex-col items-center justify-center text-muted-foreground h-full space-y-3">
                        <div className={`h-14 w-14 ${accentBg} rounded-full flex items-center justify-center`}>
                          <FileX className={`h-7 w-7 ${accentText} opacity-70`} />
                        </div>
                        <p className="text-base font-semibold">No results found</p>
                        <p className="text-sm text-muted-foreground/60">Try adjusting your filters or date range.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Pagination Footer */}
      <div className="border-t bg-card/80 px-5 py-3 flex items-center justify-between sticky bottom-0 z-20 shrink-0 backdrop-blur-sm">
        <div className="text-xs text-muted-foreground font-medium flex items-center gap-4">
          <span>
            Showing <span className="text-foreground font-semibold">{data?.data.length ? ((currentPage - 1) * (data?.pageSize || 25)) + 1 : 0}</span>
            {' – '}
            <span className="text-foreground font-semibold">{data?.data.length ? ((currentPage - 1) * (data?.pageSize || 25)) + (data?.data.length || 0) : 0}</span>
            {' of '}
            <span className="text-foreground font-semibold">{(data?.total || 0).toLocaleString()}</span> results
          </span>
          <div className="hidden sm:flex items-center gap-1.5 border-l pl-4 border-border/50">
            <span className="text-xs text-muted-foreground/60 uppercase tracking-wider">Rows:</span>
            {[25, 50, 100].map(size => (
              <button
                key={size}
                onClick={() => onPageSizeChange(size)}
                className={`text-xs px-2.5 py-1 rounded-full transition-all font-medium ${
                  config.pageSize === size
                    ? `bg-gradient-to-r ${accentGradient} text-white shadow-sm`
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!data || currentPage <= 1 || loading}
            className="h-8 px-2.5 rounded-full text-muted-foreground hover:text-foreground gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="text-xs">Prev</span>
          </Button>

          <div className="flex items-center gap-1 mx-1">
            {getPageNumbers().map((p, idx) =>
              p === '...' ? (
                <span key={`ellipsis-${idx}`} className="w-8 text-center text-xs text-muted-foreground/50">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => onPageChange(p as number)}
                  className={`w-8 h-8 rounded-full text-xs font-semibold transition-all ${
                    p === currentPage
                      ? `bg-gradient-to-r ${accentGradient} text-white shadow-sm`
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {p}
                </button>
              )
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!data || currentPage >= totalPages || loading}
            className="h-8 px-2.5 rounded-full text-muted-foreground hover:text-foreground gap-1"
          >
            <span className="text-xs">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
