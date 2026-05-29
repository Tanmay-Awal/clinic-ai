import type { CallInsightsReport } from '@/types/callInsights';

function fmt(n: number | string | undefined): string {
  if (n === undefined || n === null) return '—';
  return String(n);
}

function urgencyColor(urgency: string): string {
  const u = urgency?.toLowerCase();
  if (u === 'high' || u === 'critical') return '#dc2626';
  if (u === 'medium') return '#d97706';
  return '#6b7280';
}

function urgencyBg(urgency: string): string {
  const u = urgency?.toLowerCase();
  if (u === 'high' || u === 'critical') return '#fef2f2';
  if (u === 'medium') return '#fffbeb';
  return '#f9fafb';
}

function implStr(val: string | string[] | undefined): string {
  if (!val) return '';
  return Array.isArray(val) ? val.join('. ') : val;
}

function esc(str: string | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function exportInsightsPdf(report: CallInsightsReport): void {
  const { metadata, statistics, executiveSummary, revenueInsights, strategicRecommendations, callPatterns } = report;

  const recs = strategicRecommendations.filter(r => !r.basedOn?.some(id => id.startsWith('BP-')));

  const periodLabel = `${esc(metadata.periodStart)} – ${esc(metadata.periodEnd)}`;
  const generatedLabel = new Date(metadata.generatedAt).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const maxPartySize = Math.max(...(callPatterns.byPartySize?.map(p => p.count) ?? [1]));

  const css = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 11pt; color: #111827; background: #fff; line-height: 1.55;
    }
    @page { size: A4; margin: 18mm 16mm 16mm 16mm; }
    .page-break { page-break-before: always; }
    .cover { border-bottom: 3px solid #111827; padding-bottom: 18px; margin-bottom: 28px; }
    .cover-meta { display: flex; justify-content: space-between; align-items: flex-end; }
    .cover h1 { font-size: 22pt; font-weight: 700; letter-spacing: -0.5px; line-height: 1.15; }
    .cover h1 span { display: block; font-size: 12pt; font-weight: 500; color: #6b7280; margin-top: 4px; }
    .cover-right { text-align: right; font-size: 9pt; color: #6b7280; line-height: 1.7; }
    .cover-right strong { color: #111827; font-weight: 600; }
    .section-label { font-size: 7.5pt; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #9ca3af; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #e5e7eb; }
    .exec-box { background: #f9fafb; border: 1px solid #e5e7eb; border-left: 4px solid #111827; border-radius: 6px; padding: 16px 18px; margin-bottom: 24px; }
    .exec-row { margin-bottom: 10px; }
    .exec-row:last-child { margin-bottom: 0; }
    .exec-label { font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin-bottom: 2px; }
    .exec-value { font-size: 10pt; color: #111827; }
    .kpi-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 28px; }
    .kpi-card { border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px 10px; text-align: center; }
    .kpi-value { font-size: 18pt; font-weight: 700; color: #111827; line-height: 1.1; }
    .kpi-label { font-size: 7pt; color: #6b7280; text-transform: uppercase; letter-spacing: 0.8px; margin-top: 4px; }
    .insight-card { border: 1px solid #e5e7eb; border-radius: 6px; padding: 14px 16px; margin-bottom: 12px; page-break-inside: avoid; }
    .insight-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; gap: 12px; }
    .insight-headline { font-size: 10.5pt; font-weight: 600; color: #111827; flex: 1; }
    .urgency-badge { font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; padding: 2px 8px; border-radius: 20px; white-space: nowrap; }
    .insight-section { margin-top: 8px; }
    .insight-section-label { font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #9ca3af; margin-bottom: 2px; }
    .insight-section-value { font-size: 9.5pt; color: #374151; }
    .insight-action { margin-top: 10px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; padding: 8px 12px; font-size: 9pt; }
    .insight-meta { display: flex; gap: 16px; margin-top: 6px; font-size: 8pt; color: #6b7280; }
    .rec-card { border: 1px solid #e5e7eb; border-radius: 6px; padding: 14px 16px; margin-bottom: 12px; page-break-inside: avoid; }
    .rec-title { font-size: 10.5pt; font-weight: 600; color: #111827; margin-bottom: 6px; }
    .rec-opportunity { font-size: 9.5pt; color: #374151; margin-bottom: 6px; }
    .rec-impact { font-size: 9pt; font-weight: 600; color: #059669; margin-bottom: 10px; }
    .rec-impl-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .rec-impl-label { font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #9ca3af; margin-bottom: 3px; }
    .rec-impl-value { font-size: 9pt; color: #374151; }
    .rec-metric { margin-top: 10px; font-size: 8.5pt; color: #6b7280; border-top: 1px solid #f3f4f6; padding-top: 8px; }
    .patterns-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    .pattern-table { width: 100%; border-collapse: collapse; font-size: 9pt; }
    .pattern-table th { text-align: left; font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #9ca3af; padding: 4px 6px; border-bottom: 1px solid #e5e7eb; }
    .pattern-table td { padding: 5px 6px; border-bottom: 1px solid #f3f4f6; color: #374151; }
    .pattern-table td.num { text-align: right; font-weight: 500; color: #111827; }
    .bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .bar-label { width: 20px; text-align: right; font-size: 9pt; color: #6b7280; }
    .bar-bg { flex: 1; height: 10px; background: #f3f4f6; border-radius: 3px; overflow: hidden; }
    .bar-fill { height: 100%; background: #111827; border-radius: 3px; }
    .bar-count { width: 24px; font-size: 9pt; font-weight: 600; color: #111827; }
    .footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 8pt; color: #9ca3af; display: flex; justify-content: space-between; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  `;

  const body = `
    <div class="cover">
      <div class="cover-meta">
        <h1>Call Insights Report<span>${esc(metadata.clinicName)} · ${esc(metadata.botName)}</span></h1>
        <div class="cover-right">
          <strong>Period</strong><br>${periodLabel}<br>
          <strong>Generated</strong><br>${generatedLabel}<br>
          <strong>Total Calls</strong><br>${metadata.totalCalls}
        </div>
      </div>
    </div>

    <div class="section-label">Executive Summary</div>
    <div class="exec-box">
      <div class="exec-row"><div class="exec-label">Critical Finding</div><div class="exec-value">${esc(executiveSummary.criticalFinding)}</div></div>
      <div class="exec-row"><div class="exec-label">Revenue Impact</div><div class="exec-value">${esc(executiveSummary.revenueImpact)}</div></div>
      <div class="exec-row"><div class="exec-label">Immediate Action</div><div class="exec-value">${esc(executiveSummary.immediateAction)}</div></div>
    </div>

    <div class="section-label">Key Metrics</div>
    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-value">${fmt(statistics.totalCalls)}</div><div class="kpi-label">Total Calls</div></div>
      <div class="kpi-card"><div class="kpi-value">${fmt(statistics.successfulBookings)}</div><div class="kpi-label">Bookings Made</div></div>
      <div class="kpi-card"><div class="kpi-value">${fmt(statistics.conversionRate)}%</div><div class="kpi-label">Conversion Rate</div></div>
      <div class="kpi-card"><div class="kpi-value">${fmt(statistics.totalCoversBooked)}</div><div class="kpi-label">Covers Booked</div></div>
      <div class="kpi-card"><div class="kpi-value">${fmt(statistics.estimatedCoversLost)}</div><div class="kpi-label">Est. Covers Lost</div></div>
    </div>

    <div class="page-break"></div>
    <div class="section-label">Revenue Insights (${revenueInsights.length})</div>
    ${revenueInsights.map(ins => `
      <div class="insight-card">
        <div class="insight-header">
          <div class="insight-headline">${ins.insightNumber}. ${esc(ins.headline)}</div>
          <span class="urgency-badge" style="background:${urgencyBg(ins.urgency)};color:${urgencyColor(ins.urgency)}">${esc(ins.urgency)}</span>
        </div>
        <div class="insight-section"><div class="insight-section-label">Signal</div><div class="insight-section-value">${esc(ins.signal?.description)}</div></div>
        <div class="insight-section"><div class="insight-section-label">Impact</div><div class="insight-section-value">${esc(ins.impact?.description)} ${ins.impact?.revenueEstimate ? `<strong>${esc(String(ins.impact.revenueEstimate))}</strong>` : ''}</div></div>
        <div class="insight-action">
          <strong>Action:</strong> ${esc(ins.action?.description)}
          <div class="insight-meta"><span>Owner: ${esc(ins.action?.owner)}</span><span>Timeline: ${esc(ins.action?.timeline)}</span></div>
        </div>
      </div>
    `).join('')}

    <div class="page-break"></div>
    <div class="section-label">Strategic Recommendations (${recs.length})</div>
    ${recs.map(rec => `
      <div class="rec-card">
        <div class="rec-title">${rec.recommendationNumber}. ${esc(rec.title)}</div>
        <div class="rec-opportunity">${esc(rec.opportunity?.description)}</div>
        <div class="rec-impact">${esc(rec.opportunity?.potentialImpact)}</div>
        <div class="rec-impl-grid">
          <div><div class="rec-impl-label">Immediate</div><div class="rec-impl-value">${esc(implStr(rec.implementation?.immediate))}</div></div>
          <div><div class="rec-impl-label">Short Term</div><div class="rec-impl-value">${esc(implStr(rec.implementation?.shortTerm))}</div></div>
          <div><div class="rec-impl-label">Ongoing</div><div class="rec-impl-value">${esc(implStr(rec.implementation?.ongoing))}</div></div>
        </div>
        <div class="rec-metric"><strong>Success Metric:</strong> ${esc(rec.successMetric)}</div>
      </div>
    `).join('')}

    <div class="page-break"></div>
    <div class="section-label">Call Patterns</div>
    <div class="patterns-grid">
      <div>
        <div style="font-size:8.5pt;font-weight:600;color:#374151;margin-bottom:8px">Calls by Day of Week</div>
        <table class="pattern-table">
          <thead><tr><th>Day</th><th style="text-align:right">Calls</th><th style="text-align:right">Bookings</th></tr></thead>
          <tbody>${callPatterns.byDayOfWeek.map(d => `<tr><td>${esc(d.day)}</td><td class="num">${d.count}</td><td class="num">${d.bookings}</td></tr>`).join('')}</tbody>
        </table>
      </div>
      <div>
        <div style="font-size:8.5pt;font-weight:600;color:#374151;margin-bottom:8px">Top Questions Asked</div>
        <table class="pattern-table">
          <thead><tr><th>Question</th><th style="text-align:right">×</th><th>Answered</th></tr></thead>
          <tbody>${callPatterns.topQuestions.map(q => `<tr><td>${esc(q.question)}</td><td class="num">${q.count}</td><td style="color:${q.answered ? '#059669' : '#dc2626'};font-size:8pt">${q.answered ? '✓' : '✗'}</td></tr>`).join('')}</tbody>
        </table>
      </div>
    </div>

    <div class="patterns-grid">
      <div>
        <div style="font-size:8.5pt;font-weight:600;color:#374151;margin-bottom:8px">Bookings by Party Size</div>
        ${callPatterns.byPartySize.map(p => `
          <div class="bar-row">
            <span class="bar-label">${esc(p.size)}</span>
            <div class="bar-bg"><div class="bar-fill" style="width:${maxPartySize > 0 ? (p.count / maxPartySize * 100).toFixed(1) : 0}%"></div></div>
            <span class="bar-count">${p.count}</span>
          </div>
        `).join('')}
      </div>
      <div>
        <div style="font-size:8.5pt;font-weight:600;color:#374151;margin-bottom:8px">Top Special Requests</div>
        <table class="pattern-table">
          <thead><tr><th>Request</th><th style="text-align:right">Count</th></tr></thead>
          <tbody>${[...callPatterns.topSpecialRequests].sort((a,b) => b.count - a.count).map(r => `<tr><td>${esc(r.request)}</td><td class="num">${r.count}</td></tr>`).join('')}</tbody>
        </table>
      </div>
    </div>

    <div class="footer">
      <span>${esc(metadata.clinicName)} · ${esc(metadata.botName)}</span>
      <span>Generated ${generatedLabel} · Netra AI</span>
    </div>
  `;

  const fullHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Call Insights Report — ${esc(metadata.clinicName)}</title><style>${css}</style></head><body>${body}</body></html>`;

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) {
    win.addEventListener('load', () => {
      setTimeout(() => {
        win.print();
        URL.revokeObjectURL(url);
      }, 500);
    });
  }
}
