import { useState } from 'react';
import { Settings, Shield, Cpu, HardDrive, Hash, Save, CheckCircle2, Sliders, Lock } from 'lucide-react';

export default function SettingsPage() {
  const [threads, setThreads] = useState(8);
  const [chunkSize, setChunkSize] = useState('4MB');
  const [safeExportPath, setSafeExportPath] = useState('/forensic/recovered');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto font-sans">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <Settings className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 font-mono tracking-tight">
                Forensic Workstation &amp; Engine Settings
              </h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Engine parallelism parameters, kernel write-block enforcement &amp; sandbox defaults
              </p>
            </div>
          </div>
        </div>
        {saved && (
          <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5 animate-pulse bg-emerald-950/40 border border-emerald-600/40 px-3 py-1.5 rounded-lg">
            <CheckCircle2 className="w-4 h-4" /> Preferences Committed to Engine
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Write-Block & Safety */}
        <div className="rounded-2xl bg-[#080d19] border border-[#152138] p-5 space-y-4 shadow-[0_4px_25px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-100 font-mono">
            <Shield className="w-4 h-4 text-emerald-400" />
            Write-Block Hardware &amp; Kernel Policy
          </div>

          <div className="space-y-3 text-xs font-mono">
            <label className="flex items-center gap-3 p-3.5 bg-[#050811] rounded-xl border border-[#141f36] cursor-pointer">
              <input type="checkbox" defaultChecked disabled className="rounded bg-[#050811] text-cyan-500" />
              <div>
                <div className="text-slate-200 font-semibold flex items-center gap-2">
                  <span>Strict Kernel O_RDONLY Flag Enforcement (Immutable)</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-700/40">
                    LOCKED
                  </span>
                </div>
                <div className="text-slate-400 text-[10px] mt-0.5">
                  Prevents all write/flush IOCTLs to mounted raw evidence block devices and disk images
                </div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3.5 bg-[#050811] rounded-xl border border-[#141f36] cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded bg-[#050811] text-cyan-500" />
              <div>
                <div className="text-slate-200 font-semibold">Executable Bit Neutralization on Recovered Binaries</div>
                <div className="text-slate-400 text-[10px] mt-0.5">
                  Force permissions to chmod 0640 to prevent accidental malware execution on host
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Engine Performance & Parallelism */}
        <div className="rounded-2xl bg-[#080d19] border border-[#152138] p-5 space-y-4 shadow-[0_4px_25px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-100 font-mono">
            <Cpu className="w-4 h-4 text-cyan-400" />
            Rayon Parallel Extent Scanner Engine
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <label className="block text-slate-400 mb-1.5 font-semibold">Worker Thread Allocation</label>
              <input
                type="number"
                min={1}
                max={64}
                value={threads}
                onChange={(e) => setThreads(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-[#050811] border border-[#19253d] rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1.5 font-semibold">Scan Chunk Buffer Size</label>
              <select
                value={chunkSize}
                onChange={(e) => setChunkSize(e.target.value)}
                className="w-full px-3 py-2 bg-[#050811] border border-[#19253d] rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500/50"
              >
                <option value="1MB">1 MiB (Low Memory Profile)</option>
                <option value="4MB">4 MiB (Balanced - Optimal for NVMe)</option>
                <option value="16MB">16 MiB (High Throughput Enterprise SAN)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Storage & Safe Export */}
        <div className="rounded-2xl bg-[#080d19] border border-[#152138] p-5 space-y-4 shadow-[0_4px_25px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-100 font-mono">
            <HardDrive className="w-4 h-4 text-amber-400" />
            Sandbox Isolation Output Directory
          </div>

          <div className="text-xs font-mono space-y-2">
            <label className="block text-slate-400 font-semibold">Target Output Path</label>
            <input
              type="text"
              value={safeExportPath}
              onChange={(e) => setSafeExportPath(e.target.value)}
              className="w-full px-3 py-2 bg-[#050811] border border-[#19253d] rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500/50"
            />
            <div className="text-[10px] text-slate-400">
              Must be located on a distinct physical volume from original bitstream evidence.
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-slate-900 font-mono font-bold text-xs transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.25)] cursor-pointer"
          >
            <Save className="w-4 h-4" /> Save Configuration
          </button>
        </div>
      </form>
    </div>
  );
}
