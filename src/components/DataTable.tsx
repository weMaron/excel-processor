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
            <div className="flex justify-between items-center glass-card px-6 py-4 rounded-3xl relative z-10 transition-colors">
                <span className="text-[10px] text-slate-700 dark:text-slate-400 font-black uppercase tracking-[0.2em]">
                    Toon {Math.min(data.length, (currentPage - 1) * pageSize + 1)} tot {Math.min(data.length, currentPage * pageSize)} van {data.length} regels
                </span>
                <div className="flex items-center gap-4">
                    <span className="text-[10px] text-slate-600 dark:text-slate-400 font-black uppercase tracking-[0.2em]">Regels per pagina:</span>
                    <select
                        value={pageSize}
                        onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setCurrentPage(1);
                        }}
                        className="bg-input-bg border border-input-border rounded-xl px-4 py-1.5 text-xs text-input-text font-bold focus:border-secondary focus:ring-4 focus:ring-secondary/5 focus:outline-none transition-all"
                    >
                        <option className="text-input-text bg-input-bg" value={10}>10</option>
                        <option className="text-input-text bg-input-bg" value={50}>50</option>
                        <option className="text-input-text bg-input-bg" value={100}>100</option>
                    </select>
                </div>
            </div>

            {/* Table - Set z-index to 0 to sit below filters */}
            <div className="glass-card overflow-hidden shadow-2xl relative z-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[10px] font-black text-slate-900 dark:text-white force-light-text uppercase bg-card-bg backdrop-blur-md sticky top-0 z-10 border-b border-card-border tracking-widest">
                            <tr>
                                {columns.map((col) => (
                                    <th
                                        key={col.targetHeader}
                                        className="px-6 py-4 cursor-pointer hover:bg-primary/5 transition-colors select-none"
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
                        <tbody className="divide-y divide-secondary/10 bg-transparent">
                            {currentData.map((row, idx) => {
                                const aiStatus = String(row.AI_Status || '').toLowerCase();
                                const isCorrect = ['goedgekeurd', 'approved', 'correct', 'ok'].includes(aiStatus);
                                const needsAttention = aiStatus && !isCorrect;

                                return (
                                    <tr
                                        key={row._id || idx}
                                        className={clsx(
                                            "transition-colors border-b border-card-border",
                                            needsAttention
                                                ? "bg-amber-500/10 text-amber-900 dark:text-amber-400 border-l-4 border-l-amber-500 font-medium"
                                                : isCorrect
                                                    ? "bg-emerald-500/10 text-emerald-900 dark:text-emerald-400 border-l-4 border-l-emerald-500 font-medium"
                                                    : "text-foreground hover:bg-primary/5"
                                        )}
                                    >
                                        {columns.map((col) => (
                                            <td key={`${row._id}-${col.targetHeader}`} className="px-6 py-4 whitespace-nowrap font-medium">
                                                {formatValue(row[col.targetHeader], col.type)}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {data.length === 0 && (
                        <div className="p-12 text-center text-slate-500 dark:text-slate-400 font-black uppercase tracking-[0.2em]">
                            Geen data beschikbaar.
                        </div>
                    )}
                </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-2 pt-6">
                <div className="text-[10px] text-slate-800 dark:text-slate-400 font-black uppercase tracking-[0.3em]">
                    Pagina {currentPage} <span className="text-slate-400 dark:text-slate-600">van</span> {totalPages || 1}
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="p-4 rounded-2xl glass-card border border-card-border hover:bg-card-bg disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg active:scale-95"
                    >
                        <ChevronLeft className="w-6 h-6 text-foreground" />
                    </button>
                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="p-4 rounded-2xl glass-card border border-card-border hover:bg-card-bg disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg active:scale-95"
                    >
                        <ChevronRight className="w-6 h-6 text-foreground" />
                    </button>
                </div>
            </div>
        </div>
    );
}
