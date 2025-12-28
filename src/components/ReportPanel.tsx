'use client';

import React, { useState } from 'react';
import { FileText, Download, Check, Settings2, Columns, Loader2 } from 'lucide-react';
import { ColumnConfig } from './ColumnMapper';
import clsx from 'clsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportPanelProps {
    data: any[];
    columns: ColumnConfig[];
    settings: {
        groupBy: string;
        selectedColumns: string[];
        headerText: string;
    };
    onSettingsChange: (settings: any) => void;
    filtersDescription: string;
}

export default function ReportPanel({ data, columns, settings, onSettingsChange, filtersDescription }: ReportPanelProps) {
    const [isGenerating, setIsGenerating] = useState(false);

    const availableColumns = columns.map(c => c.targetHeader);

    const toggleColumn = (col: string) => {
        const newSelected = settings.selectedColumns.includes(col)
            ? settings.selectedColumns.filter(c => c !== col)
            : [...settings.selectedColumns, col];
        onSettingsChange({ ...settings, selectedColumns: newSelected });
    };

    const handleGenerate = async () => {
        if (!settings.groupBy || settings.selectedColumns.length === 0) {
            alert('Selecteer een groepering en minimaal één kolom.');
            return;
        }

        setIsGenerating(true);

        try {
            // Group data
            const groups = data.reduce((acc: any, row: any) => {
                const val = String(row[settings.groupBy] || 'Onbekend');
                if (!acc[val]) acc[val] = [];
                acc[val].push(row);
                return acc;
            }, {});

            // Generate one PDF per group
            for (const [groupName, rows] of Object.entries(groups as Record<string, any[]>)) {
                const doc = new jsPDF('landscape');
                const pageWidth = doc.internal.pageSize.getWidth();

                // Branding / Header
                doc.setFontSize(20);
                doc.setTextColor(40);
                doc.text('Analyse Rapport', 14, 20);

                doc.setFontSize(14);
                doc.text(`${settings.groupBy}: ${groupName}`, 14, 30);

                doc.setFontSize(10);
                doc.setTextColor(100);

                // Wrap Header Text
                const headerLines = doc.splitTextToSize(settings.headerText || '', pageWidth - 28);
                doc.text(headerLines, 14, 40);

                let currentY = 40 + (headerLines.length * 5);

                // Wrap Filters Description
                const filterLines = doc.splitTextToSize(`Filters: ${filtersDescription}`, pageWidth - 28);
                doc.text(filterLines, 14, currentY);

                currentY += (filterLines.length * 5) + 5;

                // Table
                const tableHeaders = settings.selectedColumns;
                const tableData = rows.map(row =>
                    tableHeaders.map(h => {
                        const val = row[h];
                        if (h.toLowerCase().includes('url') || h.toLowerCase().includes('link')) {
                            return { content: 'Klik hier', link: val };
                        }
                        if (val instanceof Date) return val.toLocaleDateString('nl-NL');
                        return val;
                    })
                );

                const statusIdx = tableHeaders.indexOf('AI_Status');

                autoTable(doc, {
                    startY: currentY,
                    head: [tableHeaders],
                    body: tableData,
                    theme: 'grid',
                    headStyles: { fillColor: [79, 70, 229] }, // Primary-ish color
                    didParseCell: (data) => {
                        if (data.section === 'body') {
                            // Link styling
                            if (data.cell.raw && typeof data.cell.raw === 'object' && (data.cell.raw as any).link) {
                                data.cell.styles.textColor = [0, 0, 255];
                            }

                            // Error/Status styling
                            if (statusIdx !== -1) {
                                const rowRaw = data.row.raw as any;
                                const statusRaw = rowRaw[statusIdx];
                                const status = (statusRaw && typeof statusRaw === 'object' ? (statusRaw as any).content : String(statusRaw)).toLowerCase();
                                const okStatuses = ['goedgekeurd', 'approved', 'correct', 'ok'];

                                if (!okStatuses.includes(status)) {
                                    data.cell.styles.fillColor = [254, 226, 226]; // Light red
                                    data.cell.styles.textColor = [153, 27, 27]; // Dark red

                                    // Make status cell itself bold for extra accentuation
                                    if (data.column.index === statusIdx) {
                                        data.cell.styles.fontStyle = 'bold';
                                    }
                                }
                            }
                        }
                    },
                    didDrawCell: (data) => {
                        // Handle links
                        if (data.section === 'body' && data.cell.raw && typeof data.cell.raw === 'object' && (data.cell.raw as any).link) {
                            doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, {
                                url: (data.cell.raw as any).link
                            });
                        }
                    }
                });

                // Summary
                const finalY = (doc as any).lastAutoTable.finalY + 10;
                const correctCount = rows.filter(r => ['goedgekeurd', 'approved', 'correct', 'ok'].includes(String(r.AI_Status || '').toLowerCase())).length;
                const totalCount = rows.length;

                // Check for page break before summary
                const pageHeight = doc.internal.pageSize.getHeight();
                if (finalY + 30 > pageHeight) {
                    doc.addPage();
                    doc.setFontSize(11);
                    doc.setTextColor(40);
                    doc.text(`Totaal regels: ${totalCount}`, 14, 20);
                    doc.text(`Correct: ${correctCount}`, 14, 27);
                    doc.text(`Foutief: ${totalCount - correctCount}`, 14, 34);
                    if (totalCount - correctCount > 0) {
                        doc.setTextColor(153, 27, 27);
                        doc.text('Verzoek: corrigeer alle foutieve claims.', 14, 45);
                    }
                } else {
                    doc.setFontSize(11);
                    doc.setTextColor(40);
                    doc.text(`Totaal regels: ${totalCount}`, 14, finalY);
                    doc.text(`Correct: ${correctCount}`, 14, finalY + 7);
                    doc.text(`Foutief: ${totalCount - correctCount}`, 14, finalY + 14);
                    if (totalCount - correctCount > 0) {
                        doc.setTextColor(153, 27, 27);
                        doc.text('Verzoek: corrigeer alle foutieve claims.', 14, finalY + 25);
                    }
                }

                // Add Page Numbers Footer
                const totalPages = (doc as any).internal.getNumberOfPages();
                for (let i = 1; i <= totalPages; i++) {
                    doc.setPage(i);
                    doc.setFontSize(10);
                    doc.setTextColor(150);
                    doc.text(
                        `Pagina ${i} van ${totalPages}`,
                        pageWidth / 2,
                        pageHeight - 10,
                        { align: 'center' }
                    );
                }

                doc.save(`Analyse_${groupName}_${new Date().toLocaleDateString('nl-NL')}.pdf`);
            }

            alert('PDF-rapporten succesvol gegenereerd!');
        } catch (error) {
            console.error(error);
            alert('Fout bij genereren van PDF.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="glass-card p-6 rounded-xl space-y-6 text-left">
            <div className="flex items-center gap-3 border-b border-slate-700/50 pb-4">
                <FileText className="w-6 h-6 text-blue-400" />
                <h2 className="text-xl font-bold text-white">Rapportage</h2>
            </div>

            <div className="space-y-4">
                {/* Group By */}
                <div>
                    <label className="text-sm font-medium text-slate-300 block mb-2 flex items-center gap-2">
                        <Settings2 className="w-4 h-4 text-slate-500" /> Groepeer PDF op:
                    </label>
                    <select
                        value={settings.groupBy}
                        onChange={(e) => onSettingsChange({ ...settings, groupBy: e.target.value })}
                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-slate-200 focus:border-blue-500 focus:outline-none"
                    >
                        <option value="">Kies kolom...</option>
                        {availableColumns.map(col => (
                            <option key={col} value={col}>{col}</option>
                        ))}
                    </select>
                </div>

                {/* Columns Selection */}
                <div>
                    <label className="text-sm font-medium text-slate-300 block mb-2 flex items-center gap-2">
                        <Columns className="w-4 h-4 text-slate-500" /> Kolommen in PDF:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {availableColumns.map(col => (
                            <button
                                key={col}
                                onClick={() => toggleColumn(col)}
                                className={clsx(
                                    "px-3 py-2 rounded-lg text-xs font-medium border transition-all text-left flex items-center justify-between",
                                    settings.selectedColumns.includes(col)
                                        ? "bg-blue-500/20 border-blue-500 text-blue-300"
                                        : "bg-slate-800/40 border-slate-700 text-slate-400 hover:border-slate-600"
                                )}
                            >
                                {col}
                                {settings.selectedColumns.includes(col) && <Check className="w-3 h-3" />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Header Text */}
                <div>
                    <label className="text-sm font-medium text-slate-300 block mb-2">Header Tekstblok:</label>
                    <textarea
                        value={settings.headerText}
                        onChange={(e) => onSettingsChange({ ...settings, headerText: e.target.value })}
                        className="w-full h-24 bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-slate-200 focus:border-blue-500 focus:outline-none resize-none"
                        placeholder="Voeg een inleidende tekst toe aan de PDF..."
                    />
                </div>
            </div>

            <button
                onClick={handleGenerate}
                disabled={isGenerating || data.length === 0}
                className={clsx(
                    "w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all",
                    isGenerating
                        ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20"
                )}
            >
                {isGenerating ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" /> Bezig...
                    </>
                ) : (
                    <>
                        <Download className="w-5 h-5" /> Download PDF Rapporten
                    </>
                )}
            </button>
        </div>
    );
}
