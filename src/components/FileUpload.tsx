'use client';

import React, { useRef, useState } from 'react';
import { FileSpreadsheet, X } from 'lucide-react';
import { parseExcel, ExcelData } from '@/lib/excel-utils';
import clsx from 'clsx';

interface FileUploadProps {
    onDataLoaded: (data: ExcelData, fileName: string) => void;
}

export default function FileUpload({ onDataLoaded }: FileUploadProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const processFile = async (file: File) => {
        if (!file) return;

        // Validate file type
        const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'];
        // Check extension as fallback
        const validExtensions = ['.xlsx', '.xls', '.csv'];
        const hasValidExt = validExtensions.some(ext => file.name.endsWith(ext));

        if (!validTypes.includes(file.type) && !hasValidExt) {
            setError('Upload een geldig Excel of CSV bestand.');
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            const data = await parseExcel(file);
            onDataLoaded(data, file.name);
        } catch (err) {
            console.error(err);
            setError('Verwerken mislukt. Is het bestand geldig?');
        } finally {
            setIsProcessing(false);
            setIsDragging(false);
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            processFile(files[0]);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            processFile(files[0]);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto">
            <div
                className={clsx(
                    "relative border-2 border-dashed rounded-xl p-12 transition-all duration-300 ease-in-out cursor-pointer",
                    isDragging
                        ? "border-primary bg-primary/10 scale-[1.02]"
                        : "border-slate-600 hover:border-slate-500 hover:bg-slate-800/50 bg-slate-800/20",
                    isProcessing && "opacity-50 pointer-events-none"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    accept=".xlsx,.xls,.csv"
                />

                <div className="flex flex-col items-center justify-center text-center space-y-4">
                    <div className={clsx(
                        "p-4 rounded-full transition-colors",
                        isDragging ? "bg-primary/20 text-primary" : "bg-slate-700/50 text-slate-400"
                    )}>
                        {isProcessing ? (
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current" />
                        ) : (
                            <FileSpreadsheet className="w-8 h-8" />
                        )}
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold text-white">
                            {isProcessing ? 'Verwerken...' : 'Sleep je Excel bestand hier'}
                        </h3>
                        <p className="text-sm text-slate-400 mt-1">
                            of klik om te bladeren
                        </p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400">
                    <X className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm">{error}</p>
                </div>
            )}
        </div>
    );
}
