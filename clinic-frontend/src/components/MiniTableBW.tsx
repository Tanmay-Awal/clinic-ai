interface MiniTableBWProps {
  title: string;
  description?: string;
  columns: string[];
  data: Array<Record<string, any>>;
}

export default function MiniTableBW({ title, description, columns, data }: MiniTableBWProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4">
        <h3 className="text-sm font-medium uppercase tracking-wide text-foreground/80">
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/20">
              {columns.map((col, i) => (
                <th key={i} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr 
                key={index}
                className="border-t border-transparent hover:border-t hover:border-b hover:border-foreground transition-colors"
              >
                {columns.map((col, i) => (
                  <td key={i} className="px-3 py-2 text-sm text-foreground">
                    {row[col.toLowerCase().replace(/ /g, '_')]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
