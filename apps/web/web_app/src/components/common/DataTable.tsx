import React from 'react';

interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  render?: (item: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  data,
  onRowClick,
  emptyMessage = 'No records available',
}: DataTableProps<T>) {
  return (
    <div className="w-full overflow-x-auto border border-border rounded-lg bg-card shadow-sm transition-colors">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-border bg-muted">
            {columns.map((col, idx) => (
              <th
                key={idx}
                className={`py-3.5 px-4 text-xs font-semibold tracking-wide text-muted-foreground ${
                  col.align === 'right'
                    ? 'text-right'
                    : col.align === 'center'
                    ? 'text-center'
                    : 'text-left'
                } ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border text-sm">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="py-12 text-center text-muted-foreground text-sm"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                onClick={() => onRowClick && onRowClick(row)}
                className={`transition-colors ${
                  onRowClick
                    ? 'cursor-pointer hover:bg-muted'
                    : 'hover:bg-muted'
                }`}
              >
                <td
                  colSpan={columns.length}
                  className="p-0 border-none"
                  style={{ display: 'none' }}
                ></td>
                {columns.map((col, colIdx) => (
                  <td
                    key={colIdx}
                    className={`py-4 px-4 text-sm font-medium text-foreground ${
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                        ? 'text-center'
                        : 'text-left'
                    } ${col.className || ''}`}
                  >
                    {col.render
                      ? col.render(row)
                      : col.accessorKey
                      ? String(row[col.accessorKey] ?? '')
                      : null}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
