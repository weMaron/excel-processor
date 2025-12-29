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

    const getBase64ImageFromUrl = async (url: string): Promise<string> => {
        const res = await fetch(url);
        const blob = await res.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    const handleGenerate = async () => {
        if (!settings.groupBy || settings.selectedColumns.length === 0) {
            alert('Selecteer een groepering en minimaal één kolom.');
            return;
        }

        setIsGenerating(true);

        try {
            const logoBase64 = await getBase64ImageFromUrl('/logo.png').catch(() => null);

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
                if (logoBase64) {
                    doc.addImage(logoBase64, 'PNG', pageWidth - 50, 10, 36, 12);
                }

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
                    didDrawPage: (data) => {
                        if (logoBase64) {
                            doc.addImage(logoBase64, 'PNG', pageWidth - 50, 10, 36, 12);
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
                    if (logoBase64) {
                        doc.addImage(logoBase64, 'PNG', pageWidth - 50, 10, 36, 12);
                    }
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
        <div className="glass-card p-6 space-y-6">
            <div className="flex items-center gap-3 border-b border-card-border pb-4">
                <FileText className="w-6 h-6 text-secondary" />
                <h2 className="text-xl font-black text-foreground tracking-tight">Rapportage</h2>
            </div>

            <div className="space-y-4">
                {/* Group By */}
                <div>
                    <label className="text-[10px] text-foreground/50 font-black uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                        <Settings2 className="w-4 h-4 text-secondary/60" /> Groepeer PDF op:
                    </label>
                    <select
                        value={settings.groupBy}
                        onChange={(e) => onSettingsChange({ ...settings, groupBy: e.target.value })}
                        className="w-full bg-input-bg border border-input-border rounded-xl p-3 text-input-text focus:border-secondary focus:ring-4 focus:ring-secondary/5 focus:outline-none transition-all font-bold"
                    >
                        <option value="">Kies kolom...</option>
                        {availableColumns.map(col => (
                            <option key={col} value={col}>{col}</option>
                        ))}
                    </select>
                </div>

                {/* Columns Selection */}
                <div>
                    <label className="text-[10px] text-foreground/50 font-black uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                        <Columns className="w-4 h-4 text-secondary/60" /> Kolommen in PDF:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {availableColumns.map(col => (
                            <button
                                key={col}
                                onClick={() => toggleColumn(col)}
                                className={clsx(
                                    "px-3 py-2 rounded-xl text-xs font-bold border transition-all text-left flex items-center justify-between",
                                    settings.selectedColumns.includes(col)
                                        ? "bg-secondary/10 border-secondary text-secondary shadow-sm shadow-secondary/10"
                                        : "bg-input-bg border-input-border text-foreground/50 hover:border-secondary/40 hover:bg-secondary/5 shadow-sm"
                                )}
                            >
                                <span className="truncate mr-2">{col}</span>
                                {settings.selectedColumns.includes(col) && <Check className="w-3 h-3 flex-shrink-0" />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Header Text */}
                <div>
                    <label className="text-[10px] text-foreground/50 font-black uppercase tracking-[0.2em] mb-2 block">Header Tekstblok:</label>
                    <textarea
                        value={settings.headerText}
                        onChange={(e) => onSettingsChange({ ...settings, headerText: e.target.value })}
                        className="w-full h-24 bg-input-bg border border-input-border rounded-xl p-3 text-input-text focus:border-secondary focus:ring-4 focus:ring-secondary/5 focus:outline-none resize-none transition-all font-bold placeholder:text-slate-400"
                        placeholder="Voeg een inleidende tekst toe aan de PDF..."
                    />
                </div>
            </div>

            <button
                onClick={handleGenerate}
                disabled={isGenerating || data.length === 0}
                className={clsx(
                    "w-full py-5 px-6 rounded-3xl font-black uppercase tracking-widest flex items-center justify-between transition-all active:scale-95 shadow-xl relative overflow-hidden group",
                    isGenerating
                        ? "bg-card-bg/50 text-foreground/30 cursor-not-allowed"
                        : "bg-gradient-to-r from-secondary to-primary text-white hover:shadow-primary/25 hover:scale-[1.02]"
                )}
            >
                {isGenerating ? (
                    <>
                        <span className="flex items-center gap-3"><Loader2 className="w-5 h-5 animate-spin" /> Bezig...</span>
                    </>
                ) : (
                    <>
                        <Download className="w-6 h-6 text-white/80 group-hover:text-white transition-colors" />
                        <span className="flex-1 text-center">DOWNLOAD</span>
                    </>
                )}
            </button>
        </div>
    );
}
