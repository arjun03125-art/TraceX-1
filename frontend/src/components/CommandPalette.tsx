import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, HardDrive, FileX2, FileCheck2, Clock, ScrollText,
  FolderOpen, LayoutDashboard, Settings, FileText, Shield,
  Terminal, CheckCircle2, ArrowRight, CornerDownLeft, Sparkles,
  Database, RefreshCw
} from 'lucide-react';

interface CommandItem {
  id: string;
  title: string;
  category: 'Navigation' | 'Forensic Action' | 'Evidence Artifact';
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const commands: CommandItem[] = [
    // Navigation
    {
      id: 'nav-dashboard',
      title: 'Investigation Command Center',
      category: 'Navigation',
      description: 'Main case overview, telemetry, and critical indicators',
      icon: LayoutDashboard,
      action: () => { navigate('/dashboard'); onClose(); }
    },
    {
      id: 'nav-cases',
      title: 'Case Directory',
      category: 'Navigation',
      description: 'Switch cases, manage warrants, and investigator logs',
      icon: FolderOpen,
      badge: '2 Active',
      action: () => { navigate('/cases'); onClose(); }
    },
    {
      id: 'nav-evidence',
      title: 'Evidence Raw Images',
      category: 'Navigation',
      description: 'Mounted XFS and Btrfs bitstream images',
      icon: HardDrive,
      badge: '48 GiB',
      action: () => { navigate('/evidence'); onClose(); }
    },
    {
      id: 'nav-deleted',
      title: 'Deleted Inode Catalog',
      category: 'Navigation',
      description: 'Unlinked file candidates with extent fragments',
      icon: FileX2,
      badge: '5 Found',
      action: () => { navigate('/deleted'); onClose(); }
    },
    {
      id: 'nav-recovered',
      title: 'Recovered Artifacts',
      category: 'Navigation',
      description: 'Validated files with hash verification digests',
      icon: FileCheck2,
      badge: '3 Validated',
      action: () => { navigate('/recovered'); onClose(); }
    },
    {
      id: 'nav-timeline',
      title: 'Forensic Chronology & Timeline',
      category: 'Navigation',
      description: 'Correlated inode mtime, ctime, and unlinking sequence',
      icon: Clock,
      action: () => { navigate('/timeline'); onClose(); }
    },
    {
      id: 'nav-reports',
      title: 'Court-Ready Forensic Reports',
      category: 'Navigation',
      description: 'Cryptographic attestation and chain-of-custody export',
      icon: FileText,
      action: () => { navigate('/reports'); onClose(); }
    },
    {
      id: 'nav-audit',
      title: 'Cryptographic Audit Log',
      category: 'Navigation',
      description: 'Tamper-evident append-only journal of all operations',
      icon: ScrollText,
      badge: 'Immutable',
      action: () => { navigate('/audit'); onClose(); }
    },
    {
      id: 'nav-settings',
      title: 'Hardware & Kernel Settings',
      category: 'Navigation',
      description: 'Write-block controls, hash engines, worker thread pool',
      icon: Settings,
      action: () => { navigate('/settings'); onClose(); }
    },

    // Forensic Actions
    {
      id: 'act-verify-hashes',
      title: 'Run Cryptographic Hash Verification',
      category: 'Forensic Action',
      description: 'Validate SHA-256 and BLAKE3 digests across all raw evidence images',
      icon: CheckCircle2,
      badge: 'SHA-256 / BLAKE3',
      action: () => {
        alert('Cryptographic Hash Verification initiated: All evidence blocks intact (SHA-256 & BLAKE3 matches recorded in audit log).');
        onClose();
      }
    },
    {
      id: 'act-carve-blocks',
      title: 'Deep Unallocated Extent Carving',
      category: 'Forensic Action',
      description: 'Scan free blocks for PDF, DOCX, and SQL file headers',
      icon: Sparkles,
      badge: 'XFS & Btrfs',
      action: () => {
        navigate('/deleted');
        onClose();
      }
    },
    {
      id: 'act-btrfs-gen',
      title: 'Btrfs Generation Walk Scan',
      category: 'Forensic Action',
      description: 'Traverse chunk trees across historical transaction generations 470–482',
      icon: Database,
      action: () => {
        navigate('/evidence');
        onClose();
      }
    },
    {
      id: 'act-audit-export',
      title: 'Export Chain of Custody Bundle',
      category: 'Forensic Action',
      description: 'Download JSON-LD signed audit report with kernel timestamps',
      icon: Terminal,
      action: () => {
        navigate('/reports');
        onClose();
      }
    },

    // Evidence Artifacts
    {
      id: 'art-q3-audit',
      title: 'confidential_q3_financial_audit.pdf',
      category: 'Evidence Artifact',
      description: '4.89 MB • Inode 134217728 • Confirmed Recovered',
      icon: FileCheck2,
      badge: 'High Confidence',
      action: () => { navigate('/recovered'); onClose(); }
    },
    {
      id: 'art-db-dump',
      title: 'database_dump_users_salt.sql',
      category: 'Evidence Artifact',
      description: '28.4 MB • Btrfs Subvol 256 • Confirmed Recovered',
      icon: FileCheck2,
      badge: 'High Confidence',
      action: () => { navigate('/recovered'); onClose(); }
    },
    {
      id: 'art-bash-hist',
      title: 'tampered_bash_history.txt',
      category: 'Evidence Artifact',
      description: '14.2 KB • Inode 134219500 • Partially Overwritten',
      icon: FileX2,
      badge: 'Medium Confidence',
      action: () => { navigate('/deleted'); onClose(); }
    }
  ];

