import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, ChevronUp, Copy, Check, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIInsightsCardProps {
  summary: string;
  sentimentScore: number;
  sentimentBreakdown?: { intro: number; mid: number; close: number };
  entities?: string[];
  actionItems?: string[];
  riskFlags?: string[];
  // Additional API fields
  userSentiment?: string | number | null; // Can be string label or numeric score
  sentimentPercentage?: string | number | null;
  sentimentMeter?: string | number | null; // Sentiment meter from API (e.g., "0.15", "0.17")
  callSuccessful?: boolean | null;
  topQueries?: string[] | null;
  location?: string | null;
  name?: string | null;
  contactNumber?: string | null;
  reservationType?: string | null;
  topAskClass?: string | null;
  maxBookingCategory?: string | null;
  notes?: string | null;
  specialRequests?: string | null;
  allergies?: string | string[] | null; // Added allergies field
  keyEntities?: Array<{ type: string; value: string }> | null; // Key entities from API
  roomNumber?: string | null; // Housekeeping: Room number
  requestType?: string | null; // Housekeeping: Request type
  assigned_to_staff?: string | null;
  requested_time?: string | null;
  // Feedback-specific fields
  feedbackType?: string | null;
  visitType?: string | null;
  callOutcome?: string | null;
  requiresAction?: boolean | null;
  actionType?: string | null;
  rebooking?: string | {
    date?: string | null;
    offered?: boolean | null;
    accepted?: boolean | null;
    party_size?: number | null;
    declined_reason?: string | null;
  } | null;
  guestEngagement?: string | null;
}

