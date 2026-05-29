import React, { useState, useEffect } from 'react';
import { ReportMetadata, GenerateReportRequest, ReportFilter, reportsApi } from '@/lib/api/reports';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Filter as FilterIcon, Columns, CalendarDays, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { getReportTheme } from './reportTheme';

type FilterOperator = 'in' | 'like' | 'eq' | 'gte' | 'lte';

interface Props {
  reportType: string;
  metadata: ReportMetadata;
  selectedColumns: string[];
  onChangeColumns: (cols: string[]) => void;
  dateRange: GenerateReportRequest['dateRange'];
  onChangeDateRange: (dr: GenerateReportRequest['dateRange']) => void;
  filters: ReportFilter[];
  onChangeFilters: (f: ReportFilter[]) => void;
}

const DATE_PRESETS = [
  { label: 'Last 7 days', key: '7d' },
  { label: 'Last 30 days', key: '30d' },
  { label: 'This Month', key: 'month' },
  { label: 'Custom', key: 'custom' },
] as const;

type PresetKey = typeof DATE_PRESETS[number]['key'];

function getPresetDates(key: PresetKey): { from: string; to: string } | null {
  const today = new Date();
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
  if (key === '7d') return { from: fmt(subDays(today, 7)), to: fmt(today) };
  if (key === '30d') return { from: fmt(subDays(today, 30)), to: fmt(today) };
  if (key === 'month') return { from: fmt(startOfMonth(today)), to: fmt(endOfMonth(today)) };
  return null;
}

