'use client';

import React, { useState, useMemo } from 'react';
import FileUpload from '@/components/FileUpload';
import ColumnMapper, { ColumnConfig } from '@/components/ColumnMapper';
import DataTable from '@/components/DataTable';
import FilterBuilder, { FilterRule, filterData } from '@/components/FilterBuilder';
import Processor from '@/components/Processor';
import ReportPanel from '@/components/ReportPanel';
import { ExcelData } from '@/lib/excel-utils';
import { ArrowLeft, Loader2, FolderClosed, Save, BrainCircuit, Filter, FileText, LayoutGrid, Check, Trash2, Sun, Moon } from 'lucide-react';
import { UnifiedProfile } from '@/lib/profile-utils';
import clsx from 'clsx';

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

  // Theme State - Forced Dark
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  React.useEffect(() => {
    // Force Dark Mode
    setTheme('dark');
    document.documentElement.classList.add('dark');
    localStorage.theme = 'dark';
  }, []);

  const toggleTheme = () => {
    // Disabled for now
  };

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

      if (matching.length > 0) {
        // Sort by most recently updated
        const sorted = matching.sort((a, b) =>
          (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0)
        );

        applyProfile(sorted[0]);

        if (sorted.length > 1) {
          setAvailableProfiles(sorted);
          // Don't show modal automatically anymore, we auto-load the latest.
          // User can switch via the button if needed.
        }
      }
    } catch (e) {
      console.error("Auto-load failed", e);
    }
  };

  const applyProfile = (p: UnifiedProfile) => {
    setActiveProfile(p);
    setProfileName(p.name);
    setFilterRules(p.filters || []);
    setAiInstruction(p.aiInstruction || '');
    setReportSettings(p.reportSettings || { groupBy: '', selectedColumns: [], headerText: '' });
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
    <main className="min-h-screen p-8 flex flex-col items-center relative overflow-hidden transition-colors duration-300">
      {/* Vibrant Background Accents */}
      <div className="fixed inset-0 pointer-events-none transition-opacity">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/30 blur-[120px]" />
        <div className="absolute bottom-[0%] right-[-5%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[100px]" />
        <div className="absolute top-[40%] right-[10%] w-[30%] h-[30%] rounded-full bg-accent/20 blur-[80px]" />
      </div>

      {/* Profile Selector Modal */}
      {showProfileSelector && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-teal-900/20 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="glass-card max-w-lg w-full p-8 rounded-3xl animate-in zoom-in duration-300 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/20 rounded-xl">
                  <FolderClosed className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white force-light-text">Selecteer Profiel</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Passend bij dit bestandsformaat.</p>
                </div>
              </div>
              <button onClick={() => setShowProfileSelector(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                <ArrowLeft className="w-6 h-6 rotate-90" />
              </button>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto mb-6 pr-2">
              {availableProfiles.length === 0 && (
                <div className="text-center py-8 text-slate-500 italic">Geen matchende profielen gevonden.</div>
              )}
              {availableProfiles.map(p => (
                <div key={p.id} className="group relative">
                  <button
                    onClick={() => {
                      applyProfile(p);
                      setShowProfileSelector(false);
                    }}
                    className={clsx(
                      "w-full text-left p-4 rounded-xl border transition-all flex justify-between items-center pr-12",
                      activeProfile?.id === p.id
                        ? "bg-primary/10 border-primary/50 text-slate-900 dark:text-white"
                        : "bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:border-primary/50 text-slate-700 dark:text-slate-300 shadow-sm"
                    )}
                  >
                    <div>
                      <div className="font-medium group-hover:text-primary transition-colors">{p.name}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                        Laatst bijgewerkt: {p.updatedAt?.seconds ? new Date(p.updatedAt.seconds * 1000).toLocaleDateString('nl-NL') : 'Onbekend'}
                      </div>
                    </div>
                    {activeProfile?.id === p.id && <Check className="w-4 h-4 text-primary" />}
                  </button>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (confirm(`Weet je zeker dat je profiel "${p.name}" wilt verwijderen?`)) {
                        const { deleteProfile, getProfiles } = await import('@/lib/profile-utils');
                        await deleteProfile(p.id!);
                        const updated = await getProfiles();
                        const currentHeaders = columnConfig.map(c => c.originalHeader).sort();
                        setAvailableProfiles(updated.filter(up => JSON.stringify([...up.headers].sort()) === JSON.stringify(currentHeaders)));
                        if (activeProfile?.id === p.id) setActiveProfile(null);
                      }
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowProfileSelector(false)}
              className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-white font-medium transition-colors border border-slate-200 dark:border-slate-700"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}
      <header className="w-full max-w-7xl flex justify-between items-center mb-12 relative z-10 glass px-6 py-4 rounded-3xl">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="weMaron Logo" className="h-10 w-auto object-contain block dark:hidden" />
          <img src="/logo.png" alt="weMaron Logo" className="h-10 w-auto object-contain hidden dark:block brightness-200" />
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-secondary to-primary dark:from-blue-400 dark:to-purple-500">
            Excel Processor <span className="opacity-40 text-sm font-normal ml-2">v1.1</span>
          </h1>
        </div>
        {step !== 'upload' && (
          <div className="flex items-center gap-4">
            <div className="text-secondary font-medium text-xs glass px-4 py-2 rounded-full border-secondary/20">
              Bestand: <span className="text-foreground">{fileName}</span>
            </div>
            {step === 'dashboard' && (
              <button
                onClick={() => setStep('upload')} // Simple reset for now
                className="text-foreground/50 hover:text-primary transition-colors text-sm font-bold"
              >
                Opnieuw
              </button>
            )}
            <button
              onClick={toggleTheme}
              className="hidden p-3 rounded-2xl glass hover:bg-white/40 text-foreground/60 hover:text-primary transition-all ml-2"
              title={theme === 'dark' ? 'Wissel naar Licht' : 'Wissel naar Donker'}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        )}
      </header>

      <div className="w-full max-w-7xl flex-1 flex flex-col items-center">
        {step === 'upload' && (
          <div className="text-center space-y-8 animate-in fade-in zoom-in duration-500 mt-20">
            <div className="space-y-4">
              <h2 className="text-5xl font-black text-foreground tracking-tighter">Importeer Data</h2>
              <p className="text-foreground/60 font-medium text-lg">Upload je Excel bestand om te beginnen.</p>
            </div>
            <FileUpload onDataLoaded={handleDataLoaded} />
          </div>
        )}

        {step === 'mapping' && rawData && (
          <div className="w-full animate-in slide-in-from-right duration-500">
            <div className="mb-4">
              <button
                onClick={() => setStep('upload')}
                className="flex items-center text-foreground/60 hover:text-foreground transition-colors font-bold"
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
                <div className="glass-card p-6 space-y-2 border-l-4 border-l-accent animate-in slide-in-from-left duration-500">
                  <div className="text-slate-700 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4" /> Totaal Regels
                  </div>
                  <div className="text-3xl font-black text-slate-950 dark:text-white force-light-text">{filteredData.length} <span className="text-base font-normal opacity-40">/ {processedData.length}</span></div>
                </div>

                <div className="glass-card p-6 space-y-4 border-l-4 border-l-secondary">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-secondary">
                      <Save className="w-5 h-5" />
                      <h3 className="font-bold">Profiel</h3>
                    </div>
                    <button
                      onClick={async () => {
                        const { getProfiles } = await import('@/lib/profile-utils');
                        const all = await getProfiles();
                        const currentHeaders = columnConfig.map(c => c.originalHeader).sort();
                        setAvailableProfiles(all.filter(p => JSON.stringify([...p.headers].sort()) === JSON.stringify(currentHeaders)));
                        setShowProfileSelector(true);
                      }}
                      className="text-[10px] text-secondary/80 hover:text-secondary hover:underline transition-all uppercase font-black tracking-widest"
                    >
                      Wissel profiel
                    </button>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-700 dark:text-slate-400 font-black uppercase tracking-[0.2em] block mb-1.5 ml-1">Naam</label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => {
                        setProfileName(e.target.value);
                        // If name changes, we are potentially saving a NEW profile
                        if (activeProfile && e.target.value !== activeProfile.name) {
                          setActiveProfile({ ...activeProfile, id: undefined, name: e.target.value });
                        }
                      }}
                      placeholder="bv. Maandelijkse Check"
                      className="w-full bg-input-bg border border-input-border rounded-xl px-4 py-2 text-sm text-slate-950 dark:text-white focus:border-secondary focus:ring-2 focus:ring-secondary/10 focus:outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                  {!activeProfile?.id && (
                    <button
                      onClick={() => handleSaveAsNew(profileName || 'Nieuw Profiel')}
                      className="w-full bg-secondary/10 hover:bg-secondary/20 text-secondary py-2 rounded font-bold text-sm transition-all border border-secondary/20"
                    >
                      Sla op als nieuw profiel
                    </button>
                  )}
                  {activeProfile?.id && (
                    <div className="text-[10px] text-secondary/60 text-right font-black uppercase tracking-widest mt-2 px-1">
                      Auto-save actief <span className="opacity-40">(5s)</span>
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