export function AIInsightsCard({
  summary,
  sentimentScore,
  sentimentBreakdown = { intro: 0.6, mid: 0.8, close: 0.9 },
  entities = [],
  actionItems = [],
  riskFlags = [],
  userSentiment,
  sentimentPercentage,
  sentimentMeter,
  callSuccessful,
  topQueries,
  location,
  name,
  contactNumber,
  reservationType,
  topAskClass,
  maxBookingCategory,
  notes,
  specialRequests,
  allergies,
  keyEntities,
  roomNumber,
  requestType,
  feedbackType,
  visitType,
  callOutcome,
  requiresAction,
  actionType,
  rebooking,
  guestEngagement,
}: AIInsightsCardProps) {
  const [expandedSummary, setExpandedSummary] = useState(false);
  const [copiedEntity, setCopiedEntity] = useState<string | null>(null);

  const getSentimentLabel = (score: number) => {
    if (score > 0.7) return 'Positive';
    if (score > 0.3) return 'Neutral';
    return 'Negative';
  };

  const handleCopyEntity = (entity: string) => {
    navigator.clipboard.writeText(entity);
    setCopiedEntity(entity);
    setTimeout(() => setCopiedEntity(null), 2000);
  };

  // Combine API entities with provided entities
  // Prioritize key_entities from API, then fallback to name/location/contactNumber, then provided entities
  const allEntities = useMemo(() => {
    const entityList: string[] = [];

    // First, use key_entities from API if available
    if (keyEntities && keyEntities.length > 0) {
      keyEntities.forEach(entity => {
        if (entity?.value) {
          entityList.push(entity.value);
        }
      });
    }
    // Finally, add provided entities
    entities.forEach(entity => {
      if (!entityList.includes(entity)) entityList.push(entity);
    });

    return entityList;
  }, [keyEntities, entities]);

  // Calculate risk flags
  const allRiskFlags = useMemo(() => {
    const flags = [...riskFlags];
    if (requiresAction) {
      if (!flags.includes('Action Required')) flags.push('Action Required');
    }
    return flags;
  }, [riskFlags, requiresAction]);

  // Use top_queries as action items if available
  const allActionItems = useMemo(() => {
    const items = [...actionItems];
    if (topQueries && topQueries.length > 0) {
      return topQueries;
    }
    if (actionType && !items.includes(actionType)) {
      items.push(actionType);
    }
    return items;
  }, [topQueries, actionItems, actionType]);

  // Calculate sentiment percentage for display
  const displaySentimentPercentage = useMemo(() => {
    if (sentimentPercentage !== null && sentimentPercentage !== undefined) {
      const percentage = typeof sentimentPercentage === 'string'
        ? parseFloat(sentimentPercentage)
        : sentimentPercentage;
      return isNaN(percentage) ? null : percentage;
    }
    return null;
  }, [sentimentPercentage]);

  // Get sentiment from API or calculated - handle both string and number
  const displaySentiment = useMemo(() => {
    if (userSentiment !== null && userSentiment !== undefined) {
      // If userSentiment is a string, use it directly
      if (typeof userSentiment === 'string' && userSentiment.trim() !== '') {
        return userSentiment === 'Unknown' ? 'N/A' : userSentiment;
      }
      // If userSentiment is a number, convert to label
      if (typeof userSentiment === 'number') {
        return getSentimentLabel(userSentiment);
      }
    }
    // Fallback to calculated sentiment from score
    return getSentimentLabel(sentimentScore);
  }, [userSentiment, sentimentScore]);

  // Calculate sentiment meter value for display
  // Only show if sentimentMeter is explicitly passed (no default fallback)
  // sentiment_meter is typically between 0 and 1 (or -1 and 1), where lower values = more negative
  const displaySentimentMeter = useMemo(() => {
    if (sentimentMeter !== null && sentimentMeter !== undefined) {
      const meter = typeof sentimentMeter === 'string' ? parseFloat(sentimentMeter) : sentimentMeter;
      return isNaN(meter) ? null : meter;
    }
    // No fallback - only show if explicitly passed
    return null;
  }, [sentimentMeter]);

  // Get sentiment label for meter display
  const meterSentimentLabel = useMemo(() => {
    if (displaySentimentMeter === null) return null;
    return getSentimentLabel(displaySentimentMeter);
  }, [displaySentimentMeter]);

  const summaryPoints = summary.includes('\n')
    ? summary.split('\n').map(s => s.replace(/^[•\-*]\s*/, '').trim()).filter(s => s.length > 0)
    : summary.split('. ').filter(s => s.length > 0);
  const displaySummary = expandedSummary ? summaryPoints : summaryPoints.slice(0, 3);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider section-heading-gradient pb-3 border-b border-border">
        AI Insights
      </h3>

      {/* Highlighted Feedback Info */}
      {(feedbackType || callOutcome) && (
        <div className="space-y-2 pt-1 pb-3 border-b border-border">
          {feedbackType && (
            <div className="flex items-center justify-between p-2 rounded-lg border border-border bg-card/30">
              <span className="text-xs font-medium text-foreground">Feedback Type</span>
              <Badge className="bg-blue-500/10 border-blue-500/30 text-blue-400 px-3 py-1 text-[11px] font-bold uppercase tracking-wide">
                {feedbackType}
              </Badge>
            </div>
          )}
          {callOutcome && (
            <div className="flex items-center justify-between p-2 rounded-lg border border-border bg-card/30">
              <span className="text-xs font-medium text-foreground">Call Outcome</span>
              <Badge className="bg-purple-500/10 border-purple-500/30 text-purple-400 px-3 py-1 text-[11px] font-bold uppercase tracking-wide">
                {callOutcome}
              </Badge>
            </div>
          )}
        </div>
      )}

      {/* Show insufficient data message when unsuccessful */}
      {callSuccessful === false && (
        <div className="flex items-center gap-2 pb-3 border-b border-border">
          <XCircle className="h-4 w-4 text-red-500" />
          <span className="text-xs font-medium text-red-500">Insufficient data or insights</span>
        </div>
      )}

      {/* Sentiment */}
      {displaySentimentPercentage !== null && callSuccessful !== false && (
        <div className="flex items-center gap-4 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                displaySentimentPercentage >= 70 ? "border-green-500/50 text-green-500" :
                  displaySentimentPercentage >= 40 ? "border-yellow-500/50 text-yellow-500" :
                    "border-red-500/50 text-red-500"
              )}
            >
              {displaySentiment} ({displaySentimentPercentage}%)
            </Badge>
          </div>
        </div>
      )}

      {/* Key Insights (Reservation-specific and Housekeeping) */}
      {(reservationType || topAskClass || maxBookingCategory || roomNumber || requestType) && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wider section-heading-gradient mb-3">
            Key Insights
          </p>
          <div className="space-y-2">
            {roomNumber && (
              <div className="flex items-center justify-between p-2 rounded-lg border border-border bg-card/30">
                <span className="text-xs font-medium text-foreground">Room No</span>
                <Badge variant="outline" className="text-xs font-bold">{roomNumber}</Badge>
              </div>
            )}
            {requestType && (
              <div className="flex items-center justify-between p-2 rounded-lg border border-border bg-card/30">
                <span className="text-xs font-medium text-foreground">Request Type</span>
                <Badge variant="outline" className="text-xs font-bold">{requestType}</Badge>
              </div>
            )}
            {reservationType && (
              <div className="flex items-center justify-between p-2 rounded-lg border border-border bg-card/30">
                <span className="text-xs font-medium text-foreground">Reservation Type</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs font-bold",
                    String(reservationType).toLowerCase().includes('cancellation')
                      ? "border-red-500/30 text-red-400 bg-red-500/5"
                      : ""
                  )}
                >
                  {reservationType}
                </Badge>
              </div>
            )}
            {/* {topAskClass && (
              <div className="flex items-center justify-between p-2 rounded-lg border border-border bg-card/30">
                <span className="text-xs text-muted-foreground">Top Ask Class</span>
                <span className="text-xs font-medium text-foreground">{topAskClass}</span>
              </div>
            )} */}
            {maxBookingCategory && (
              <div className="flex items-center justify-between p-2 rounded-lg border border-border bg-card/30">
                <span className="text-xs font-medium text-foreground">Booking Category</span>
                <span className="text-xs font-bold text-foreground">{maxBookingCategory}</span>
              </div>
            )}
            {visitType && (
              <div className="flex items-center justify-between p-2 rounded-lg border border-border bg-card/30">
                <span className="text-xs font-medium text-foreground">Visit Type</span>
                <Badge variant="outline" className="text-xs font-bold">{visitType}</Badge>
              </div>
            )}
            {guestEngagement && (
              <div className="flex items-center justify-between p-2 rounded-lg border border-border bg-card/30">
                <span className="text-xs font-medium text-foreground">Engagement</span>
                <Badge variant="outline" className="text-xs font-bold">{guestEngagement}</Badge>
              </div>
            )}
            {rebooking && (
              <div className="flex items-center justify-between p-2 rounded-lg border border-border bg-card/30">
                <span className="text-xs font-medium text-foreground">Rebooking</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs font-bold",
                    typeof rebooking === 'object' && rebooking?.accepted ? "border-green-500/30 text-green-400 bg-green-500/5" :
                      typeof rebooking === 'object' && rebooking?.offered && !rebooking?.accepted ? "border-yellow-500/30 text-yellow-400 bg-yellow-500/5" :
                        ""
                  )}
                >
                  {typeof rebooking === 'string'
                    ? rebooking
                    : rebooking.accepted
                      ? 'Accepted'
                      : rebooking.offered
                        ? 'Declined'
                        : 'No Offer'}
                </Badge>
              </div>
            )}
          </div>
        </div>
      )}

      {(notes || specialRequests || allergies) && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wider section-heading-gradient mb-3">
            Special Notes & Requests
          </p>
          <div className="space-y-4">
            {allergies && (
              <div>
                <span className="text-xs text-red-400 uppercase tracking-wider font-semibold">Allergies:</span>
                <div className="mt-1.5">
                  <Badge
                    variant="outline"
                    className="bg-red-500/10 border-red-500/30 text-red-400 py-1.5 px-3 h-auto text-sm whitespace-normal text-left font-medium"
                  >
                    {Array.isArray(allergies) ? allergies.join(', ') : String(allergies)}
                  </Badge>
                </div>
              </div>
            )}
            {notes && (
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Notes:</span>
                <p className="text-sm text-foreground mt-1 leading-relaxed">{notes}</p>
              </div>
            )}
            {specialRequests && (
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Special Requests:</span>
                <p className="text-sm text-foreground mt-1 leading-relaxed">{specialRequests}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wider section-heading-gradient mb-3">
            Summary
          </p>
          <ul className="space-y-2 mb-2">
            {displaySummary.map((point, i) => (
              <li key={i} className="text-sm text-foreground flex gap-2">
                <span className="text-muted-foreground">•</span>
                <span>{point}.</span>
              </li>
            ))}
          </ul>
          {summaryPoints.length > 3 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandedSummary(!expandedSummary)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {expandedSummary ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Show full summary
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Sentiment Meter - Only show if sentimentMeter is explicitly passed OR we have userSentiment */}
      {(displaySentimentMeter !== null || userSentiment) && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wider section-heading-gradient mb-3">
            Sentiment Meter
          </p>
          {(() => {
            // Logic to determine percentage and label for the meter
            // Prioritize displaySentimentMeter if available (0-1 typically)
            // Fallback to userSentiment if it can be parsed or mapped

            let percentage = 50;
            let label = 'Neutral';
            let colorClass = 'bg-yellow-500';
            let valToDisplay = '';

            if (displaySentimentMeter !== null) {
              percentage = displaySentimentMeter <= 1 ? displaySentimentMeter * 100 : displaySentimentMeter;
              valToDisplay = displaySentimentMeter.toFixed(2);
            } else if (userSentiment) {
              if (typeof userSentiment === 'number') {
                percentage = userSentiment <= 1 ? userSentiment * 100 : userSentiment;
                valToDisplay = typeof userSentiment === 'number' && userSentiment <= 1 ? userSentiment.toFixed(2) : String(userSentiment);
              } else if (typeof userSentiment === 'string') {
                const parsed = parseFloat(userSentiment);
                if (!isNaN(parsed)) {
                  percentage = parsed <= 1 ? parsed * 100 : parsed;
                  valToDisplay = parsed <= 1 ? parsed.toFixed(2) : String(parsed);
                } else {
                  const lower = userSentiment.toLowerCase();
                  if (lower === 'positive') percentage = 80;
                  else if (lower === 'negative') percentage = 20;
                  else percentage = 50;
                  valToDisplay = userSentiment; // Show text if text
                }
              }
            }

            // Determine label based on final percentage
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

            // Avoid redundancy: if valToDisplay is same as label (case-insensitive), don't show label
            const showLabel = valToDisplay.toLowerCase() !== label.toLowerCase();

            return (
              <div className="flex items-center gap-3">
                <Progress value={percentage} className="h-2 flex-1" indicatorClassName={colorClass} />
                <span className="text-sm font-medium text-foreground whitespace-nowrap">
                  {valToDisplay}{showLabel ? ` (${label})` : ''}
                </span>
              </div>
            );
          })()}
        </div>
      )}

      {/* Key Entities */}
      {allEntities.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wider section-heading-gradient mb-3">
            Key Entities
          </p>
          <div className="flex flex-wrap gap-2">
            {allEntities.map((entity, i) => (
              <Badge
                key={i}
                variant="outline"
                className="text-xs border-border text-muted-foreground bg-accent/50 hover:bg-accent cursor-pointer"
                onClick={() => handleCopyEntity(entity)}
              >
                {entity}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Action Items / Top Queries */}
      {allActionItems.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wider section-heading-gradient mb-3">
            {topQueries && topQueries.length > 0 ? 'Top Queries' : 'Action Items'}
          </p>
          <div className="flex flex-wrap gap-2">
            {allActionItems.map((item, i) => (
              <Badge
                key={i}
                variant="outline"
                className={cn(
                  "text-xs py-1 px-3 h-auto font-medium transition-all duration-200",
                  topQueries && topQueries.length > 0
                    ? "border-blue-500/30 text-blue-400 bg-blue-500/5 hover:bg-blue-500/10"
                    : "border-indigo-500/30 text-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10"
                )}
              >
                {item}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Risk Flags */}
      {allRiskFlags.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wider section-heading-gradient mb-3">
            Risk Flags
          </p>
          <div className="flex flex-wrap gap-2">
            {allRiskFlags.map((flag, i) => (
              <Badge
                key={i}
                variant="outline"
                className={cn(
                  "text-xs border-border text-muted-foreground",
                  flag === 'Action Required' ? "border-red-500/50 text-red-400 bg-red-500/5" : ""
                )}
              >
                {flag}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
