import React, { useState, useMemo } from 'react';
import { Icon } from '@iconify/react';

export default function DataTable({
    columns = [],
    data = [],
    searchable = true,
    searchPlaceholder = 'Cari data...',
    searchKeys = null,
    defaultSort = null,
    pageSizeOptions = [10, 25, 50, 100],
    defaultPageSize = 10,
    filterSlot = null,
    emptyMessage = 'Tidak ada data yang tersedia.',
    subRowRender = null,
    isRowExpanded = null,
    onToggleRow = null,
    rowKey = (row, idx) => row.id ?? idx,
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [pageSize, setPageSize] = useState(defaultPageSize);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState(defaultSort);

    const filteredData = useMemo(() => {
        if (!searchQuery.trim()) return data;
        const q = searchQuery.toLowerCase().trim();

        return data.filter((row) => {
            if (searchKeys && Array.isArray(searchKeys)) {
                return searchKeys.some((k) => {
                    const val = row[k];
                    return val !== undefined && val !== null && String(val).toLowerCase().includes(q);
                });
            }

            return Object.values(row).some((val) => {
                if (val === null || val === undefined) return false;
                if (typeof val === 'object') {

                    if (val.name) return String(val.name).toLowerCase().includes(q);
                    return false;
                }
                return String(val).toLowerCase().includes(q);
            });
        });
    }, [data, searchQuery, searchKeys]);

    const sortedData = useMemo(() => {
        if (!sortConfig || !sortConfig.key) return filteredData;

        const col = columns.find((c) => c.key === sortConfig.key);
        const { key, direction } = sortConfig;
        const factor = direction === 'asc' ? 1 : -1;

        return [...filteredData].sort((a, b) => {
            let valA = col?.sortValue ? col.sortValue(a) : a[key];
            let valB = col?.sortValue ? col.sortValue(b) : b[key];

            if (valA === null || valA === undefined) valA = '';
            if (valB === null || valB === undefined) valB = '';

            if (typeof valA === 'number' && typeof valB === 'number') {
                return (valA - valB) * factor;
            }

            return String(valA).localeCompare(String(valB), undefined, { numeric: true }) * factor;
        });
    }, [filteredData, sortConfig, columns]);

    const totalRecords = sortedData.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
    const safeCurrentPage = Math.min(currentPage, totalPages);

    const paginatedData = useMemo(() => {
        const start = (safeCurrentPage - 1) * pageSize;
        return sortedData.slice(start, start + pageSize);
    }, [sortedData, safeCurrentPage, pageSize]);

    const handleSort = (columnKey, isSortable) => {
        if (!isSortable) return;

        setSortConfig((prev) => {
            if (!prev || prev.key !== columnKey) {
                return { key: columnKey, direction: 'asc' };
            }
            if (prev.direction === 'asc') {
                return { key: columnKey, direction: 'desc' };
            }
            return null;
        });
    };

    const startRecord = totalRecords === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
    const endRecord = Math.min(safeCurrentPage * pageSize, totalRecords);

    const paginationItems = useMemo(() => {
        const pages = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (safeCurrentPage <= 4) {
                pages.push(1, 2, 3, 4, 5, '...', totalPages);
            } else if (safeCurrentPage >= totalPages - 3) {
                pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
            } else {
                pages.push(1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages);
            }
        }
        return pages;
    }, [totalPages, safeCurrentPage]);

    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">

            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3.5 bg-slate-50/50">

                <div className="flex items-center gap-2 text-xs text-slate-600">
                    <span className="font-medium">Tampilkan</span>
                    <select
                        value={pageSize}
                        onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setCurrentPage(1);
                        }}
                        className="py-1 px-2.5 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:border-brand-500 focus:ring-brand-500 shadow-2xs"
                    >
                        {pageSizeOptions.map((opt) => (
                            <option key={opt} value={opt}>
                                {opt}
                            </option>
                        ))}
                    </select>
                    <span className="font-medium">data per halaman</span>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 justify-end">
                    {filterSlot}

                    {searchable && (
                        <div className="relative w-full sm:w-64">
                            <Icon
                                icon="ph:magnifying-glass-bold"
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                            />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setCurrentPage(1);
                                }}
                                placeholder={searchPlaceholder}
                                className="w-full pl-9 pr-8 py-1.5 bg-white text-xs rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-brand-500 placeholder-slate-400 font-medium shadow-2xs"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600"
                                >
                                    <Icon icon="ph:x-bold" className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            {columns.map((col) => {
                                const isSortable = col.sortable !== false && col.key !== 'actions' && col.key !== 'expand';
                                const isSorted = sortConfig?.key === col.key;
                                const direction = sortConfig?.direction;
                                const align = col.key === 'actions' ? 'center' : (col.align || 'left');

                                return (
                                    <th
                                        key={col.key}
                                        style={{ width: col.width }}
                                        onClick={() => handleSort(col.key, isSortable)}
                                        className={`py-3 px-3 select-none whitespace-nowrap align-middle ${
                                            align === 'center'
                                                ? 'text-center'
                                                : align === 'right'
                                                ? 'text-right'
                                                : 'text-left'
                                        } ${isSortable ? 'cursor-pointer hover:bg-slate-100/70 transition-colors' : ''}`}
                                    >
                                        <div
                                            className={`inline-flex items-center gap-1 ${
                                                align === 'center'
                                                    ? 'justify-center'
                                                    : align === 'right'
                                                    ? 'justify-end'
                                                    : 'justify-start'
                                            }`}
                                        >
                                            <span className={isSorted ? 'text-brand-700 font-extrabold' : ''}>
                                                {col.label}
                                            </span>
                                            {isSortable && (
                                                <span className="shrink-0">
                                                    {isSorted ? (
                                                        direction === 'asc' ? (
                                                            <Icon icon="ph:arrow-up-bold" className="w-3 h-3 text-brand-600" />
                                                        ) : (
                                                            <Icon icon="ph:arrow-down-bold" className="w-3 h-3 text-brand-600" />
                                                        )
                                                    ) : (
                                                        <Icon icon="ph:arrows-down-up-bold" className="w-3 h-3 text-slate-300" />
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                        {paginatedData.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="py-12 text-center text-slate-400">
                                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400 mb-2">
                                        <Icon icon="ph:magnifying-glass-bold" className="w-6 h-6" />
                                    </div>
                                    <p className="font-bold text-slate-700 text-sm">{emptyMessage}</p>
                                    {searchQuery && (
                                        <p className="text-xs text-slate-400 mt-1">
                                            Tidak ada hasil yang cocok dengan kata kunci "{searchQuery}".
                                        </p>
                                    )}
                                </td>
                            </tr>
                        ) : (
                            paginatedData.map((row, idx) => {
                                const globalIndex = (safeCurrentPage - 1) * pageSize + idx;
                                const isExpanded = isRowExpanded ? isRowExpanded(row) : false;

                                return (
                                    <React.Fragment key={rowKey(row, idx)}>
                                        <tr className="hover:bg-slate-50/70 transition group">
                                            {columns.map((col) => {
                                                const align = col.key === 'actions' ? 'center' : (col.align || 'left');
                                                return (
                                                <td
                                                    key={col.key}
                                                    className={`py-3 px-3 align-middle ${
                                                        align === 'center'
                                                            ? 'text-center [&>*]:mx-auto [&>div.flex]:justify-center'
                                                            : align === 'right'
                                                            ? 'text-right [&>div.flex]:justify-end'
                                                            : align === 'justify'
                                                            ? 'text-justify'
                                                            : 'text-left'
                                                    }`}
                                                >
                                                    {col.render
                                                        ? col.render(row, idx, globalIndex)
                                                        : row[col.key] !== undefined && row[col.key] !== null
                                                        ? String(row[col.key])
                                                        : '-'}
                                                </td>
                                                );
                                            })}
                                        </tr>

                                        {isExpanded && subRowRender && (
                                            <tr className="bg-slate-50/60">
                                                <td colSpan={columns.length} className="p-4 pl-12 pr-6">
                                                    {subRowRender(row, idx, globalIndex)}
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-500 bg-slate-50/40">
                <div>
                    Menampilkan <span className="font-bold text-slate-800">{startRecord}</span> sampai{' '}
                    <span className="font-bold text-slate-800">{endRecord}</span> dari{' '}
                    <span className="font-bold text-slate-800">{totalRecords}</span> data
                    {searchQuery && data.length !== totalRecords && (
                        <span> (difilter dari {data.length} total entri)</span>
                    )}
                </div>

                {totalPages > 1 && (
                    <div className="inline-flex items-center gap-1 self-center sm:self-auto">
                        <button
                            type="button"
                            disabled={safeCurrentPage <= 1}
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition"
                        >
                            Sebelumnya
                        </button>

                        {paginationItems.map((page, pIdx) => {
                            if (page === '...') {
                                return (
                                    <span key={`dots-${pIdx}`} className="px-2 py-1 text-slate-400 font-bold">
                                        ...
                                    </span>
                                );
                            }

                            const isActive = page === safeCurrentPage;
                            return (
                                <button
                                    key={page}
                                    type="button"
                                    onClick={() => setCurrentPage(page)}
                                    className={`w-7 h-7 rounded-xl text-xs font-bold transition flex items-center justify-center ${
                                        isActive
                                            ? 'bg-brand-600 text-white shadow-2xs'
                                            : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                                >
                                    {page}
                                </button>
                            );
                        })}

                        <button
                            type="button"
                            disabled={safeCurrentPage >= totalPages}
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition"
                        >
                            Selanjutnya
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
