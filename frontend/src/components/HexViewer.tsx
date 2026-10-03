import React, { useState, useMemo } from 'react';
import { Search, Copy, Check, ChevronLeft, ChevronRight, Hash, Eye, RefreshCw } from 'lucide-react';

export interface HexViewerProps {
  /** Raw byte data as Uint8Array, number array, or hex string */
  data?: Uint8Array | number[] | string;
  /** Title or filename for the header */
  title?: string;
  /** Bytes per line, standard is 16 */
  bytesPerLine?: number;
  /** Initial selected offset */
  initialOffset?: number;
  /** Maximum bytes to display at once (pagination for large blobs) */
  pageSize?: number;
  className?: string;
}

/**
 * Professional forensic Hex Viewer component.
 * Supports byte inspection, ASCII synchronization, endian decoding, and search.
 */
export function HexViewer({
  data,
  title = 'Forensic Artifact Hex Stream',
  bytesPerLine = 16,
  initialOffset = 0,
  pageSize = 512,
  className = '',
}: HexViewerProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [hoveredOffset, setHoveredOffset] = useState<number | null>(null);
  const [selectedOffset, setSelectedOffset] = useState<number | null>(initialOffset);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  // Normalize data into a Uint8Array
  const bytes = useMemo(() => {
    if (!data) {
      // Default demo payload if none provided
      const sample = "XFSB\x00\x00\x10\x00\x00\x00\x00\x00\x00\x00\x04\x00TraceX Forensic Data Recovery Engine v1.0 -- High Integrity Inode Extent Stream";
      const arr = new Uint8Array(sample.length);
      for (let i = 0; i < sample.length; i++) arr[i] = sample.charCodeAt(i);
      return arr;
    }
    if (data instanceof Uint8Array) return data;
    if (Array.isArray(data)) return new Uint8Array(data);
    if (typeof data === 'string') {
      // If it looks like pure hex (e.g. "494e00..."), decode as hex
      const clean = data.replace(/\s+/g, '');
      if (/^[0-9a-fA-F]+$/.test(clean) && clean.length % 2 === 0) {
        const out = new Uint8Array(clean.length / 2);
        for (let i = 0; i < clean.length; i += 2) {
          out[i / 2] = parseInt(clean.substring(i, i + 2), 16);
        }
        return out;
      }
      // Otherwise treat as raw string bytes
      const out = new Uint8Array(data.length);
      for (let i = 0; i < data.length; i++) out[i] = data.charCodeAt(i) & 0xff;
      return out;
    }
    return new Uint8Array(0);
  }, [data]);

  const totalPages = Math.max(1, Math.ceil(bytes.length / pageSize));
  const startOffset = currentPage * pageSize;
  const endOffset = Math.min(bytes.length, startOffset + pageSize);
  const visibleBytes = useMemo(() => bytes.slice(startOffset, endOffset), [bytes, startOffset, endOffset]);

  // Build rows
  const rows = useMemo(() => {
    const list: { offset: number; bytes: number[] }[] = [];
    for (let i = 0; i < visibleBytes.length; i += bytesPerLine) {
      const rowBytes: number[] = [];
      for (let j = 0; j < bytesPerLine && i + j < visibleBytes.length; j++) {
        rowBytes.push(visibleBytes[i + j]);
      }
      list.push({ offset: startOffset + i, bytes: rowBytes });
    }
    return list;
  }, [visibleBytes, startOffset, bytesPerLine]);

  // Selected byte details
  const inspectorData = useMemo(() => {
    if (selectedOffset === null || selectedOffset < 0 || selectedOffset >= bytes.length) {
      return null;
    }
    const val = bytes[selectedOffset];
    const u16Le = selectedOffset + 1 < bytes.length ? (bytes[selectedOffset] | (bytes[selectedOffset + 1] << 8)) : null;
    const u16Be = selectedOffset + 1 < bytes.length ? ((bytes[selectedOffset] << 8) | bytes[selectedOffset + 1]) : null;
    const u32Le = selectedOffset + 3 < bytes.length
      ? (bytes[selectedOffset] | (bytes[selectedOffset + 1] << 8) | (bytes[selectedOffset + 2] << 16) | (bytes[selectedOffset + 3] << 24)) >>> 0
      : null;

    return {
      offsetHex: '0x' + selectedOffset.toString(16).padStart(8, '0').toUpperCase(),
      offsetDec: selectedOffset,
      hex: val.toString(16).padStart(2, '0').toUpperCase(),
      dec: val,
      binary: val.toString(2).padStart(8, '0'),
      char: val >= 32 && val <= 126 ? String.fromCharCode(val) : '·',
      u16Le,
      u16Be,
      u32Le,
    };
  }, [bytes, selectedOffset]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCopyHex = () => {
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
    handleCopy(hex, 'hex');
  };

  return (
    <div className={`flex flex-col rounded-xl bg-[#090d1a] border border-[#1b253b] shadow-2xl overflow-hidden font-mono text-xs ${className}`}>
      {/* ── Toolbar Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#0d1424] border-b border-[#1b253b]">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-slate-200 tracking-wide">{title}</span>
          <span className="text-[10px] text-slate-500 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
            {bytes.length.toLocaleString()} bytes
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Jump to Offset */}
          <div className="flex items-center gap-1.5 bg-[#080c18] px-2 py-1 rounded border border-[#1b253b]">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Jump (0x... or dec)"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                const q = e.target.value.trim();
                let off = -1;
                if (q.startsWith('0x') || q.startsWith('0X')) {
                  off = parseInt(q, 16);
                } else if (/^\d+$/.test(q)) {
                  off = parseInt(q, 10);
                }
                if (!isNaN(off) && off >= 0 && off < bytes.length) {
                  setSelectedOffset(off);
                  setCurrentPage(Math.floor(off / pageSize));
                }
              }}
              className="bg-transparent text-slate-200 text-xs w-28 focus:outline-none placeholder-slate-600"
            />
          </div>

          {/* Copy Hex Button */}
          <button
            onClick={handleCopyHex}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#10192e] text-slate-300 hover:text-cyan-400 border border-[#202d4a] hover:border-cyan-500/40 transition-colors"
            title="Copy all bytes as hex string"
          >
            {copied === 'hex' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied === 'hex' ? 'Copied' : 'Copy Hex'}</span>
          </button>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5 bg-[#080c18] px-2 py-0.5 rounded border border-[#1b253b]">
              <button
                disabled={currentPage === 0}
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] text-slate-400">
                {currentPage + 1}/{totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages - 1}
                onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Main Hex Grid ── */}
      <div className="p-4 overflow-x-auto select-text">
        {/* Column Headers */}
        <div className="grid grid-cols-[100px_1fr_180px] gap-4 pb-2 border-b border-[#1b253b]/60 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
          <div>Offset</div>
          <div className="grid grid-cols-16 gap-x-1.5 text-center">
            {Array.from({ length: 16 }).map((_, i) => (
              <span key={i} className={i === 8 ? 'border-l border-slate-800' : ''}>
                {i.toString(16).toUpperCase()}
              </span>
            ))}
          </div>
          <div className="tracking-widest">ASCII</div>
        </div>

        {/* Rows */}
        <div className="space-y-1 pt-2">
          {rows.map((row) => (
            <div
              key={row.offset}
              className="grid grid-cols-[100px_1fr_180px] gap-4 py-0.5 rounded hover:bg-[#10182c]/60 transition-colors"
            >
              {/* Offset */}
              <div className="text-slate-500 select-none">
                {row.offset.toString(16).padStart(8, '0').toUpperCase()}
              </div>

              {/* 16 Hex Bytes */}
              <div className="grid grid-cols-16 gap-x-1.5 text-center">
                {Array.from({ length: 16 }).map((_, colIdx) => {
                  const hasByte = colIdx < row.bytes.length;
                  const byteVal = hasByte ? row.bytes[colIdx] : null;
                  const currentOff = row.offset + colIdx;
                  const isHovered = hoveredOffset === currentOff;
                  const isSelected = selectedOffset === currentOff;

                  if (!hasByte) {
                    return <span key={colIdx} className="text-slate-800">..</span>;
                  }

                  const isZero = byteVal === 0;
                  const isPrintable = (byteVal ?? 0) >= 32 && (byteVal ?? 0) <= 126;

                  return (
                    <span
                      key={colIdx}
                      onMouseEnter={() => setHoveredOffset(currentOff)}
                      onMouseLeave={() => setHoveredOffset(null)}
                      onClick={() => setSelectedOffset(currentOff)}
                      className={`cursor-pointer rounded transition-all duration-100 ${
                        colIdx === 8 ? 'border-l border-slate-800 pl-1' : ''
                      } ${
                        isSelected
                          ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_8px_rgba(6,182,212,0.6)]'
                          : isHovered
                          ? 'bg-cyan-950 text-cyan-300 ring-1 ring-cyan-500/50'
                          : isZero
                          ? 'text-slate-600'
                          : isPrintable
                          ? 'text-slate-200'
                          : 'text-amber-400/80'
                      }`}
                    >
                      {byteVal!.toString(16).padStart(2, '0').toUpperCase()}
                    </span>
                  );
                })}
              </div>

              {/* ASCII representation */}
              <div className="tracking-widest flex items-center">
                {row.bytes.map((b, colIdx) => {
                  const currentOff = row.offset + colIdx;
                  const isHovered = hoveredOffset === currentOff;
                  const isSelected = selectedOffset === currentOff;
                  const isPrintable = b >= 32 && b <= 126;
                  const ch = isPrintable ? String.fromCharCode(b) : '·';

                  return (
                    <span
                      key={colIdx}
                      onMouseEnter={() => setHoveredOffset(currentOff)}
                      onMouseLeave={() => setHoveredOffset(null)}
                      onClick={() => setSelectedOffset(currentOff)}
                      className={`cursor-pointer px-[1px] rounded ${
                        isSelected
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : isHovered
                          ? 'bg-cyan-950 text-cyan-300 ring-1 ring-cyan-500/50'
                          : isPrintable
                          ? 'text-slate-300'
                          : 'text-slate-600'
                      }`}
                    >
                      {ch}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Inspector Drawer (Selected Offset Analysis) ── */}
      {inspectorData && (
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-2.5 bg-[#070b16] border-t border-[#1b253b] text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span className="text-cyan-400 font-semibold">
              Offset: <span className="text-slate-200">{inspectorData.offsetHex}</span> ({inspectorData.offsetDec})
            </span>
            <span className="text-slate-600">|</span>
            <span>
              Hex: <span className="text-cyan-300 font-bold">0x{inspectorData.hex}</span>
            </span>
            <span>
              Dec: <span className="text-slate-200">{inspectorData.dec}</span>
            </span>
            <span>
              Bin: <span className="text-slate-300 font-mono">{inspectorData.binary}</span>
            </span>
            <span>
              Char: <span className="text-emerald-400 font-bold">'{inspectorData.char}'</span>
            </span>
          </div>

          <div className="flex items-center gap-3 text-[10px]">
            {inspectorData.u16Le !== null && (
              <span>u16 LE: <span className="text-slate-300">{inspectorData.u16Le}</span></span>
            )}
            {inspectorData.u16Be !== null && (
              <span>u16 BE: <span className="text-slate-300">{inspectorData.u16Be}</span></span>
            )}
            {inspectorData.u32Le !== null && (
              <span>u32 LE: <span className="text-slate-300">{inspectorData.u32Le}</span></span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default HexViewer;
