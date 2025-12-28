'use client';

import React, { useState, useRef } from 'react';
import { Play, Loader2, BrainCircuit, Upload, Check, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { ColumnConfig } from './ColumnMapper';

interface ProcessorProps {
    data: any[];
    columns: ColumnConfig[];
    instruction: string;
    onInstructionChange: (val: string) => void;
    onUpdateData: (updatedData: any[]) => void;
}

export default function Processor({ data, columns, instruction, onInstructionChange, onUpdateData }: ProcessorProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleProcess = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        setProgress(0);

        const okStatuses = ['goedgekeurd', 'approved', 'correct', 'ok'];
        const dataToProcess = data.filter(row => !okStatuses.includes(String(row.AI_Status || '').toLowerCase()));

        const total = dataToProcess.length;
        if (total === 0) {
            setIsProcessing(false);
            setProgress(100);
            return;
        }

        const updatedData = [...data];
        const BATCH_SIZE = 3;

        for (let i = 0; i < total; i += BATCH_SIZE) {
            const batch = dataToProcess.slice(i, i + BATCH_SIZE);

            const promises = batch.map(async (row) => {
                try {
                    const response = await fetch('/api/process', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            row,
                            instruction,
                            columnConfigs: columns
                        }),
                    });

                    if (!response.ok) throw new Error('Failed');

                    const result = await response.json();

                    const rowIdx = updatedData.findIndex(r => r._id === row._id);
                    if (rowIdx !== -1) {
                        updatedData[rowIdx] = {
                            ...updatedData[rowIdx],
                            'AI_Status': result.status,
                            'AI_Reasoning': result.reasoning
                        };
                    }

                } catch (error) {
                    console.error(error);
                    const rowIdx = updatedData.findIndex(r => r._id === row._id);
                    if (rowIdx !== -1) {
                        updatedData[rowIdx] = {
                            ...updatedData[rowIdx],
                            'AI_Status': 'Error',
                            'AI_Reasoning': 'Verwerking mislukt'
                        };
                    }
                }
            });

            await Promise.all(promises);
            setProgress(Math.min(100, Math.round(((i + BATCH_SIZE) / total) * 100)));
            onUpdateData([...updatedData]);
        }

        setIsProcessing(false);
        setProgress(100);
    };

    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result;
            if (typeof text === 'string') {
                onInstructionChange(text);
                setMessage({ type: 'success', text: 'Prompt geïmporteerd!' });
                setTimeout(() => setMessage(null), 3000);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="glass-card rounded-xl p-6 space-y-6 text-left">
            <div className="flex items-center justify-between border-b border-slate-700/50 pb-4">
                <div className="flex items-center gap-3">
                    <BrainCircuit className="w-6 h-6 text-purple-400" />
                    <h2 className="text-xl font-bold text-white">AI Verwerking</h2>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        title="Importeren uit bestand"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors"
                    >
                        <Upload className="w-4 h-4" />
                        <input type="file" ref={fileInputRef} onChange={handleFileImport} className="hidden" accept=".txt,.md" />
                    </button>
                </div>
            </div>

            {message && (
                <div className={clsx(
                    "p-2 rounded text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-1",
                    message.type === 'success' ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                )}>
                    {message.type === 'success' ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    {message.text}
                </div>
            )}

            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Instructies</label>
                <textarea
                    value={instruction}
                    onChange={(e) => onInstructionChange(e.target.value)}
                    className="w-full h-32 bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-slate-200 focus:border-purple-500 focus:outline-none resize-none"
                    placeholder="Beschrijf waar de AI op moet controleren..."
                />
            </div>

            {isProcessing && (
                <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-400">
                        <span>Bezig...</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                            className="bg-purple-500 h-full transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            )}

            <button
                onClick={handleProcess}
                disabled={isProcessing || data.length === 0}
                className={clsx(
                    "w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all",
                    isProcessing
                        ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/20"
                )}
            >
                {isProcessing ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" /> Bezig...
                    </>
                ) : (
                    <>
                        <Play className="w-5 h-5" /> Start Verwerking ({data.length} regels)
                    </>
                )}
            </button>
        </div>
    );
}
