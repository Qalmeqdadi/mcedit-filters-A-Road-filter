"use client";

import {
  flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable,
  type ColumnDef, type SortingState, type Row,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";

export function DataTable<T>({ data, columns, pageSize = 12, globalFilter, onRowClick, rowClassName, initialSort, toolbar, compact, emptyText, getRowId }: {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  pageSize?: number;
  globalFilter?: string;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
  initialSort?: SortingState;
  toolbar?: ReactNode;
  compact?: boolean;
  emptyText?: ReactNode;
  getRowId?: (row: T) => string;
}) {
  const { t, ar } = useI18n();
  const [sorting, setSorting] = useState<SortingState>(initialSort ?? []);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize });
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: "includesString",
    autoResetPageIndex: false,
    getRowId: getRowId ? (r: T) => getRowId(r) : undefined,
  });
  const pageCount = table.getPageCount();
  useEffect(() => {
    if (pagination.pageIndex > 0 && pagination.pageIndex >= pageCount) setPagination((p) => ({ ...p, pageIndex: Math.max(0, pageCount - 1) }));
  }, [pageCount, pagination.pageIndex]);
  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [globalFilter]);
  const total = table.getFilteredRowModel().rows.length;
  const Prev = ar ? ChevronRight : ChevronLeft;
  const Next = ar ? ChevronLeft : ChevronRight;
  return (
    <div className="flex min-w-0 flex-col">
      {toolbar}
      <div className="thin-scroll overflow-x-auto">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-line">
                {hg.headers.map((h) => {
                  const sorted = h.column.getIsSorted();
                  const canSort = h.column.getCanSort();
                  return (
                    <th key={h.id} className={cn("whitespace-nowrap px-2 text-start text-[11px] font-semibold uppercase tracking-wide text-ink-500", compact ? "py-1.5" : "py-2")}>
                      {h.isPlaceholder ? null : (
                        <button type="button" disabled={!canSort} onClick={h.column.getToggleSortingHandler()} className={cn("inline-flex items-center gap-1", canSort && "cursor-pointer hover:text-ink-900")}>
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {canSort ? sorted === "asc" ? <ArrowUp size={11} /> : sorted === "desc" ? <ArrowDown size={11} /> : <ArrowUpDown size={11} className="opacity-35" /> : null}
                        </button>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row: Row<T>) => (
              <tr key={row.id} onClick={onRowClick ? () => onRowClick(row.original) : undefined} className={cn("border-b border-line/60 last:border-0", onRowClick && "cursor-pointer hover:bg-sand-50", rowClassName?.(row.original))}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className={cn("whitespace-nowrap px-2 align-middle text-ink-900 tabular", compact ? "py-1.5" : "py-2")}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
              </tr>
            ))}
            {total === 0 ? (
              <tr><td colSpan={columns.length} className="px-2 py-8 text-center text-[13px] text-ink-500">{emptyText ?? t("noData")}</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {pageCount > 1 ? (
        <div className="flex items-center justify-between gap-2 border-t border-line/70 px-1 pt-2 text-[12px] text-ink-500">
          <span className="tabular">{total.toLocaleString("en-US")} {t("rows")}</span>
          <div className="flex items-center gap-1">
            <button type="button" className="rounded p-1 hover:bg-sand-100 disabled:opacity-30" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()} aria-label={t("previous")}><Prev size={15} /></button>
            <span className="tabular">{t("page")} {pagination.pageIndex + 1} {t("of")} {pageCount}</span>
            <button type="button" className="rounded p-1 hover:bg-sand-100 disabled:opacity-30" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()} aria-label={t("next")}><Next size={15} /></button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
