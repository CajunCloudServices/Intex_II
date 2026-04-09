type Props = {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onChange: (page: number) => void;
};

export function Pagination({ page, totalPages, totalItems, pageSize, onChange }: Props) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  const pages = buildPageList(page, totalPages);

  return (
    <div className="pagination">
      <span className="pagination-meta">
        {from}–{to} of {totalItems}
      </span>
      <div className="pagination-controls">
        <button
          className="pagination-btn"
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
          type="button"
          aria-label="Previous page"
        >
          ‹
        </button>

        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="pagination-ellipsis">…</span>
          ) : (
            <button
              key={p}
              className={`pagination-btn${p === page ? ' is-active' : ''}`}
              onClick={() => onChange(p as number)}
              type="button"
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          )
        )}

        <button
          className="pagination-btn"
          disabled={page === totalPages}
          onClick={() => onChange(page + 1)}
          type="button"
          aria-label="Next page"
        >
          ›
        </button>
      </div>
    </div>
  );
}

function buildPageList(current: number, total: number): Array<number | '…'> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const result: Array<number | '…'> = [];

  const showLeft = current > 3;
  const showRight = current < total - 2;

  result.push(1);
  if (showLeft) result.push('…');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) result.push(i);

  if (showRight) result.push('…');
  result.push(total);

  return result;
}
