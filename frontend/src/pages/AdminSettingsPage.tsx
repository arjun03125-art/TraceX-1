import { useState } from 'react';
import { useApp } from '../store/AppContext';
import type { AppSettings } from '../types/forensic';
import {
  Settings, Save, RotateCcw, Shield, HardDrive, Cpu,
  ScrollText, Palette, CheckCircle2, Lock, Terminal
} from 'lucide-react';
import clsx from 'clsx';

export default function AdminSettingsPage() {
  const { settings, updateSettings } = useApp();
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(localSettings);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleReset = () => {
    const defaultSettings: AppSettings = {
      general: {
        applicationName: 'Trace X',
        defaultInvestigator: '',
        defaultOrganization: '',
      },
      engine: {
        workerThreads: 8,
        chunkSize: '4MB',
        exportPath: '/forensic/recovered',
      },
      security: {
        readOnlyEnforced: true,
        execBitNeutralization: true,
      },
      evidence: {
        defaultHashAlgorithm: 'SHA-256',
        autoVerifyOnAdd: false,
      },
      audit: {
        enabled: true,
        retentionDays: 365,
      },
      appearance: {
        theme: 'dark',
        compactMode: false,
      },
    };
    setLocalSettings(defaultSettings);
    updateSettings(defaultSettings);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <Settings className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 font-mono tracking-tight">
                System & Engine Settings
              </h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Configure persistent system policies, security parameters, and engine allocation
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 rounded-xl bg-[#0e1629] hover:bg-[#152342] border border-[#1b2a47] text-slate-300 transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.25)]"
          >
            <Save className="w-4 h-4" />
            SAVE SETTINGS
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 font-mono text-xs flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          Settings saved successfully and persisted across sessions.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 font-mono text-xs">
        {/* Section 1: General & Lab Information */}
        <div className="p-5 rounded-2xl bg-[#080d19] border border-[#152138] shadow-[0_4px_25px_rgba(0,0,0,0.3)] space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#141f36]">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-slate-200">General Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Application Name</label>
              <input
                type="text"
                value={localSettings.general.applicationName}
                onChange={e => setLocalSettings({
                  ...localSettings,
                  general: { ...localSettings.general, applicationName: e.target.value }
                })}
                className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Default Examiner Name</label>
              <input
                type="text"
                value={localSettings.general.defaultInvestigator}
                onChange={e => setLocalSettings({
                  ...localSettings,
                  general: { ...localSettings.general, defaultInvestigator: e.target.value }
                })}
                placeholder="e.g. Lead Examiner"
                className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Default Organization / Lab</label>
              <input
                type="text"
                value={localSettings.general.defaultOrganization}
                onChange={e => setLocalSettings({
                  ...localSettings,
                  general: { ...localSettings.general, defaultOrganization: e.target.value }
                })}
                placeholder="e.g. Forensic Lab"
                className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Security & Chain of Custody */}
        <div className="p-5 rounded-2xl bg-[#080d19] border border-[#152138] shadow-[0_4px_25px_rgba(0,0,0,0.3)] space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#141f36]">
            <Lock className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-slate-200">Security & Write-Block Policies</h2>
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 rounded-xl bg-[#0d1527] border border-[#1b2a47] cursor-pointer hover:border-emerald-500/40 transition-colors">
              <div>
                <div className="text-slate-200 font-semibold">Enforce Read-Only Evidence Access (O_RDONLY)</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Strict hardware/kernel level read-only mounts to preserve image immutability</div>
              </div>
              <input
                type="checkbox"
                checked={localSettings.security.readOnlyEnforced}
                onChange={e => setLocalSettings({
                  ...localSettings,
                  security: { ...localSettings.security, readOnlyEnforced: e.target.checked }
                })}
                className="w-4 h-4 rounded text-cyan-500 bg-[#16223b] border-slate-700"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-[#0d1527] border border-[#1b2a47] cursor-pointer hover:border-emerald-500/40 transition-colors">
              <div>
                <div className="text-slate-200 font-semibold">Executable Bit Neutralization</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Strip execute permissions (chmod 0644) from carved files to prevent accidental execution of malware</div>
              </div>
              <input
                type="checkbox"
                checked={localSettings.security.execBitNeutralization}
                onChange={e => setLocalSettings({
                  ...localSettings,
                  security: { ...localSettings.security, execBitNeutralization: e.target.checked }
                })}
                className="w-4 h-4 rounded text-cyan-500 bg-[#16223b] border-slate-700"
              />
            </label>
          </div>
        </div>

        {/* Section 3: Evidence & Hashing */}
        <div className="p-5 rounded-2xl bg-[#080d19] border border-[#152138] shadow-[0_4px_25px_rgba(0,0,0,0.3)] space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#141f36]">
            <HardDrive className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-slate-200">Evidence Ingestion Parameters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Default Cryptographic Hash Algorithm</label>
              <select
                value={localSettings.evidence.defaultHashAlgorithm}
                onChange={e => setLocalSettings({
                  ...localSettings,
                  evidence: { ...localSettings.evidence, defaultHashAlgorithm: e.target.value as 'SHA-256' | 'SHA-512' | 'MD5' }
                })}
                className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="SHA-256">SHA-256 (NIST Standard)</option>
                <option value="SHA-512">SHA-512 (High Security)</option>
                <option value="MD5">MD5 (Legacy Compatibility)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Automatic Verification on Ingestion</label>
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.evidence.autoVerifyOnAdd}
                    onChange={e => setLocalSettings({
                      ...localSettings,
                      evidence: { ...localSettings.evidence, autoVerifyOnAdd: e.target.checked }
                    })}
                    className="w-4 h-4 rounded text-cyan-500 bg-[#16223b] border-slate-700"
                  />
                  <span className="text-slate-300">Compute and verify SHA-256 immediately upon adding source</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Engine Allocation */}
        <div className="p-5 rounded-2xl bg-[#080d19] border border-[#152138] shadow-[0_4px_25px_rgba(0,0,0,0.3)] space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#141f36]">
            <Cpu className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-bold text-slate-200">Forensic Engine Hardware Allocation</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Parallel Worker Threads ({localSettings.engine.workerThreads})
              </label>
              <input
                type="range"
                min={1}
                max={32}
                value={localSettings.engine.workerThreads}
                onChange={e => setLocalSettings({
                  ...localSettings,
                  engine: { ...localSettings.engine, workerThreads: parseInt(e.target.value, 10) }
                })}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Carving Chunk Buffer Size</label>
              <select
                value={localSettings.engine.chunkSize}
                onChange={e => setLocalSettings({
                  ...localSettings,
                  engine: { ...localSettings.engine, chunkSize: e.target.value }
                })}
                className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="1MB">1 MB (Low Memory)</option>
                <option value="4MB">4 MB (Balanced)</option>
                <option value="16MB">16 MB (High Performance)</option>
                <option value="64MB">64 MB (Extreme NVMe)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Export Recovery Directory</label>
              <input
                type="text"
                value={localSettings.engine.exportPath}
                onChange={e => setLocalSettings({
                  ...localSettings,
                  engine: { ...localSettings.engine, exportPath: e.target.value }
                })}
                className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Section 5: Audit Log Retention */}
        <div className="p-5 rounded-2xl bg-[#080d19] border border-[#152138] shadow-[0_4px_25px_rgba(0,0,0,0.3)] space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#141f36]">
            <ScrollText className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-slate-200">Cryptographic Audit Trail Policy</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center justify-between p-3 rounded-xl bg-[#0d1527] border border-[#1b2a47] cursor-pointer">
                <div>
                  <div className="text-slate-200 font-semibold">Enable Continuous Audit Logging</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Records all create, edit, delete, and verification actions</div>
                </div>
                <input
                  type="checkbox"
                  checked={localSettings.audit.enabled}
                  onChange={e => setLocalSettings({
                    ...localSettings,
                    audit: { ...localSettings.audit, enabled: e.target.checked }
                  })}
                  className="w-4 h-4 rounded text-cyan-500 bg-[#16223b] border-slate-700"
                />
              </label>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Retention Period (Days)</label>
              <input
                type="number"
                min={30}
                max={3650}
                value={localSettings.audit.retentionDays}
                onChange={e => setLocalSettings({
                  ...localSettings,
                  audit: { ...localSettings.audit, retentionDays: parseInt(e.target.value, 10) || 365 }
                })}
                className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
