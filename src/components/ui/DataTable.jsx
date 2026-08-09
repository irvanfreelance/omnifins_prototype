import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Search, Inbox } from 'lucide-react'
import { cn } from '../../lib/utils'

export function DataTable({
  columns,
  data,
  searchable = true,
  searchPlaceholder = 'Cari...',
  searchKeys,
  pageSize = 10,
  toolbar,
  emptyLabel = 'Belum ada data',
  rowKey = (row) => row.id,
  onRowClick,
  dense = false,
}) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    if (!query.trim()) return data
    const q = query.toLowerCase()
    const keys = searchKeys || columns.map((c) => c.accessor).filter(Boolean)
    return data.filter((row) =>
      keys.some((k) => {
        const val = typeof k === 'function' ? k(row) : row[k]
        return String(val ?? '').toLowerCase().includes(q)
      })
    )
  }, [data, query, searchKeys, columns])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageData = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div>
      {(searchable || toolbar) && (
        <div className="flex flex-wrap items-center gap-3 mb-3">
          {searchable && (
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setPage(1)
                }}
                placeholder={searchPlaceholder}
                className="w-full h-9 rounded-lg border border-slate-300 bg-white pl-8 pr-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400"
              />
            </div>
          )}
          <div className="flex items-center gap-2 ml-auto flex-wrap">{toolbar}</div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={cn(
                    'text-left font-medium text-slate-500 text-xs uppercase tracking-wide px-4 py-2.5 whitespace-nowrap',
                    col.headerClassName
                  )}
                  style={{ width: col.width }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-14 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <Inbox size={28} strokeWidth={1.5} />
                    <span className="text-sm">{emptyLabel}</span>
                  </div>
                </td>
              </tr>
            )}
            {pageData.map((row, ri) => (
              <tr
                key={rowKey(row, ri)}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors',
                  onRowClick && 'cursor-pointer'
                )}
              >
                {columns.map((col, ci) => (
                  <td
                    key={ci}
                    className={cn(
                      'px-4 text-slate-700 align-middle',
                      dense ? 'py-2' : 'py-3',
                      col.className
                    )}
                  >
                    {col.cell ? col.cell(row, ri) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
          <span>
            Menampilkan {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} dari{' '}
            {filtered.length} data
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-2 tabular">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
