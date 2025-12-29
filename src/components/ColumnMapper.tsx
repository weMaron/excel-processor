'use client';

import React, { useState, useEffect } from 'react';
import { ExcelData, parseDutchDate } from '@/lib/excel-utils';
import { Save, ArrowRight, Check, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

export interface ColumnConfig {
    originalHeader: string;
    targetHeader: string;
    type: 'string' | 'date' | 'number' | 'currency' | 'link';
    // Include sample values to help user decide
}

interface ColumnMapperProps {
    data: ExcelData;
    onConfirm: (processedData: any[], config: ColumnConfig[]) => void;
    onCancel: () => void;
}

export default function ColumnMapper({ data, onConfirm, onCancel }: ColumnMapperProps) {
    const [columnConfigs, setColumnConfigs] = useState<ColumnConfig[]>([]);

    // Initialize configs from headers
    useEffect(() => {
        if (data.headers) {
            const initialConfigs = data.headers.map(header => {
                const lowerHeader = header.toLowerCase();
                let type: ColumnConfig['type'] = 'string';

                if (lowerHeader.includes('datum')) {
                    type = 'date';
                } else if (lowerHeader.includes('waarde')) {
                    type = 'currency';
                } else if (lowerHeader.includes('url')) {
                    type = 'link';
                } else if (lowerHeader.includes('aantal')) {
                    type = 'number';
                }

                return {
                    originalHeader: header,
                    targetHeader: header, // Default to same name
                    type: type,
                };
            });
            setColumnConfigs(initialConfigs);
        }
    }, [data]);

    const handleTypeChange = (index: number, type: 'string' | 'date' | 'number' | 'currency' | 'link') => {
        const newConfigs = [...columnConfigs];
        newConfigs[index].type = type;
        setColumnConfigs(newConfigs);
    };

    const handleHeaderDetailChange = (index: number, value: string) => {
        const newConfigs = [...columnConfigs];
        newConfigs[index].targetHeader = value;
        setColumnConfigs(newConfigs);
    };

    const handleConfirm = () => {
        // Process data based on configs
        const processedRows = data.rows.map(row => {
            const newRow: any = { _id: row._id };
            columnConfigs.forEach(config => {
                let value = row[config.originalHeader];

                if (config.type === 'date') {
                    const parsed = typeof value === 'string' ? parseDutchDate(value) : value;
                    value = parsed;
                } else if (config.type === 'number' || config.type === 'currency') {
                    if (typeof value === 'string') {
                        // Smart parse for Dutch/European numbers: 1.234,56 -> 1234.56
                        const cleanValue = value.replace(/[€\s]/g, '').replace(/\./g, '').replace(',', '.');
                        const parsed = parseFloat(cleanValue);
                        value = isNaN(parsed) ? null : parsed;
                    } else {
                        const parsed = parseFloat(String(value));
                        value = isNaN(parsed) ? null : parsed;
                    }
                }
                // Link is just string

                newRow[config.targetHeader] = value;
            });
            return newRow;
        });

        onConfirm(processedRows, columnConfigs);
    };

    return (
        <div className="w-full max-w-4xl mx-auto glass-card rounded-3xl p-8 border border-card-border shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-8">
                <div className="space-y-1">
                    <h2 className="text-4xl font-black text-foreground tracking-tighter">Kolommen Mappen</h2>
                    <p className="text-foreground/60 font-medium">Controleer en configureer datatypes voor nauwkeurige verwerking.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="px-6 py-2 rounded-xl text-foreground/60 hover:text-foreground font-bold transition-all"
                    >
                        Annuleren
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="px-6 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg hover:shadow-primary/20 active:scale-95"
                    >
                        Doorgaan <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                {columnConfigs.map((config, index) => {
                    // Get sample value
                    const sampleValue = data.rows.length > 0 ? data.rows[0][config.originalHeader] : '';

                    return (
                        <div key={index} className="grid grid-cols-12 gap-4 items-center p-6 bg-input-bg/40 border border-card-border rounded-3xl shadow-sm transition-all hover:bg-input-bg/60 group">
                            {/* Original Column Name */}
                            <div className="col-span-3">
                                <label className="text-[10px] text-secondary font-bold uppercase tracking-wider mb-1 block">Kolom</label>
                                <div className="text-foreground font-bold truncate" title={config.originalHeader}>
                                    {config.originalHeader}
                                </div>
                            </div>

                            {/* Sample Value */}
                            <div className="col-span-3">
                                <label className="text-[10px] text-foreground/40 font-black uppercase tracking-[0.2em] mb-1.5 block ml-1">Voorbeeld (Rij 1)</label>
                                <div className="text-foreground/70 font-medium text-sm truncate italic px-1" title={String(sampleValue)}>
                                    {String(sampleValue)}
                                </div>
                            </div>

                            {/* Configuration */}
                            <div className="col-span-3">
                                <label className="text-[10px] text-foreground/40 font-black uppercase tracking-[0.2em] mb-1.5 block ml-1">Datatype</label>
                                <select
                                    className="w-full bg-input-bg border border-input-border rounded-xl px-3 py-2 text-sm text-foreground focus:border-secondary focus:ring-4 focus:ring-secondary/5 focus:outline-none transition-all font-bold"
                                    value={config.type}
                                    onChange={(e) => handleTypeChange(index, e.target.value as any)}
                                >
                                    <option value="string">Tekst</option>
                                    <option value="date">Datum (dd-mm-yyyy)</option>
                                    <option value="number">Getal</option>
                                    <option value="currency">Bedrag (€)</option>
                                    <option value="link">Link (PDF/Image)</option>
                                </select>
                            </div>

                            {/* Target Name (Renaming) */}
                            <div className="col-span-3">
                                <label className="text-[10px] text-foreground/40 font-black uppercase tracking-[0.2em] mb-1.5 block ml-1">Nieuwe Naam</label>
                                <input
                                    type="text"
                                    className="w-full bg-input-bg border border-input-border rounded-xl px-3 py-2 text-sm text-foreground focus:border-secondary focus:ring-4 focus:ring-secondary/5 focus:outline-none transition-all font-bold"
                                    value={config.targetHeader}
                                    onChange={(e) => handleHeaderDetailChange(index, e.target.value)}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-8 p-4 rounded-2xl bg-secondary/5 border border-secondary/20 text-secondary text-sm flex gap-3 animate-in fade-in slide-in-from-bottom-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-secondary" />
                <p className="font-medium">
                    <strong className="font-black uppercase tracking-widest text-[10px] mr-1">Tip:</strong> Zorg ervoor dat je "Datum" selecteert voor kolommen met datums (bv. "28-12-2025") en "Bedrag" voor financiële waarden om correct te kunnen filteren.
                </p>
            </div>
        </div>
    );
}
