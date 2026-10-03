import { useRef, useEffect, useCallback } from 'react';

/**
 * ForensicVisualization — Next-gen interactive evidence-node graph on <canvas>.
 *
 * Features:
 *  - Evidence nodes with typed colors and pulsing glows
 *  - Curved bezier connections with animated data packets
 *  - Cursor-reactive parallax, lighting halo, and proximity label reveal
 *  - Drifting filesystem metadata ghost labels
 *  - Faint grid dots
 *  - Scanning horizontal trace line
 *  - Floating hex fragments
 *  - Subtle particle field
 */

interface Node {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  radius: number;
  label: string;
  type: 'inode' | 'extent' | 'hash' | 'metadata' | 'evidence' | 'carved';
  connections: number[];
  pulsePhase: number;
  driftSpeed: number;
  driftAngle: number;
  depth: number; // 0–1, for parallax layering
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface GhostLabel {
  x: number;
  y: number;
  text: string;
  opacity: number;
  speed: number;
}

interface HexFragment {
  x: number;
  y: number;
  text: string;
  opacity: number;
  speed: number;
  phase: number;
}

const NODE_COLORS: Record<string, { fill: string; stroke: string; glow: string }> = {
  inode:    { fill: 'rgba(59,130,246,0.12)',  stroke: '#3b82f6', glow: 'rgba(59,130,246,0.25)' },
  extent:   { fill: 'rgba(34,211,238,0.10)',  stroke: '#22d3ee', glow: 'rgba(34,211,238,0.20)' },
  hash:     { fill: 'rgba(167,139,250,0.10)', stroke: '#a78bfa', glow: 'rgba(167,139,250,0.20)' },
  metadata: { fill: 'rgba(52,211,153,0.10)',  stroke: '#34d399', glow: 'rgba(52,211,153,0.20)' },
  evidence: { fill: 'rgba(251,191,36,0.10)',  stroke: '#fbbf24', glow: 'rgba(251,191,36,0.20)' },
  carved:   { fill: 'rgba(244,63,94,0.10)',   stroke: '#f43f5e', glow: 'rgba(244,63,94,0.20)' },
};

const LABELS = [
  { label: 'inode #134217728', type: 'inode' as const },
  { label: 'SHA-256 ✓', type: 'hash' as const },
  { label: 'extent[0..3]', type: 'extent' as const },
  { label: 'mtime recovered', type: 'metadata' as const },
  { label: '%PDF-1.7 header', type: 'evidence' as const },
  { label: 'block carver', type: 'carved' as const },
  { label: 'di_nlink → 0', type: 'inode' as const },
  { label: 'BLAKE3 match', type: 'hash' as const },
  { label: 'gen 476 commit', type: 'metadata' as const },
  { label: 'AG btree scan', type: 'extent' as const },
  { label: 'subvol unlink', type: 'evidence' as const },
  { label: 'PEM -----BEGIN', type: 'carved' as const },
  { label: 'ctime cross-ref', type: 'metadata' as const },
  { label: 'ext map valid', type: 'extent' as const },
  { label: 'fragment #2', type: 'inode' as const },
  { label: 'O_RDONLY lock', type: 'hash' as const },
  { label: 'xfs_sb_t v5', type: 'extent' as const },
  { label: 'btrfs_root_item', type: 'metadata' as const },
  { label: 'SQLite header', type: 'evidence' as const },
  { label: 'ELF magic', type: 'carved' as const },
];

const GHOST_LABELS_TEXT = [
  '/var/data/finance/', 'AGF block 0x0', 'chunk_tree rootid=3',
  'transid: 476', 'sb_magicnum: XFSB', 'di_format: extents',
  'objectid: 257', 'level=0 nritems=4', 'crc32c: 0xA7B2',
  'inode_item_data', 'extent_ref_v0', 'sb_rootino: 128',
  'sb_agblocks: 131072', 'TREE_BLOCK_REF', 'sb_blocksize: 4096',
];

const HEX_FRAGMENTS = [
  '25 50 44 46 2d', '58 46 53 42 00', '5f 42 48 52 66',
  '7f 45 4c 46 02', '89 50 4e 47 0d', '50 4b 03 04 14',
  '53 51 4c 69 74', '2d 2d 2d 2d 2d', 'ff d8 ff e0 00',
];

function createNodes(w: number, h: number): Node[] {
  const nodes: Node[] = [];
  const count = Math.min(LABELS.length, Math.max(12, Math.floor((w * h) / 35000)));

  for (let i = 0; i < count; i++) {
    const { label, type } = LABELS[i % LABELS.length];
    // Distribute more nodes to the right side (hero visualization area)
    const x = 60 + Math.random() * (w - 120);
    const y = 40 + Math.random() * (h - 80);
    const radius = 2.5 + Math.random() * 3.5;

    const connections: number[] = [];
    const numConn = 1 + Math.floor(Math.random() * 3);
    for (let c = 0; c < numConn; c++) {
      const target = Math.floor(Math.random() * count);
      if (target !== i && !connections.includes(target)) connections.push(target);
    }

    nodes.push({
      x, y, baseX: x, baseY: y, radius, label, type,
      connections,
      pulsePhase: Math.random() * Math.PI * 2,
      driftSpeed: 0.08 + Math.random() * 0.25,
      driftAngle: Math.random() * Math.PI * 2,
      depth: 0.3 + Math.random() * 0.7,
    });
  }
  return nodes;
}

function createParticles(w: number, h: number): Particle[] {
  const particles: Particle[] = [];
  const count = Math.min(40, Math.floor((w * h) / 25000));
  const colors = ['#3b82f6', '#22d3ee', '#a78bfa', '#34d399', '#fbbf24'];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -0.1 - Math.random() * 0.4,
      life: Math.random() * 200,
      maxLife: 200 + Math.random() * 300,
      size: 0.5 + Math.random() * 1.5,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }
  return particles;
}