export default function ConfigurationPanel({
  reportType,
  metadata,
  selectedColumns,
  onChangeColumns,
  dateRange,
  onChangeDateRange,
  filters,
  onChangeFilters,
}: Props) {
  const [activeTab, setActiveTab] = useState<'columns' | 'filters'>('columns');
  const [activePreset, setActivePreset] = useState<PresetKey | null>(null);

  const [newFilterColumn, setNewFilterColumn] = useState('');
  const [newFilterOp, setNewFilterOp] = useState<FilterOperator>('eq');
  const [newFilterValue, setNewFilterValue] = useState('');

  const colDef = metadata.columns[newFilterColumn];
  const colType = colDef?.type || 'string';

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const theme = getReportTheme(reportType);
  const { accentGradient, accentText, accentBorder, accentBg, accentBadge, accentTabActive, accentColSelected, accentFilterBorder, panelHeaderGradient, spinnerColor } = theme;

  useEffect(() => {
    if (!newFilterColumn || newFilterValue.length < 2) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await reportsApi.getReportSuggestions(reportType, newFilterColumn, newFilterValue);
        setSuggestions(res.values.filter(v => v !== null));
      } catch { setSuggestions([]); }
      finally { setIsSearching(false); }
    }, 500);
    return () => clearTimeout(timer);
  }, [reportType, newFilterColumn, newFilterValue]);

  const handlePreset = (key: PresetKey) => {
    setActivePreset(key);
    if (key === 'custom') return;
    const dates = getPresetDates(key);
    if (dates) {
      onChangeDateRange({
        column: dateRange?.column || metadata.dateColumns[0],
        ...dates,
      });
    }
  };

  const handleToggleColumn = (col: string) => {
    if (selectedColumns.includes(col)) {
      if (selectedColumns.length === 1) return;
      onChangeColumns(selectedColumns.filter(c => c !== col));
    } else {
      onChangeColumns([...selectedColumns, col]);
    }
  };

  const handleAddFilter = () => {
    if (!newFilterColumn || (!newFilterValue && newFilterOp !== 'in')) return;
    const filter: ReportFilter = { column: newFilterColumn, operator: newFilterOp };
    if (newFilterOp === 'in') {
      filter.values = newFilterValue.split(',').map(v => v.trim()).filter(v => v !== '');
    } else {
      filter.value = colType === 'number' ? Number(newFilterValue) : newFilterValue;
    }
    onChangeFilters([...filters, filter]);
    setNewFilterColumn('');
    setNewFilterValue('');
    setSuggestions([]);
  };

  const removeFilter = (index: number) => {
    const copy = [...filters];
    copy.splice(index, 1);
    onChangeFilters(copy);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Panel Header */}
      <div className={`px-5 py-4 border-b border-border/50 bg-gradient-to-r ${panelHeaderGradient} shrink-0`}>
        <h3 className="font-bold text-base text-foreground tracking-tight">Configuration</h3>
        <p className="text-xs text-muted-foreground/70 mt-0.5">Customize columns, dates & filters</p>
      </div>

      {/* Date Range */}
      {metadata.dateColumns.length > 0 && (
        <div className="px-5 py-4 border-b border-border/50 space-y-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded-md bg-gradient-to-br ${accentGradient} flex items-center justify-center`}>
              <CalendarDays className="w-3 h-3 text-white" />
            </div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date Range</Label>
          </div>

          {metadata.dateColumns.length > 1 && (
            <Select
              value={dateRange?.column || metadata.dateColumns[0]}
              onValueChange={(val) => onChangeDateRange({ ...dateRange, column: val, from: dateRange?.from || '', to: dateRange?.to || '' })}
            >
              <SelectTrigger className="w-full h-8 text-sm">
                <SelectValue placeholder="Date Column" />
              </SelectTrigger>
              <SelectContent>
                {metadata.dateColumns.map(c => (
                  <SelectItem key={c} value={c}>{metadata.columns[c]?.label || c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Quick Presets */}
          <div className="grid grid-cols-2 gap-1.5">
            {DATE_PRESETS.map(preset => (
              <button
                key={preset.key}
                onClick={() => handlePreset(preset.key)}
                className={`h-7 rounded-full text-xs font-medium transition-all border ${activePreset === preset.key
                    ? `bg-gradient-to-r ${accentGradient} text-white border-transparent shadow-sm`
                    : 'bg-muted/40 hover:bg-muted text-muted-foreground border-border/50 hover:text-foreground'
                  }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom date inputs */}
          {(activePreset === 'custom' || (!activePreset && (dateRange?.from || dateRange?.to))) && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground/70">From</Label>
                <Input type="date" className="h-8 text-xs px-2 w-full" value={dateRange?.from || ''} onChange={(e) => onChangeDateRange({
                  column: dateRange?.column || metadata.dateColumns[0],
                  from: e.target.value,
                  to: dateRange?.to || ''
                })} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground/70">To</Label>
                <Input type="date" className="h-8 text-xs px-2 w-full" value={dateRange?.to || ''} onChange={(e) => onChangeDateRange({
                  column: dateRange?.column || metadata.dateColumns[0],
                  from: dateRange?.from || '',
                  to: e.target.value
                })} />
              </div>
            </div>
          )}

          {dateRange?.from && (
            <button
              className="text-[11px] text-muted-foreground/60 hover:text-red-500 transition-colors w-full text-center"
              onClick={() => { onChangeDateRange(undefined); setActivePreset(null); }}
            >
              Clear date filter
            </button>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border/50 bg-muted/10 shrink-0">
        <button
          className={`flex-1 py-2.5 text-xs font-semibold border-b-2 flex items-center justify-center gap-1.5 transition-colors ${activeTab === 'columns' ? accentTabActive : 'border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}
          onClick={() => setActiveTab('columns')}
        >
          <Columns className="w-3.5 h-3.5" />
          Columns
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === 'columns' ? accentBadge : 'bg-muted text-muted-foreground'}`}>
            {selectedColumns.length}
          </span>
        </button>
        <button
          className={`flex-1 py-2.5 text-xs font-semibold border-b-2 flex items-center justify-center gap-1.5 transition-colors ${activeTab === 'filters' ? accentTabActive : 'border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}
          onClick={() => setActiveTab('filters')}
        >
          <FilterIcon className="w-3.5 h-3.5" />
          Filters
          {filters.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === 'filters' ? accentBadge : 'bg-muted text-muted-foreground'}`}>
              {filters.length}
            </span>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
        {activeTab === 'columns' && (
          <div className="p-4 space-y-1">
            {Object.entries(metadata.columns).map(([key, col]) => (
              <label
                key={key}
                className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${selectedColumns.includes(key)
                    ? accentColSelected
                    : 'border-transparent hover:bg-muted/40'
                  }`}
              >
                <Checkbox
                  id={`col-${key}`}
                  checked={selectedColumns.includes(key)}
                  onCheckedChange={() => handleToggleColumn(key)}
                  disabled={selectedColumns.length === 1 && selectedColumns.includes(key)}
                />
                <div className="flex flex-1 items-center justify-between min-w-0">
                  <span className="text-sm font-medium truncate">{col?.label || key}</span>
                  <span className="text-[9px] uppercase tracking-widest text-muted-foreground/50 font-semibold ml-2 shrink-0">{col?.type || 'UNKNOWN'}</span>
                </div>
              </label>
            ))}
          </div>
        )}

        {activeTab === 'filters' && (
          <div className="p-4 space-y-5">
            {/* Add Filter */}
            <div className={`space-y-3 bg-muted/10 p-4 rounded-xl border border-border/40 relative overflow-hidden`}>
              <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${accentGradient}`} />
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pl-1">Add Filter</p>

              <Select value={newFilterColumn} onValueChange={setNewFilterColumn}>
                <SelectTrigger className="w-full h-8 text-sm bg-background"><SelectValue placeholder="Select Column" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(metadata.columns).map(([key, col]) => (
                    <SelectItem key={key} value={key}>{col?.label || key}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Select value={newFilterOp} onValueChange={(v) => setNewFilterOp(v as FilterOperator)}>
                  <SelectTrigger className="bg-background w-[100px] shrink-0 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eq">Equals</SelectItem>
                    {colType === 'string' && <SelectItem value="like">Contains</SelectItem>}
                    {(colType === 'number' || colType === 'date') && (
                      <>
                        <SelectItem value="gte">≥</SelectItem>
                        <SelectItem value="lte">≤</SelectItem>
                      </>
                    )}
                    {colType !== 'date' && <SelectItem value="in">In List</SelectItem>}
                  </SelectContent>
                </Select>
                <div className="flex-1 relative">
                  <Input
                    type={colType === 'date' ? 'date' : colType === 'number' ? 'number' : 'text'}
                    className="bg-background w-full h-8 text-sm"
                    placeholder="Value…"
                    value={newFilterValue}
                    onChange={(e) => setNewFilterValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddFilter()}
                  />
                  {suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-md shadow-lg max-h-[180px] overflow-y-auto custom-scrollbar">
                      {suggestions.map((s, idx) => (
                        <button key={idx} className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                          onClick={() => { setNewFilterValue(s); setSuggestions([]); }}>
                          {String(s)}
                        </button>
                      ))}
                    </div>
                  )}
                  {isSearching && (
                    <div className="absolute right-2 top-2">
                    <div className={`animate-spin rounded-full h-4 w-4 border-b-2 ${spinnerColor}`} />
                    </div>
                  )}
                </div>
              </div>

              <Button
                onClick={handleAddFilter}
                disabled={!newFilterColumn || (!newFilterValue && newFilterOp !== 'in')}
                className={`w-full h-8 gap-1.5 text-xs font-semibold bg-gradient-to-r ${accentGradient} text-white hover:opacity-90 shadow-sm transition-opacity`}
              >
                <Plus className="w-3.5 h-3.5" /> Add Filter
              </Button>

              {filters.length === 0 && (
                <p className="text-[10px] text-center text-muted-foreground/50">Example: Area = Patio, Covers &gt; 4</p>
              )}
            </div>

            {/* Active Filters */}
            {filters.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold px-1">Active Filters</p>
                {filters.map((f, i) => (
                  <div key={i} className={`flex items-center justify-between p-3 rounded-xl border bg-card border-l-4 ${accentFilterBorder} shadow-sm`}>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground/80 truncate">{metadata.columns[f.column]?.label || f.column}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-mono bg-muted/60 px-1.5 py-0.5 rounded text-muted-foreground uppercase">{f.operator}</span>
                        <span className={`text-xs font-semibold truncate ${accentText}`}>{f.value ?? f.values?.join(', ')}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFilter(i)}
                      className="ml-2 shrink-0 text-muted-foreground/40 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 p-1 rounded-full transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}