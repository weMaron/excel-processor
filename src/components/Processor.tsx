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
        const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

                    const result = await response.json();

                    const rowIdx = updatedData.findIndex(r => r._id === row._id);
                    if (rowIdx !== -1) {
                        if (!response.ok) {
                            updatedData[rowIdx] = {
                                ...updatedData[rowIdx],
                                'AI_Status': 'Error',
                                'AI_Reasoning': result.reasoning || result.details || 'Fout bij verwerking'
                            };
                        } else {
                            updatedData[rowIdx] = {
                                ...updatedData[rowIdx],
                                'AI_Status': result.status,
                                'AI_Reasoning': result.reasoning
                            };
                        }
                    }

                } catch (error: any) {
                    console.error(error);
                    const rowIdx = updatedData.findIndex(r => r._id === row._id);
                    if (rowIdx !== -1) {
                        updatedData[rowIdx] = {
                            ...updatedData[rowIdx],
                            'AI_Status': 'Error',
                            'AI_Reasoning': error.message || 'Verbinding mislukt'
                        };
                    }
                }
            });

            await Promise.all(promises);
            setProgress(Math.min(100, Math.round(((i + BATCH_SIZE) / total) * 100)));
            onUpdateData([...updatedData]);

            // Add delay between batches to avoid rate limits
            if (i + BATCH_SIZE < total) {
                await sleep(1000); // 1 second delay
            }
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
        <div className="glass-card p-6 space-y-6 text-left">
            <div className="flex items-center justify-between border-b border-card-border pb-4">
                <div className="flex items-center gap-3">
                    <BrainCircuit className="w-6 h-6 text-secondary" />
                    <h2 className="text-xl font-black text-foreground tracking-tight">AI Verwerking</h2>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        title="Importeren uit bestand"
                        className="p-2 rounded-xl bg-secondary/10 hover:bg-secondary/20 text-secondary transition-all border border-secondary/20 shadow-sm"
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
                <label className="text-[10px] text-foreground/50 font-black uppercase tracking-[0.2em] block">Instructies</label>
                <textarea
                    value={instruction}
                    onChange={(e) => onInstructionChange(e.target.value)}
                    className="w-full h-32 bg-input-bg border border-input-border rounded-2xl p-4 text-sm text-input-text focus:border-secondary focus:ring-4 focus:ring-secondary/5 focus:outline-none resize-none transition-all shadow-inner placeholder:text-slate-400"
                    placeholder="Beschrijf waar de AI op moet controleren..."
                />
            </div>

            {isProcessing && (
                <div className="space-y-3 animate-in fade-in zoom-in duration-300">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em] text-secondary">
                        <span className="flex items-center gap-2">
                            <Loader2 className="w-3 h-3 animate-spin" /> Verwerken...
                        </span>
                        <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-secondary/10 rounded-full h-2 overflow-hidden border border-secondary/5">
                        <div
                            className="bg-gradient-to-r from-secondary to-primary h-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            )}

            <button
                onClick={handleProcess}
                disabled={isProcessing || data.length === 0}
                className={clsx(
                    "w-full py-4 rounded-3xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl",
                    isProcessing
                        ? "bg-secondary/20 text-secondary cursor-not-allowed opacity-50"
                        : "bg-gradient-to-r from-secondary to-primary hover:from-secondary/90 hover:to-primary/90 text-white shadow-secondary/20"
                )}
            >
                {isProcessing ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" /> Bezig...
                    </>
                ) : (
                    <>
                        <Play className="w-5 h-5" /> Start ({data.length})
                    </>
                )}
            </button>
        </div>
    );
}