function createGhostLabels(w: number, h: number): GhostLabel[] {
  return GHOST_LABELS_TEXT.map((text) => ({
    x: Math.random() * w,
    y: Math.random() * h,
    text,
    opacity: 0,
    speed: 0.15 + Math.random() * 0.3,
  }));
}

function createHexFragments(w: number, h: number): HexFragment[] {
  return HEX_FRAGMENTS.map((text) => ({
    x: 100 + Math.random() * (w - 200),
    y: Math.random() * h,
    text,
    opacity: 0,
    speed: 0.1 + Math.random() * 0.2,
    phase: Math.random() * Math.PI * 2,
  }));
}

export default function ForensicVisualization() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const ghostsRef = useRef<GhostLabel[]>([]);
  const hexRef = useRef<HexFragment[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const animFrameRef = useRef(0);
  const timeRef = useRef(0);
  const scanYRef = useRef(0);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      nodesRef.current = createNodes(rect.width, rect.height);
      particlesRef.current = createParticles(rect.width, rect.height);
      ghostsRef.current = createGhostLabels(rect.width, rect.height);
      hexRef.current = createHexFragments(rect.width, rect.height);
    };

    resize();
    window.addEventListener('resize', resize);
    canvas.addEventListener('mousemove', handleMouseMove);

    const draw = () => {
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);
      timeRef.current += 0.016;
      const t = timeRef.current;

      ctx.clearRect(0, 0, w, h);

      const nodes = nodesRef.current;
      const particles = particlesRef.current;
      const ghosts = ghostsRef.current;
      const hexFragments = hexRef.current;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // ── Cursor-reactive radial light ──
      if (mx > 0 && my > 0) {
        const gradient = ctx.createRadialGradient(mx, my, 0, mx, my, 350);
        gradient.addColorStop(0, 'rgba(59,130,246,0.04)');
        gradient.addColorStop(0.5, 'rgba(59,130,246,0.015)');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
      }

      // ── Grid dots ──
      const gridSize = 50;
      ctx.fillStyle = 'rgba(59,130,246,0.04)';
      for (let gx = gridSize; gx < w; gx += gridSize) {
        for (let gy = gridSize; gy < h; gy += gridSize) {
          ctx.beginPath();
          ctx.arc(gx, gy, 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ── Scanning trace line ──
      scanYRef.current = (scanYRef.current + 0.4) % h;
      const scanY = scanYRef.current;
      const scanGrad = ctx.createLinearGradient(0, scanY - 1, 0, scanY + 1);
      scanGrad.addColorStop(0, 'transparent');
      scanGrad.addColorStop(0.5, 'rgba(59,130,246,0.12)');
      scanGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = scanGrad;
      ctx.fillRect(0, scanY - 40, w, 80);
      // Bright center line
      ctx.strokeStyle = 'rgba(59,130,246,0.15)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, scanY);
      ctx.lineTo(w, scanY);
      ctx.stroke();

      // ── Ghost Labels (drifting filesystem metadata) ──
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      for (const ghost of ghosts) {
        ghost.y -= ghost.speed * 0.3;
        if (ghost.y < -20) {
          ghost.y = h + 20;
          ghost.x = Math.random() * w;
        }
        // fade in/out near edges
        const edgeFade = Math.min(ghost.y / 100, (h - ghost.y) / 100, 1);
        ghost.opacity = edgeFade * 0.06;

        // Proximity brightening
        const dx = mx - ghost.x;
        const dy = my - ghost.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200) {
          ghost.opacity += (200 - dist) / 200 * 0.08;
        }

        ctx.globalAlpha = ghost.opacity;
        ctx.fillStyle = '#60a5fa';
        ctx.fillText(ghost.text, ghost.x, ghost.y);
      }
      ctx.globalAlpha = 1;

      // ── Hex Fragments (floating) ──
      ctx.font = '7px "JetBrains Mono", monospace';
      for (const hf of hexFragments) {
        const floatY = Math.sin(t * 0.5 + hf.phase) * 8;
        const displayY = hf.y + floatY;
        hf.y -= hf.speed * 0.15;
        if (hf.y < -20) {
          hf.y = h + 20;
          hf.x = 100 + Math.random() * (w - 200);
        }
        const edgeFade = Math.min(hf.y / 120, (h - hf.y) / 120, 1);
        hf.opacity = edgeFade * 0.04;
        const dx = mx - hf.x;
        const dy = my - displayY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          hf.opacity += (150 - dist) / 150 * 0.1;
        }
        ctx.globalAlpha = hf.opacity;
        ctx.fillStyle = '#a78bfa';
        ctx.fillText(hf.text, hf.x, displayY);
      }
      ctx.globalAlpha = 1;

      // ── Update node positions ──
      for (const node of nodes) {
        node.x = node.baseX + Math.sin(t * node.driftSpeed + node.driftAngle) * 15 * node.depth;
        node.y = node.baseY + Math.cos(t * node.driftSpeed * 0.7 + node.driftAngle) * 10 * node.depth;

        // Mouse influence — parallax by depth
        const dx = mx - node.x;
        const dy = my - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 300) {
          const force = (300 - dist) / 300;
          node.x -= dx * force * 0.04 * node.depth;
          node.y -= dy * force * 0.04 * node.depth;
        }
      }

      // ── Draw connections ──
      for (const node of nodes) {
        for (const ci of node.connections) {
          if (ci >= nodes.length) continue;
          const target = nodes[ci];
          const dx = target.x - node.x;
          const dy = target.y - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 450) continue;

          const alpha = Math.max(0.02, 0.1 * (1 - dist / 450));
          const colors = NODE_COLORS[node.type];

          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          const cpx = (node.x + target.x) / 2 + (dy * 0.12);
          const cpy = (node.y + target.y) / 2 - (dx * 0.12);
          ctx.quadraticCurveTo(cpx, cpy, target.x, target.y);

          ctx.strokeStyle = colors.stroke;
          ctx.globalAlpha = alpha;
          ctx.lineWidth = 0.6;
          ctx.stroke();

          // Data packet
          const packetT = ((t * 0.25 + node.pulsePhase) % 1);
          const px = node.x + dx * packetT;
          const py = node.y + dy * packetT;
          ctx.beginPath();
          ctx.arc(px, py, 1.8, 0, Math.PI * 2);
          ctx.fillStyle = colors.stroke;
          ctx.globalAlpha = alpha * 0.8;
          ctx.fill();

          ctx.globalAlpha = 1;
        }
      }

      // ── Draw nodes ──
      for (const node of nodes) {
        const colors = NODE_COLORS[node.type];
        const pulse = 0.7 + Math.sin(t * 1.5 + node.pulsePhase) * 0.3;
        const r = node.radius * pulse;

        const dx = mx - node.x;
        const dy = my - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Glow ring on proximity
        if (dist < 180) {
          const glowAlpha = ((180 - dist) / 180) * 0.5;
          const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, 35);
          gradient.addColorStop(0, colors.glow);
          gradient.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(node.x, node.y, 35, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.globalAlpha = glowAlpha;
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        // Outer ring
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 3, 0, Math.PI * 2);
        ctx.strokeStyle = colors.stroke;
        ctx.globalAlpha = 0.08;
        ctx.lineWidth = 0.5;
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Node core
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = colors.fill;
        ctx.fill();
        ctx.strokeStyle = colors.stroke;
        ctx.globalAlpha = 0.6;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Inner bright dot
        ctx.beginPath();
        ctx.arc(node.x, node.y, r * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = colors.stroke;
        ctx.globalAlpha = 0.4 * pulse;
        ctx.fill();
        ctx.globalAlpha = 1;

        // Label reveal on proximity
        if (dist < 140) {
          const labelAlpha = Math.min(1, (140 - dist) / 70);
          ctx.font = '9px "JetBrains Mono", monospace';
          ctx.fillStyle = colors.stroke;
          ctx.globalAlpha = labelAlpha * 0.75;
          ctx.textAlign = 'left';

          // Label background
          const textW = ctx.measureText(node.label).width;
          const lx = node.x + r + 8;
          const ly = node.y + 3;
          ctx.fillStyle = 'rgba(6,8,15,0.7)';
          ctx.fillRect(lx - 3, ly - 9, textW + 6, 12);
          ctx.fillStyle = colors.stroke;
          ctx.fillText(node.label, lx, ly);
          ctx.globalAlpha = 1;
        }
      }

      // ── Particles ──
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.life += 1;
        if (p.life > p.maxLife || p.y < -10) {
          p.x = Math.random() * w;
          p.y = h + 10;
          p.life = 0;
          p.vx = (Math.random() - 0.5) * 0.3;
          p.vy = -0.1 - Math.random() * 0.4;
        }
        const lifeRatio = p.life / p.maxLife;
        const fadeIn = Math.min(lifeRatio * 5, 1);
        const fadeOut = Math.max(1 - (lifeRatio - 0.7) / 0.3, 0);
        const alpha = fadeIn * fadeOut * 0.25;

        // Mouse proximity boost
        const dx = mx - p.x;
        const dy = my - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const boost = dist < 200 ? 1 + (200 - dist) / 200 * 0.8 : 1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha * boost;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleMouseMove]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: 'block' }}
    />
  );
}
