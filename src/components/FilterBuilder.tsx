'use client';

import React from 'react';
import { ColumnConfig } from './ColumnMapper';
import { Plus, Trash2, Filter } from 'lucide-react';

export type FilterOperator = 'contains' | 'not_contains' | 'equals' | 'startsWith' | 'is_not_empty' | 'gt' | 'lt' | 'eq_date' | 'after_date' | 'before_date';

export interface FilterRule {
    id: string;
    field: string;
    operator: FilterOperator;
    value: string;
}

interface FilterBuilderProps {
    columns: ColumnConfig[];
    rules: FilterRule[];
    onFilterChange: (rules: FilterRule[]) => void;
}

export default function FilterBuilder({ columns, rules, onFilterChange }: FilterBuilderProps) {
    const addRule = () => {
        if (columns.length === 0) return;
        const newRule: FilterRule = {
            id: Math.random().toString(36).substr(2, 9),
            field: columns[0].targetHeader,
            operator: 'contains',
            value: ''
        };
        onFilterChange([...rules, newRule]);
    };

    const removeRule = (id: string) => {
        onFilterChange(rules.filter(r => r.id !== id));
    };

    const updateRule = (id: string, updates: Partial<FilterRule>) => {
        onFilterChange(rules.map(r => r.id === id ? { ...r, ...updates } : r));
    };

    const getOperatorsForType = (type: string): { label: string, value: FilterOperator }[] => {
        switch (type) {
            case 'date':
                return [
                    { label: 'Is op', value: 'eq_date' },
                    { label: 'Na', value: 'after_date' },
                    { label: 'Voor', value: 'before_date' }
                ];
            case 'number':
            case 'currency':
                return [
                    { label: 'Gelijk aan', value: 'equals' },
                    { label: 'Groter dan', value: 'gt' },
                    { label: 'Kleiner dan', value: 'lt' }
                ];
            default: // string and link
                return [
                    { label: 'Bevat', value: 'contains' },
                    { label: 'Bevat niet', value: 'not_contains' },
                    { label: 'Gelijk aan', value: 'equals' },
                    { label: 'Begint met', value: 'startsWith' },
                    { label: 'Niet leeg', value: 'is_not_empty' }
                ];
        }
    };

    if (columns.length === 0) return null;

    return (
        <div className="glass-card p-6 space-y-4 relative z-20 text-left">
            <div className="flex items-center justify-between border-b border-secondary/10 pb-3">
                <h3 className="text-lg font-bold text-slate-950 dark:text-white force-light-text flex items-center gap-2">
                    <Filter className="w-5 h-5 text-secondary" /> Filter
                </h3>
                <button
                    onClick={addRule}
                    className="text-xs bg-secondary/10 hover:bg-secondary/20 text-secondary px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all font-bold border border-secondary/20 shadow-sm shadow-secondary/5"
                >
                    <Plus className="w-3 h-3" /> Regel
                </button>
            </div>

            {rules.length === 0 ? (
                <div className="text-center py-6 text-slate-500 dark:text-slate-400 font-black uppercase tracking-[0.2em] text-xs border-2 border-dashed border-secondary/10 rounded-2xl">
                    Geen filters actief.
                </div>
            ) : (
                <div className="space-y-4">
                    {rules.map((rule) => {
                        const column = columns.find(c => c.targetHeader === rule.field);
                        const operators = column ? getOperatorsForType(column.type) : [];

                        return (
                            <div key={rule.id} className="relative bg-white/80 dark:bg-slate-900/20 p-4 pt-10 rounded-2xl border border-secondary/10 animate-in fade-in slide-in-from-top-2 shadow-sm">
                                <button
                                    onClick={() => removeRule(rule.id)}
                                    className="absolute top-3 right-3 p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                    title="Verwijder regel"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>

                                <div className="space-y-3">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] text-slate-700 dark:text-slate-400 font-black uppercase tracking-[0.2em] ml-1">Kolom</label>
                                        <select
                                            value={rule.field}
                                            onChange={(e) => {
                                                const newField = e.target.value;
                                                const newType = columns.find(c => c.targetHeader === newField)?.type || 'string';
                                                updateRule(rule.id, {
                                                    field: newField,
                                                    operator: getOperatorsForType(newType)[0].value
                                                });
                                            }}
                                            className="w-full bg-input-bg border border-input-border text-input-text rounded-xl px-4 py-2 text-xs focus:border-secondary focus:ring-4 focus:ring-secondary/5 focus:outline-none transition-all font-bold"
                                        >
                                            {columns.map(col => (
                                                <option key={col.targetHeader} value={col.targetHeader}>{col.targetHeader}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[10px] text-slate-700 dark:text-slate-400 font-black uppercase tracking-[0.2em] ml-1">Conditie</label>
                                            <select
                                                value={rule.operator}
                                                onChange={(e) => updateRule(rule.id, { operator: e.target.value as FilterOperator })}
                                                className="w-full bg-input-bg border border-input-border text-input-text rounded-xl px-4 py-2 text-xs focus:border-secondary focus:ring-4 focus:ring-secondary/5 focus:outline-none transition-all font-bold"
                                            >
                                                {operators.map(op => (
                                                    <option key={op.value} value={op.value}>{op.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {rule.operator !== 'is_not_empty' && (
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-[10px] text-slate-700 dark:text-slate-400 font-black uppercase tracking-[0.2em] ml-1">Waarde</label>
                                                <input
                                                    type={column?.type === 'date' ? 'date' : (column?.type === 'number' || column?.type === 'currency') ? 'number' : 'text'}
                                                    value={rule.value}
                                                    onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                                                    className="w-full bg-input-bg border border-input-border text-input-text rounded-xl px-4 py-2 text-xs focus:border-secondary focus:ring-4 focus:ring-secondary/5 focus:outline-none transition-all font-bold placeholder:text-slate-400"
                                                    placeholder="..."
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export const filterData = (data: any[], rules: FilterRule[], columns: ColumnConfig[]) => {
    if (rules.length === 0) return data;

    return data.filter(row => {
        return rules.every(rule => {
            const rawValue = row[rule.field];
            const filterValue = rule.value;
            const column = columns.find(c => c.targetHeader === rule.field);

            if (rule.operator === 'is_not_empty') {
                return rawValue !== null && rawValue !== undefined && String(rawValue).trim() !== '';
            }

            if (rawValue === null || rawValue === undefined) return false;

            if (column?.type === 'date' && rawValue instanceof Date) {
                if (!filterValue) return true;
                const filterDate = new Date(filterValue);
                const rowDateNoTime = new Date(rawValue.getFullYear(), rawValue.getMonth(), rawValue.getDate());
                const filterDateNoTime = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate());

                if (rule.operator === 'eq_date') return rowDateNoTime.getTime() === filterDateNoTime.getTime();
                if (rule.operator === 'after_date') return rowDateNoTime > filterDateNoTime;
                if (rule.operator === 'before_date') return rowDateNoTime < filterDateNoTime;
            }

            if ((column?.type === 'number' || column?.type === 'currency') && typeof rawValue === 'number') {
                if (filterValue === '') return true;
                const numFilter = parseFloat(filterValue);
                if (isNaN(numFilter)) return true;
                if (rule.operator === 'equals') return rawValue === numFilter;
                if (rule.operator === 'gt') return rawValue > numFilter;
                if (rule.operator === 'lt') return rawValue < numFilter;
            }

            const strValue = String(rawValue).toLowerCase();
            const strFilter = String(filterValue).toLowerCase();

            if (rule.operator === 'equals') return strValue === strFilter;
            if (rule.operator === 'contains') return strValue.includes(strFilter);
            if (rule.operator === 'not_contains') return !strValue.includes(strFilter);
            if (rule.operator === 'startsWith') return strValue.startsWith(strFilter);

            return true;
        });
    });
};
