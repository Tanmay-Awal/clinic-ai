import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Copy, Check, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CategoryPanelProps {
  category: string;
  data: Record<string, any>;
}

export function CategoryPanel({ category, data }: CategoryPanelProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);


  const getCategoryTitle = () => {
    const categoryLower = category?.toLowerCase() || '';
    switch (categoryLower) {
      case 'reservation':
        return 'Reservation Details';
      case 'sales':
        return 'Sales Lead Info';
      case 'feedback':
        return 'Feedback Details';
      case 'support':
        return 'Support Details';
      case 'enquiry':
        return 'Enquiry Details';
      case 'general':
        return 'General Details';
      default:
        return 'Details';
    }
  };

  // Get category-specific fields to display (only category-specific operational fields, not duplicates from AIInsightsCard)
  // Get category-specific fields to display (only category-specific operational fields, not duplicates from AIInsightsCard)
  const getCategoryFields = useMemo(() => {
    const categoryLower = category?.toLowerCase() || '';
    const fields: Array<{ key: string; label: string; order: number }> = [];

    // Helper to format label
    const formatLabel = (k: string) => k.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    // Check for Enquiry or General (explicit category or reservation type)
    const reservationType = data.reservation_type || data.reservationType;
    const typeLower = String(reservationType || '').toLowerCase();

    // Check if this is a cancellation
    const isCancellation = typeLower.includes('cancel') ||
      String(data.confirmation_status || '').toLowerCase().includes('cancel');

    // Treat "Enquiry" and "General" reservations similarly - show all details (including nulls if needed)
    const showAllDetails = categoryLower === 'enquiry' ||
      (categoryLower === 'reservation' && (typeLower.includes('enquiry') || typeLower.includes('general')));

    if (showAllDetails) {
      // Show ALL fields, including nulls
      const priorityFields: Record<string, number> = {
        guest_name: 1,
        party_size: 2,
        number_of_guests: 2,
        check_in_date: 3,
        booking_date: 5,
        booking_time: 5.1,
        allergies: 6,
        special_requirements: 7,
        request_type: 8,
        issue_summary: 9,
        description: 10,
        purpose: 11,
        is_important: 12,
        items: 13,
      };

      Object.keys(data).forEach((key) => {
        // Skip keys strictly handled in AIInsightsCard to avoid redundancy
        // Also skip reservation_type since it's redundant to show it as a field when it's the category
        const keysToSkip = ['call_summary', 'notes', 'user_sentiment', 'sentiment', 'sentiment_percentage', 'sentiment_meter', 'reservation_type', 'feedback_type', 'call_outcome'];

        // Specific hiding rules:
        // For Enquiry: Hide 'is_important' and 'items'
        // For General: Show them (do not add to skip list)
        const isStrictlyEnquiry = categoryLower === 'enquiry' || typeLower.includes('enquiry');

        if (isStrictlyEnquiry) {
          keysToSkip.push('is_important', 'items');
        }

        if (keysToSkip.includes(key)) return;

        // Note: We DO NOT skip empty/null values for Enquiry/General as per request
        const order = priorityFields[key] || 99;

        let label = formatLabel(key);
        if (isCancellation) {
          if (key === 'booking_date') label = 'Cancel Date';
          if (key === 'booking_time') label = 'Cancel Time';
        }

        fields.push({ key, label, order });
      });

      return fields.sort((a, b) => a.order - b.order);
    }

    // Reservation-specific fields - show only specified fields
    if (categoryLower === 'reservation') {
      // Guest Name - Skip as it's in header

      // Party Size - check both party_size and number_of_guests, prefer party_size
      if ('party_size' in data) {
        fields.push({ key: 'party_size', label: 'Party Size', order: 2 });
      } else if ('number_of_guests' in data) {
        fields.push({ key: 'number_of_guests', label: 'Party Size', order: 2 });
      }

      // Check In Date
      if ('check_in_date' in data) fields.push({ key: 'check_in_date', label: 'Check In Date', order: 3 });

      // Check Out Date
      if ('check_out_date' in data) fields.push({ key: 'check_out_date', label: 'Check Out Date', order: 4 });

      // Booking Date
      if ('booking_date' in data) fields.push({ key: 'booking_date', label: isCancellation ? 'Cancel Date' : 'Booking Date', order: 5 });

      // Booking Time
      if ('booking_time' in data) fields.push({ key: 'booking_time', label: isCancellation ? 'Cancel Time' : 'Booking Time', order: 5.1 });

      // Room Type Requested
      if ('room_type_requested' in data) fields.push({ key: 'room_type_requested', label: 'Room Type', order: 7 });

      // Booking Status
      if ('booking_status' in data) fields.push({ key: 'booking_status', label: 'Booking Status', order: 8 });

      // Deposit Paid
      if ('deposit_paid' in data) fields.push({ key: 'deposit_paid', label: 'Deposit Paid', order: 9 });

      // Confirmation Status
      if ('confirmation_status' in data) fields.push({ key: 'confirmation_status', label: 'Confirmation Status', order: 10 });
    }

    // Sales-specific fields (add as needed)
    if (categoryLower === 'sales') {
      // Add sales-specific fields here
    }

    // Feedback-specific fields
    if (categoryLower === 'feedback') {
      // 1. Core Sentiment & Recommendation
      if ('rating' in data) fields.push({ key: 'rating', label: 'Rating', order: 2 });
      if ('recommended' in data) fields.push({ key: 'recommended', label: 'Recommended', order: 3 });

      // 2. Feedback Taxonomy
      if ('feedback_topic' in data) fields.push({ key: 'feedback_topic', label: 'Feedback Topic', order: 5 });

      // 3. Operational Outcome
      if ('guest_engagement' in data) fields.push({ key: 'guest_engagement', label: 'Engagement', order: 7 });
      if ('rebooking' in data) fields.push({ key: 'rebooking', label: 'Rebooking Info', order: 8 });

      // 4. Context
      if ('visit_type' in data) fields.push({ key: 'visit_type', label: 'Visit Type', order: 11 });
      if ('location' in data && data.location && data.location !== 'null') {
        fields.push({ key: 'location', label: 'Location', order: 12 });
      }

      // 5. Detailed Analysis
      if ('summary' in data) fields.push({ key: 'summary', label: 'Summary Points', order: 13 });
      if ('positives' in data) fields.push({ key: 'positives', label: 'Positives', order: 14 });
      if ('negatives' in data) fields.push({ key: 'negatives', label: 'Negatives', order: 15 });
      if ('aspects' in data) fields.push({ key: 'aspects', label: 'Aspects', order: 16 });

      // 6. Metadata
      if ('call_successful' in data) fields.push({ key: 'call_successful', label: 'AI Processing Success', order: 17 });
      if ('created_at' in data) fields.push({ key: 'created_at', label: 'Created At', order: 18 });
    }

    // Support-specific fields
    // Show all fields even if null (will display "N/A")
    if (categoryLower === 'support') {
      if ('guest_phone' in data) fields.push({ key: 'guest_phone', label: 'Guest Phone', order: 2 });
      if ('priority_level' in data) fields.push({ key: 'priority_level', label: 'Priority Level', order: 5 });
      if ('urgency' in data) fields.push({ key: 'urgency', label: 'Urgency', order: 6 });
      if ('completion_status' in data) fields.push({ key: 'completion_status', label: 'Completion Status', order: 7 });
      if ('assigned_to_staff' in data) fields.push({ key: 'assigned_to_staff', label: 'Assigned To', order: 8 });
      if ('requested_time' in data) fields.push({ key: 'requested_time', label: 'Requested Time', order: 9 });
    }

    // General-specific or fallback fields
    if (categoryLower === 'general' || fields.length === 0) {
      // Prioritize these fields
      const priorityFields: Record<string, number> = {
        is_important: 1,
        user_sentiment: 2,
        sentiment: 3,
        issue_summary: 4,
        purpose: 5,
        request_type: 6,
        items: 7,
        notes: 8,
        description: 9,
        call_summary: 10,
        guest_name: 11,
        name: 12,
        // contact_number: 13,
        location: 14,
        time: 15,
        created_at: 16,
      };

      Object.keys(data).forEach((key) => {
        // Skip keys that we want to ignore entirely
        // Skip keys that we want to ignore entirely
        // For General category, skip fields that duplicate AIInsightsCard
        if (key === 'call_summary' || key === 'notes' || key === 'user_sentiment' || key === 'sentiment' || key === 'sentiment_percentage' || key === 'sentiment_meter' || key === 'feedback_type' || key === 'call_outcome') return;

        // SKIP EMPTY/NULL VALUES STRICTLY FOR GENERAL CATEGORY
        // If value is null, undefined, empty string, empty array, or empty object -> SKIP
        const value = data[key];
        let isEmpty = false;

        if (value === null || value === undefined) isEmpty = true;
        else if (typeof value === 'string' && value.trim() === '') isEmpty = true;
        else if (Array.isArray(value) && value.length === 0) isEmpty = true;
        else if (typeof value === 'object' && Object.keys(value).length === 0) isEmpty = true;

        if (isEmpty) return;

        // Skip fields that are already handled in AIInsightsCard to avoid duplication if needed
        // But the user asked to "show all data", so we will show all.
        const order = priorityFields[key] || 99;
        const label = key
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        // Avoid duplicates if we already added fields (in case of fallback)
        if (!fields.some(f => f.key === key)) {
          fields.push({ key, label, order });
        }
      });
    }

    // Sort by order
    return fields.sort((a, b) => a.order - b.order);
  }, [category, data]);


  const formatFieldName = (key: string) => {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const renderFieldValue = (key: string, value: any) => {
    // Treat "null" string as Not Provided
    if (value === 'null') {
      return <span className="text-sm text-muted-foreground italic">Not Provided</span>;
    }

    // Handle arrays (like top_queries, positives, negatives, summary, items, key_entities)
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-sm text-muted-foreground italic">None</span>;
      }

      // Special handling for key_entities array (array of objects with type and value)
      if (key === 'key_entities') {
        return (
          <div className="space-y-2">
            {value.map((entity: { type?: string; value?: string }, index: number) => (
              <div key={index} className="flex items-start gap-2">
                <span className="text-xs text-muted-foreground mt-0.5 capitalize min-w-[80px]">
                  {entity?.type || 'N/A'}:
                </span>
                <span className="text-sm text-foreground/85 flex-1">{entity?.value || 'N/A'}</span>
              </div>
            ))}
          </div>
        );
      }

      // Special handling for objects in arrays (like items)
      if (typeof value[0] === 'object' && value[0] !== null) {
        return (
          <div className="space-y-3 mt-2">
            {value.map((item: Record<string, any>, index: number) => (
              <div key={index} className="flex flex-col gap-1.5 p-3 rounded-lg border border-border">
                {/* Ensure Name is first if it exists */}
                {item.name && (
                  <div className="flex flex-col gap-0.5 mb-1">
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                      Name
                    </span>
                    <span className="text-sm text-foreground/90">{String(item.name)}</span>
                  </div>
                )}

                {/* Description second */}
                {item.description && (
                  <div className="flex flex-col gap-0.5 mb-1">
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                      Description
                    </span>
                    <span className="text-sm text-foreground/90 leading-relaxed text-muted-foreground">{String(item.description)}</span>
                  </div>
                )}

                {/* Other fields */}
                {Object.entries(item).map(([k, v]) => {
                  if (k.toLowerCase() === 'name' || k.toLowerCase() === 'description') return null; // Already rendered
                  if (k === 'quantity' && String(v) === '1') return null; // Hide quantity 1

                  return (
                    <div key={k} className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                        {k.replace(/_/g, ' ')}
                      </span>
                      <span className="text-sm text-foreground/90">{String(v)}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        );
      }

      // Default array rendering (for positives, negatives, summary, etc.)
      return (
        <div className="space-y-2">
          {value.map((item: any, index: number) => (
            <div key={index} className="flex items-start gap-2">
              <span className="text-xs text-muted-foreground mt-0.5">{index + 1}.</span>
              <span className="text-sm text-foreground/85 flex-1">{String(item)}</span>
            </div>
          ))}
        </div>
      );
    }

    // Handle Allergies and Special Requirements (Highlighting with Badge)
    if (key === 'allergies' || key === 'special_requirements') {
      const isNone = !value || value === 'None' || value === 'none' || (Array.isArray(value) && value.length === 0);

      if (isNone) {
        return <span className="text-sm text-muted-foreground italic">None</span>;
      }

      const displayValue = Array.isArray(value) ? value.join(', ') : String(value);

      return (
        <Badge
          variant="outline"
          className="bg-red-500/10 border-red-500/30 text-red-400 py-1 px-2 h-auto text-left whitespace-normal"
        >
          {displayValue}
        </Badge>
      );
    }

    // Handle is_important specifically
    if (key === 'is_important') {
      return (
        <Badge
          className={value ? 'bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30' : 'bg-accent/50 text-muted-foreground border-border hover:bg-accent'}
        >
          {value ? 'Important' : 'Normal'}
        </Badge>
      );
    }

    // Handle rebooking specifically
    if (key === 'rebooking' && typeof value === 'object' && value !== null) {
      return (
        <div className="space-y-2 p-3 rounded-lg border border-border bg-accent/50">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Status:</span>
            <Badge variant="outline" className={cn(
              "text-[10px] h-5",
              value.accepted ? "border-green-500/30 text-green-400 bg-green-500/5" :
                value.offered ? "border-yellow-500/30 text-yellow-400 bg-yellow-500/5" : ""
            )}>
              {value.accepted ? 'Accepted' : value.offered ? 'Declined' : 'No Offer'}
            </Badge>
          </div>
          {value.date && (
            <div className="flex justify-between items-baseline gap-2">
              <span className="text-xs text-muted-foreground">Date:</span>
              <span className="text-xs text-foreground/90">{value.date}</span>
            </div>
          )}
          {value.declined_reason && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Reason:</span>
              <span className="text-xs text-muted-foreground leading-relaxed italic">"{value.declined_reason}"</span>
            </div>
          )}
        </div>
      );
    }

    // Handle sentiment_percentage specifically
    if (key === 'sentiment_percentage') {
      let percentage = 0;
      let colorClass = 'bg-primary';

      // Attempt to parse percentage
      if (typeof value === 'number') {
        percentage = value;
      } else if (typeof value === 'string') {
        percentage = parseFloat(value);
      }

      // Normalize to 0-100 if it's 0-1
      if (percentage <= 1 && percentage > 0) percentage *= 100;
      if (isNaN(percentage)) percentage = 0;

      // Determine color based on score (assuming 0-100, high is positive?) 
      // OR usually sentiment analysis gives positive %, negative %, etc.
      // If it's a single number, we'll assume it's positive sentiment score.
      if (percentage >= 60) colorClass = 'bg-green-500';
      else if (percentage <= 40) colorClass = 'bg-red-500';
      else colorClass = 'bg-yellow-500';

      return (
        <div className="flex items-center gap-3 w-full max-w-[200px]">
          <Progress value={percentage} className="h-2" indicatorClassName={colorClass} />
          <span className="text-xs text-muted-foreground font-mono">{percentage.toFixed(0)}%</span>
        </div>
      );
    }

    // Handle user_sentiment and sentiment specifically
    // Use PROGRESS BAR like Feedback/Sentiment Meter
    if (key === 'user_sentiment' || key === 'sentiment') {
      const lowerVal = String(value).toLowerCase();

      // Determine score (0-100) and label
      let percentage = 50; // Default neutral
      let label = 'Neutral';
      let colorClass = 'bg-yellow-500';

      if (typeof value === 'number') {
        percentage = value <= 1 ? value * 100 : value;
      } else if (typeof value === 'string') {
        const parsed = parseFloat(value);
        if (!isNaN(parsed)) {
          percentage = parsed <= 1 ? parsed * 100 : parsed;
        } else {
          // Handle text values
          if (lowerVal === 'positive') percentage = 80;
          else if (lowerVal === 'negative') percentage = 20;
          else percentage = 50;
        }
      }

      // Determine label and color based on percentage
      if (percentage >= 60) {
        label = 'Positive';
        colorClass = 'bg-green-500';
      } else if (percentage <= 40) {
        label = 'Negative';
        colorClass = 'bg-red-500';
      } else {
        label = 'Neutral';
        colorClass = 'bg-yellow-500';
      }

      // Format display value: e.g. "0.50 (Neutral)" or "0.70 (Positive)"
      // If original value was a number or numeric string, show it.
      const displayValue = !isNaN(parseFloat(String(value)))
        ? parseFloat(String(value)).toFixed(2)
        : String(value);

      // Avoid redundancy: if displayValue is same as label (case-insensitive), don't show label
      const showLabel = displayValue.toLowerCase() !== label.toLowerCase();

      return (
        <div className="flex items-center gap-3 w-full max-w-[300px]">
          <Progress value={percentage} className="h-2 flex-1" indicatorClassName={colorClass} />
          <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
            {displayValue}{showLabel ? ` (${label})` : ''}
          </span>
        </div>
      );
    }

    // Handle boolean values
    if (typeof value === 'boolean') {
      return (
        <Badge variant={value ? 'default' : 'outline'} className="text-xs">
          {value ? 'Yes' : 'No'}
        </Badge>
      );
    }

    // Handle null/undefined
    if (value === null || value === undefined) {
      return <span className="text-sm text-muted-foreground italic">N/A</span>;
    }

    // Handle objects
    if (typeof value === 'object' && value !== null) {
      // Check if it's an empty object
      if (Object.keys(value).length === 0) {
        return <span className="text-sm text-muted-foreground italic">N/A</span>;
      }

      // Special handling for aspects object (sentiment scores)
      if (key === 'aspects') {
        return (
          <div className="space-y-2">
            {Object.entries(value).map(([aspect, info]: [string, any]) => (
              <div key={aspect} className="flex flex-col gap-1 p-2 rounded border border-border bg-accent/50">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{aspect}</span>
                  {info?.sentiment && (
                    <Badge variant="outline" className={cn(
                      "text-[9px] h-4 px-1.5",
                      info.sentiment === 'positive' ? "border-green-500/30 text-green-400 bg-green-500/5" :
                        info.sentiment === 'negative' ? "border-red-500/30 text-red-400 bg-red-500/5" :
                          "border-border text-muted-foreground"
                    )}>
                      {info.sentiment}
                    </Badge>
                  )}
                </div>
                {info?.detail && (
                  <p className="text-xs text-muted-foreground leading-snug">{info.detail}</p>
                )}
                {typeof info !== 'object' && (
                  <span className="text-sm text-foreground/85 font-mono">{String(info)}</span>
                )}
              </div>
            ))}
          </div>
        );
      }

      return (
        <span className="text-sm text-muted-foreground font-mono">
          {JSON.stringify(value, null, 2)}
        </span>
      );
    }

    // Handle dates - show date only for check_in_date, check_out_date, booking_date
    if (key.includes('date') || key.includes('time') || key.includes('_at') || key.includes('requested_time')) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          // For check_in_date, check_out_date, booking_date (now that time is separate), show only date
          if (key === 'check_in_date' || key === 'check_out_date' || key === 'booking_date') {
            return (
              <span className="text-sm text-foreground/85">
                {date.toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit'
                })}
              </span>
            );
          }

          // For booking_time or other time fields
          if (key === 'booking_time' || key === 'requested_time') {
            // If it's just a time string like "18:30:00", parsing with new Date() might give invalid date or current date
            // Let's handle "HH:mm:ss" strings manually for better display
            if (typeof value === 'string' && value.includes(':')) {
              const parts = value.split(':');
              const hours = parseInt(parts[0], 10);
              const minutes = parseInt(parts[1], 10);
              const ampm = hours >= 12 ? 'PM' : 'AM';
              const h12 = hours % 12 || 12;
              return (
                <span className="text-sm text-foreground/85">
                  {h12}:{minutes.toString().padStart(2, '0')} {ampm}
                </span>
              );
            }
          }

          // For other dates, show date and time
          return (
            <span className="text-sm text-foreground/85">
              {date.toLocaleString(undefined, {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
              })}
            </span>
          );
        }
      } catch (e) {
        // Not a valid date, fall through to default
      }
    }

    // Default: string or number
    return (
      <span className="text-sm text-foreground/85">
        {String(value)}
      </span>
    );
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {getCategoryTitle()}
        </h3>
        {/* <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <div className="w-2 h-2 rounded-full bg-foreground animate-pulse" />
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleSync}
            className="text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Sync
          </Button>
        </div> */}
      </div>

      <dl className="space-y-3">
        {getCategoryFields.length > 0 ? (
          getCategoryFields.map(({ key, label }) => {
            const value = data[key];

            return (
              <div key={key} className="group">
                <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                  {label}
                </dt>
                <dd className="flex items-start justify-between gap-2">
                  <div
                    className="flex-1"
                  >
                    {renderFieldValue(key, value)}
                  </div>
                  <button
                    onClick={() => {
                      const copyValue = Array.isArray(value)
                        ? value.join('\n')
                        : value !== null && value !== undefined
                          ? String(value)
                          : 'N/A';
                      const handleCopyField = (val: string, k: string) => {
                        navigator.clipboard.writeText(val);
                        setCopiedField(k);
                        setTimeout(() => setCopiedField(null), 2000);
                      };
                      handleCopyField(copyValue, key);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity mt-0.5"
                  >
                    {copiedField === key ? (
                      <Check className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <Copy className="h-3 w-3 text-muted-foreground hover:text-muted-foreground" />
                    )}
                  </button>
                </dd>
              </div>
            );
          })
        ) : (
          <div className="text-sm text-muted-foreground italic py-4 text-center">
            No details available
          </div>
        )}
      </dl>
    </div>
  );
}
