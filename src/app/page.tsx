'use client';

import React, { useState, useMemo } from 'react';
import FileUpload from '@/components/FileUpload';
import ColumnMapper, { ColumnConfig } from '@/components/ColumnMapper';
import DataTable from '@/components/DataTable';
import FilterBuilder, { FilterRule, filterData } from '@/components/FilterBuilder';
import Processor from '@/components/Processor';
import ReportPanel from '@/components/ReportPanel';
import { ExcelData } from '@/lib/excel-utils';
import { ArrowLeft, Loader2, FolderClosed, Save, BrainCircuit, Filter, FileText, LayoutGrid } from 'lucide-react';
import { UnifiedProfile } from '@/lib/profile-utils';

export default function Home() {
  const [step, setStep] = useState<'upload' | 'mapping' | 'dashboard'>('upload');
  const [rawData, setRawData] = useState<ExcelData | null>(null);
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>([]);
  const [fileName, setFileName] = useState('');
  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);

  // Unified Profile State
  const [activeProfile, setActiveProfile] = useState<UnifiedProfile | null>(null);
  const [aiInstruction, setAiInstruction] = useState('Analyseer deze regel en bepaal of deze handmatige controle vereist. Zet status op "Controle" of "Goedgekeurd".');
  const [reportSettings, setReportSettings] = useState({
    groupBy: '',
    selectedColumns: [] as string[],
    headerText: ''
  });

  const [availableProfiles, setAvailableProfiles] = useState<UnifiedProfile[]>([]);
  const [showProfileSelector, setShowProfileSelector] = useState(false);
  const [profileName, setProfileName] = useState('');

  const handleDataLoaded = (data: ExcelData, name: string) => {
    setRawData(data);
    setFileName(name);
    setStep('mapping');
  };

  const handleMappingConfirm = async (data: any[], config: ColumnConfig[]) => {
    setProcessedData(data);
    setColumnConfig(config);
    setStep('dashboard');

    // Auto-load headers matching
    try {
      const { getProfiles } = await import('@/lib/profile-utils');
      const profiles = await getProfiles();
      const currentHeaders = config.map(c => c.originalHeader).sort();

      const matching = profiles.filter(p => {
        const pHeaders = [...p.headers].sort();
        return JSON.stringify(pHeaders) === JSON.stringify(currentHeaders);
      });

      if (matching.length === 1) {
        applyProfile(matching[0]);
      } else if (matching.length > 1) {
        setAvailableProfiles(matching);
        setShowProfileSelector(true);
      }
    } catch (e) {
      console.error("Auto-load failed", e);
    }
  };

  const applyProfile = (p: UnifiedProfile) => {
    setActiveProfile(p);
    setFilterRules(p.filters || []);
    setAiInstruction(p.aiInstruction || '');
    setReportSettings(p.reportSettings || { groupBy: '', selectedColumns: [], headerText: '' });
    // Also update column config mapping if it differs? 
    // For now assume if headers match, mapping is compatible.
  };

  // Auto-Save Effect (5 seconds debounce)
  React.useEffect(() => {
    if (step !== 'dashboard' || !activeProfile?.id) return;

    const timeout = setTimeout(async () => {
      try {
        const { saveProfile } = await import('@/lib/profile-utils');
        await saveProfile({
          ...activeProfile,
          filters: filterRules,
          aiInstruction,
          reportSettings,
          mapping: columnConfig
        });
        console.log("Profile auto-saved");
      } catch (e) {
        console.error("Auto-save failed", e);
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [filterRules, aiInstruction, reportSettings, columnConfig, activeProfile, step]);

  // Apply filters automatically
  const filteredData = useMemo(() => {
    return filterData(processedData, filterRules, columnConfig);
  }, [processedData, filterRules, columnConfig]);

  const handleSaveAsNew = async (name: string) => {
    try {
      const { saveProfile } = await import('@/lib/profile-utils');
      const newProfile: UnifiedProfile = {
        name,
        headers: columnConfig.map(c => c.originalHeader),
        mapping: columnConfig,
        filters: filterRules,
        aiInstruction,
        reportSettings
      };
      const result = await saveProfile(newProfile);
      setActiveProfile({ ...newProfile, id: result.id });
    } catch (e) {
      console.error("Save as new failed", e);
    }
  };

  return (
    <main className="min-h-screen p-8 flex flex-col items-center">
      {/* Profile Selector Modal */}
      {showProfileSelector && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-card max-w-lg w-full p-8 rounded-2xl shadow-2xl border border-white/10 animate-in zoom-in duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-primary/20 rounded-xl">
                <FolderClosed className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Profiel Gevonden</h3>
                <p className="text-slate-400 text-sm">Meerdere profielen passen bij dit bestand.</p>
              </div>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto mb-6 pr-2">
              {availableProfiles.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    applyProfile(p);
                    setShowProfileSelector(false);
                  }}
                  className="w-full text-left p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:bg-slate-700/50 hover:border-primary/50 transition-all group"
                >
                  <div className="font-medium text-white group-hover:text-primary transition-colors">{p.name}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Laatst bijgewerkt: {p.updatedAt?.seconds ? new Date(p.updatedAt.seconds * 1000).toLocaleDateString('nl-NL') : 'Onbekend'}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowProfileSelector(false)}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
            >
              Nieuw profiel maken
            </button>
          </div>
        </div>
      )}
      <header className="w-full max-w-7xl flex justify-between items-center mb-12">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="weMaron Logo" className="h-12 w-auto object-contain" />
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            Excel Processor <span className="text-slate-600 text-lg font-normal ml-2">v1.1</span>
          </h1>
        </div>
        {step !== 'upload' && (
          <div className="flex items-center gap-4">
            <div className="text-slate-400 text-sm glass px-3 py-1 rounded-full">
              Bestand: <span className="text-white">{fileName}</span>
            </div>
            {step === 'dashboard' && (
              <button
                onClick={() => setStep('upload')} // Simple reset for now
                className="text-slate-400 hover:text-white transition-colors"
              >
                Opnieuw
              </button>
            )}
          </div>
        )}
      </header>

      <div className="w-full max-w-7xl flex-1 flex flex-col items-center">
        {step === 'upload' && (
          <div className="text-center space-y-8 animate-in fade-in zoom-in duration-500 mt-20">
            <div className="space-y-2">
              <h2 className="text-4xl font-bold text-white">Importeer Data</h2>
              <p className="text-slate-400 text-lg">Upload je Excel bestand om te beginnen.</p>
            </div>
            <FileUpload onDataLoaded={handleDataLoaded} />
          </div>
        )}

        {step === 'mapping' && rawData && (
          <div className="w-full animate-in slide-in-from-right duration-500">
            <div className="mb-4">
              <button
                onClick={() => setStep('upload')}
                className="flex items-center text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Terug
              </button>
            </div>
            <ColumnMapper
              data={rawData}
              onConfirm={handleMappingConfirm}
              onCancel={() => {
                setStep('upload');
                setRawData(null);
              }}
            />
          </div>
        )}

        {step === 'dashboard' && (
          <div className="w-full space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Sidebar / Top area for controls */}
              <div className="lg:col-span-1 space-y-6">
                {/* Stats Card */}
                <div className="glass-card p-6 rounded-xl space-y-2">
                  <div className="text-slate-400 text-sm uppercase font-semibold flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4" /> Totaal Regels
                  </div>
                  <div className="text-3xl font-bold text-white">{filteredData.length} <span className="text-base font-normal text-slate-500">/ {processedData.length}</span></div>
                </div>

                {/* Profile Info & Save */}
                <div className="glass-card p-6 rounded-xl space-y-4 border-l-4 border-primary">
                  <div className="flex items-center gap-2 text-primary">
                    <Save className="w-5 h-5" />
                    <h3 className="font-bold">Profiel</h3>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1 uppercase">Naam</label>
                    <input
                      type="text"
                      value={activeProfile?.name || profileName}
                      onChange={(e) => {
                        if (activeProfile) setActiveProfile({ ...activeProfile, name: e.target.value });
                        else setProfileName(e.target.value);
                      }}
                      placeholder="bv. Maandelijkse Check"
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:border-primary focus:outline-none"
                    />
                  </div>
                  {!activeProfile?.id && (
                    <button
                      onClick={() => handleSaveAsNew(profileName || 'Nieuw Profiel')}
                      className="w-full bg-primary/20 hover:bg-primary/30 text-primary py-2 rounded font-medium text-sm transition-all"
                    >
                      Sla op als profiel
                    </button>
                  )}
                  {activeProfile?.id && (
                    <div className="text-[10px] text-slate-500 text-right">
                      Auto-save actief (5s)
                    </div>
                  )}
                </div>

                {/* Filter Builder */}
                <FilterBuilder
                  columns={columnConfig}
                  rules={filterRules}
                  onFilterChange={setFilterRules}
                />

                <Processor
                  data={filteredData}
                  columns={columnConfig}
                  instruction={aiInstruction}
                  onInstructionChange={setAiInstruction}
                  onUpdateData={(newData) => {
                    const updatedMap = new Map(newData.map(r => [r._id, r]));
                    const newProcessedData = processedData.map(r => updatedMap.get(r._id) || r);
                    setProcessedData(newProcessedData);

                    const hasAI = newData.some(r => r.AI_Status);
                    if (hasAI && !columnConfig.find(c => c.targetHeader === 'AI_Status')) {
                      setColumnConfig([
                        ...columnConfig,
                        { originalHeader: 'AI_Status', targetHeader: 'AI_Status', type: 'string' },
                        { originalHeader: 'AI_Reasoning', targetHeader: 'AI_Reasoning', type: 'string' }
                      ]);
                    }
                  }}
                />

                <ReportPanel
                  data={filteredData}
                  columns={columnConfig}
                  settings={reportSettings}
                  onSettingsChange={setReportSettings}
                  filtersDescription={filterRules.length > 0
                    ? filterRules.map(r => `${r.field} ${r.operator} ${r.value}`).join(', ')
                    : 'Geen filters'
                  }
                />
              </div>

              {/* Main Table Area */}
              <div className="lg:col-span-3">
                <DataTable data={filteredData} columns={columnConfig} />
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
