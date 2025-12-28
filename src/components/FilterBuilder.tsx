'use client';

import React from 'react';
import { ColumnConfig } from './ColumnMapper';
import { Plus, Trash2, Filter } from 'lucide-react';

export type FilterOperator = 'contains' | 'equals' | 'startsWith' | 'gt' | 'lt' | 'eq_date' | 'after_date' | 'before_date';

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
                    { label: 'Gelijk aan', value: 'equals' },
                    { label: 'Begint met', value: 'startsWith' }
                ];
        }
    };

    if (columns.length === 0) return null;

    return (
        <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-6 space-y-4 relative z-20 text-left">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Filter className="w-5 h-5 text-primary" /> Filter
                </h3>
                <button
                    onClick={addRule}
                    className="text-sm bg-primary/20 text-primary hover:bg-primary/30 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                >
                    <Plus className="w-4 h-4" /> Regel
                </button>
            </div>

            {rules.length === 0 ? (
                <div className="text-center py-4 text-slate-500 text-sm border-2 border-dashed border-slate-700/50 rounded-lg">
                    Geen filters actief. Voeg een regel toe.
                </div>
            ) : (
                <div className="space-y-3">
                    {rules.map((rule) => {
                        const column = columns.find(c => c.targetHeader === rule.field);
                        const operators = column ? getOperatorsForType(column.type) : [];

                        return (
                            <div key={rule.id} className="flex flex-col gap-2 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 animate-in fade-in slide-in-from-top-2 relative z-30">
                                <div className="flex justify-between items-center">
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
                                        className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1.5 text-xs focus:border-primary focus:outline-none flex-1 mr-2"
                                    >
                                        {columns.map(col => (
                                            <option key={col.targetHeader} value={col.targetHeader}>{col.targetHeader}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => removeRule(rule.id)}
                                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>

                                <div className="flex gap-2">
                                    <select
                                        value={rule.operator}
                                        onChange={(e) => updateRule(rule.id, { operator: e.target.value as FilterOperator })}
                                        className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1.5 text-xs focus:border-primary focus:outline-none w-1/3"
                                    >
                                        {operators.map(op => (
                                            <option key={op.value} value={op.value}>{op.label}</option>
                                        ))}
                                    </select>

                                    <input
                                        type={column?.type === 'date' ? 'date' : (column?.type === 'number' || column?.type === 'currency') ? 'number' : 'text'}
                                        value={rule.value}
                                        onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                                        className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1.5 text-xs focus:border-primary focus:outline-none flex-1 min-w-0"
                                        placeholder="..."
                                    />
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
            if (rule.operator === 'startsWith') return strValue.startsWith(strFilter);

            return true;
        });
    });
};
