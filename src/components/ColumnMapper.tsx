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
        <div className="w-full max-w-4xl mx-auto glass-card rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-white">Kolommen Mappen</h2>
                    <p className="text-slate-400 text-sm">Controleer en configureer datatypes voor nauwkeurige verwerking.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors"
                    >
                        Annuleren
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium flex items-center gap-2 transition-colors"
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
                        <div key={index} className="grid grid-cols-12 gap-4 items-center p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
                            {/* Original Column Name */}
                            <div className="col-span-3">
                                <label className="text-xs text-slate-500 uppercase font-semibold">Kolom</label>
                                <div className="text-white font-medium truncate" title={config.originalHeader}>
                                    {config.originalHeader}
                                </div>
                            </div>

                            {/* Sample Value */}
                            <div className="col-span-3">
                                <label className="text-xs text-slate-500 uppercase font-semibold">Voorbeeld (Rij 1)</label>
                                <div className="text-slate-300 text-sm truncate" title={String(sampleValue)}>
                                    {String(sampleValue)}
                                </div>
                            </div>

                            {/* Configuration */}
                            <div className="col-span-3">
                                <label className="text-xs text-slate-500 uppercase font-semibold">Datatype</label>
                                <select
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-primary"
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
                                <label className="text-xs text-slate-500 uppercase font-semibold">Nieuwe Naam</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-primary"
                                    value={config.targetHeader}
                                    onChange={(e) => handleHeaderDetailChange(index, e.target.value)}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-6 p-4 glass rounded-lg bg-blue-500/10 border-blue-500/20 text-blue-200 text-sm flex gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>
                    <strong>Tip:</strong> Zorg ervoor dat je "Datum" selecteert voor kolommen met datums (bv. "28-12-2025") en "Bedrag" voor financiële waarden om correct te kunnen filteren.
                </p>
            </div>
        </div>
    );
}
