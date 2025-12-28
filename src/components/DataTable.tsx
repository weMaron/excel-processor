'use client';

import React, { useState, useMemo } from 'react';
import { ColumnConfig } from './ColumnMapper';
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink } from 'lucide-react';
import clsx from 'clsx';

interface DataTableProps {
    data: any[];
    columns: ColumnConfig[];
}

export default function DataTable({ data, columns }: DataTableProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    const totalPages = Math.ceil(data.length / pageSize);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedData = useMemo(() => {
        if (!sortConfig) return data;

        return [...data].sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (aValue === bValue) return 0;

            // Handle nulls
            if (aValue === null || aValue === undefined) return 1;
            if (bValue === null || bValue === undefined) return -1;

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [data, sortConfig]);

    const currentData = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return sortedData.slice(start, start + pageSize);
    }, [sortedData, currentPage, pageSize]);

    // Format cell value based on type
    const formatValue = (value: any, type: string) => {
        if (value === null || value === undefined) return <span className="text-slate-600 italic">-</span>;

        if (type === 'date' && value instanceof Date) {
            return value.toLocaleDateString('nl-NL');
        }

        if (type === 'currency' && typeof value === 'number') {
            return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(value);
        }

        if (type === 'link') {
            const url = String(value);
            if (!url) return '';
            return (
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1 underline underline-offset-2"
                    onClick={(e) => e.stopPropagation()}
                >
                    Openen <ExternalLink className="w-3 h-3" />
                </a>
            );
        }

        return String(value);
    };

    return (
        <div className="w-full space-y-4">
            {/* Controls */}
            <div className="flex justify-between items-center bg-slate-800/20 p-2 rounded-lg">
                <span className="text-sm text-slate-400">
                    Toon {Math.min(data.length, (currentPage - 1) * pageSize + 1)} tot {Math.min(data.length, currentPage * pageSize)} van {data.length} regels
                </span>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">Regels per pagina:</span>
                    <select
                        value={pageSize}
                        onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setCurrentPage(1);
                        }}
                        className="bg-slate-900 border border-slate-700 text-white text-sm rounded px-2 py-1 focus:outline-none"
                    >
                        <option value={10}>10</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>
            </div>

            {/* Table - Set z-index to 0 to sit below filters */}
            <div className="overflow-x-auto rounded-lg border border-slate-700/50 shadow-xl relative z-0">
                <table className="w-full text-sm text-left text-slate-300">
                    <thead className="text-xs text-slate-400 uppercase bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
                        <tr>
                            {columns.map((col) => (
                                <th
                                    key={col.targetHeader}
                                    className="px-6 py-3 cursor-pointer hover:bg-slate-800 transition-colors select-none"
                                    onClick={() => handleSort(col.targetHeader)}
                                >
                                    <div className="flex items-center gap-2">
                                        {col.targetHeader}
                                        {sortConfig?.key === col.targetHeader ? (
                                            sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />
                                        ) : (
                                            <ArrowUpDown className="w-3 h-3 opacity-20" />
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {currentData.map((row, idx) => {
                            const aiStatus = String(row.AI_Status || '').toLowerCase();
                            const needsAttention = aiStatus && !['goedgekeurd', 'approved', 'correct', 'ok'].includes(aiStatus);

                            return (
                                <tr
                                    key={row._id || idx}
                                    className={clsx(
                                        "border-b border-slate-700/50 transition-colors",
                                        needsAttention
                                            ? "bg-red-500/10 hover:bg-red-500/20 shadow-[inset_4px_0_0_0_#ef4444]"
                                            : "bg-slate-800/10 hover:bg-slate-800/30"
                                    )}
                                >
                                    {columns.map((col) => (
                                        <td key={`${row._id}-${col.targetHeader}`} className="px-6 py-4 whitespace-nowrap">
                                            {formatValue(row[col.targetHeader], col.type)}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {data.length === 0 && (
                    <div className="p-12 text-center text-slate-500">
                        Geen data beschikbaar.
                    </div>
                )}
            </div>

            {/* Pagination */}
            <div className="flex justify-end gap-2">
                <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronLeft className="w-4 h-4 text-white" />
                </button>
                <span className="flex items-center px-4 bg-slate-900 rounded-lg text-slate-300 text-sm font-medium">
                    Pagina {currentPage} van {totalPages || 1}
                </span>
                <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronRight className="w-4 h-4 text-white" />
                </button>
            </div>
        </div>
    );
}
