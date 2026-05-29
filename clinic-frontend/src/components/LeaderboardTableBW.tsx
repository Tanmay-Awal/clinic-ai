import { siteLeaderboard } from '@/lib/mockData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface LeaderboardTableBWProps {
  category: string;
}

export default function LeaderboardTableBW({ category, data }: LeaderboardTableBWProps & { data?: any[] }) {
  const getColumns = () => {
    switch (category) {
      case 'reservation':
        return ['Site', 'Calls', 'Confirmed %', 'No-Show %', 'Sentiment'];
      case 'sales':
        return ['Site', 'Calls', 'Won %', 'Intent Score', 'Sentiment'];
      case 'feedback':
        return ['Site', 'Calls', '% Negative', 'Sentiment'];
      case 'support':
        return ['Site', 'Calls', 'FCR %', 'SLA Breach', 'Sentiment'];
      case 'enquiry':
        return ['Site', 'Calls', 'Info %', 'Handoff %', 'Sentiment'];
      default:
        // Adjust default columns if we don't have conversion/no-show data yet
        return ['Site', 'Calls', 'Conversion %', 'No-Show %', 'Sentiment'];
    }
  };

  const columns = getColumns();
  // Use passed data or fallback to mock data (only for specific categories if needed, otherwise empty)
  const displayData = data && data.length > 0 ? data : (category === 'all' ? [] : siteLeaderboard);

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4">
        <h3 className="text-sm font-medium uppercase tracking-wide text-foreground/80">
          Site Performance
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Top locations by metrics
        </p>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border">
              {columns.map((col, i) => (
                <TableHead key={i} className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {col}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayData.map((site, index) => (
              <TableRow
                key={site.site}
                className="border-t border-transparent hover:border-t hover:border-b hover:border-foreground transition-colors"
              >
                <TableCell className="font-medium text-foreground">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
                      {index + 1}
                    </span>
                    {site.site}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{site.calls}</TableCell>
                {category === 'reservation' && (
                  <>
                    <TableCell className="font-medium text-foreground">{site.conversion ?? 0}%</TableCell>
                    <TableCell className="text-muted-foreground">{site.noShow ?? 0}%</TableCell>
                  </>
                )}
                {category === 'sales' && (
                  <>
                    <TableCell className="font-medium text-foreground">{site.won ?? 0}%</TableCell>
                    <TableCell className="text-muted-foreground">{site.intentScore ?? 0}</TableCell>
                  </>
                )}
                {category === 'feedback' && (
                  <TableCell className="font-medium text-foreground">{site.negativePct ?? 0}%</TableCell>
                )}
                {category === 'support' && (
                  <>
                    <TableCell className="font-medium text-foreground">{site.fcr ?? 0}%</TableCell>
                    <TableCell className="text-muted-foreground">{site.slaBreach ?? 0}%</TableCell>
                  </>
                )}
                {category === 'enquiry' && (
                  <>
                    <TableCell className="font-medium text-foreground">{site.infoProvided ?? 0}%</TableCell>
                    <TableCell className="text-muted-foreground">{site.handoff ?? 0}%</TableCell>
                  </>
                )}
                {category === 'all' && (
                  <>
                    <TableCell className="font-medium text-foreground">{site.conversion ?? 0}%</TableCell>
                    <TableCell className="text-muted-foreground">{site.noShow ?? 0}%</TableCell>
                  </>
                )}
                <TableCell className="font-medium text-foreground">{site.sentiment ? Number(site.sentiment).toFixed(2) : '0.00'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
