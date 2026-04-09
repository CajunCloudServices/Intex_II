export function DataTable({
  columns,
  rows,
  emptyMessage = 'No rows to show yet.',
  caption,
  onRowClick,
}: {
  columns: string[];
  rows: Array<Array<React.ReactNode>>;
  emptyMessage?: string;
  caption?: string;
  onRowClick?: (rowIndex: number) => void;
}) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        {caption ? <caption>{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col">{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows.map((row, index) => (
              <tr
                key={index}
                className={onRowClick ? 'data-table-row-clickable' : undefined}
                onClick={onRowClick ? () => onRowClick(index) : undefined}
              >
                {row.map((cell, cellIndex) => (
                  <td key={`${index}-${cellIndex}`} data-label={columns[cellIndex] ?? `Column ${cellIndex + 1}`}>
                    {cell ?? '—'}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td className="table-empty" colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