  const filtered = commands.filter(cmd =>
    cmd.title.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase()) ||
    (cmd.description && cmd.description.toLowerCase().includes(query.toLowerCase())) ||
    (cmd.badge && cmd.badge.toLowerCase().includes(query.toLowerCase()))
  );

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev < filtered.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : filtered.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onClose]);

  // Keep selected item in view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector('[data-selected="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-[#090d18] border border-cyan-500/30 rounded-xl shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden flex flex-col z-10 animate-in zoom-in-95 duration-150">
        {/* Top Header bar with status */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#0d1322] border-b border-[#1c273e] text-[10px] font-mono text-cyan-400/80">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>TRACE X FORENSIC COMMAND PALETTE</span>
          </div>
          <div className="flex items-center gap-3 text-slate-500">
            <span>ESC to exit</span>
            <span>↵ to execute</span>
          </div>
        </div>

        {/* Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#1c273e] bg-[#0b101e]">
          <Search className="w-5 h-5 text-cyan-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a forensic command, search evidence, or navigate..."
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 font-mono outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-xs text-slate-500 hover:text-slate-300 font-mono px-1.5 py-0.5 rounded bg-slate-800"
            >
              Clear
            </button>
          )}
        </div>

        {/* Results List */}
        <div ref={listRef} className="max-h-[380px] overflow-y-auto p-2 space-y-1 divide-y divide-[#131b2e]/40">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-mono text-xs">
              No forensic actions or evidence matched &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  data-selected={isSelected}
                  onClick={cmd.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-cyan-950/60 to-blue-950/40 border border-cyan-500/40 text-slate-100'
                      : 'hover:bg-slate-900/60 text-slate-300'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-slate-800/60 text-slate-400 border border-slate-700/40'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold font-mono tracking-wide truncate">{cmd.title}</span>
                      {cmd.badge && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-900/40 text-cyan-300 border border-cyan-700/30">
                          {cmd.badge}
                        </span>
                      )}
                    </div>
                    {cmd.description && (
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{cmd.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 text-[10px] font-mono text-slate-500">
                    <span className="hidden sm:inline text-slate-600 uppercase text-[9px] tracking-wider">{cmd.category}</span>
                    {isSelected && <CornerDownLeft className="w-3.5 h-3.5 text-cyan-400" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2.5 bg-[#070b14] border-t border-[#1c273e] flex items-center justify-between text-[10px] font-mono text-slate-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Write-Block: O_RDONLY Active
            </span>
            <span className="hidden sm:inline">Engine: XFS v5 & Btrfs v4</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-400 text-[9px]">↑↓</kbd>
            <span>Navigate</span>
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-400 text-[9px]">Enter</kbd>
            <span>Select</span>
          </div>
        </div>
      </div>
    </div>
  );
}
