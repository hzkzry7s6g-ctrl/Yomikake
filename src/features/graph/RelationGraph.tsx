import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import type { Character, Relation } from '../../db/db';
import { db } from '../../db/db';
import { hueFromText } from '../../lib/presets';
import { boundsOf, layoutGraph, type NodePos } from './layout';

const R = 24;

/** 人物の相関図。ドラッグで並べ替え(位置は保存)、タップで人物カードを開く */
export function RelationGraph({
  characters,
  relations,
  onTap,
  selectedId,
}: {
  characters: Character[];
  relations: Relation[];
  onTap: (id: number) => void;
  selectedId?: number | null;
}) {
  const layoutKey = characters.map((c) => `${c.id}:${c.x ?? ''},${c.y ?? ''}`).join('|') +
    '#' + relations.map((r) => `${r.fromId}-${r.toId}`).join('|');
  // 人物の増減・保存位置・関係が変わったときだけ配置し直す
  const computed = useMemo(() => layoutGraph(characters, relations), [layoutKey]);
  const [pos, setPos] = useState<NodePos[]>(computed);
  const [view, setView] = useState(() => boundsOf(computed));
  useEffect(() => {
    setPos(computed);
    setView(boundsOf(computed));
  }, [computed]);

  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: number; startX: number; startY: number; moved: boolean } | null>(null);

  const toSvg = (e: PointerEvent) => {
    const m = svg.current!.getScreenCTM()!.inverse();
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m);
    return { x: p.x, y: p.y };
  };

  const byId = new Map(pos.map((p) => [p.id, p]));
  const nameOf = new Map(characters.map((c) => [c.id, c]));

  // 同じ向きの関係は「兄・ライバル」のようにまとめて1本の線にする
  const edges = new Map<string, { from: number; to: number; labels: string[] }>();
  for (const r of relations) {
    if (!byId.has(r.fromId) || !byId.has(r.toId) || r.fromId === r.toId) continue;
    const key = `${r.fromId}>${r.toId}`;
    const e = edges.get(key) ?? { from: r.fromId, to: r.toId, labels: [] };
    if (!e.labels.includes(r.label)) e.labels.push(r.label);
    edges.set(key, e);
  }

  if (characters.length === 0) {
    return <div className="empty">人物を追加すると、ここに相関図ができます。</div>;
  }

  return (
    <svg
      ref={svg}
      className="graph"
      viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const p = toSvg(e);
        if (Math.hypot(p.x - d.startX, p.y - d.startY) > 6) d.moved = true;
        if (d.moved) setPos((ps) => ps.map((n) => (n.id === d.id ? { ...n, ...p } : n)));
      }}
      onPointerUp={() => {
        const d = drag.current;
        drag.current = null;
        if (!d) return;
        if (!d.moved) return onTap(d.id);
        const p = byId.get(d.id);
        if (p) void db.characters.update(d.id, { x: Math.round(p.x), y: Math.round(p.y) });
      }}
      onPointerLeave={() => (drag.current = null)}
    >
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" className="graph-arrow" />
        </marker>
      </defs>
      {[...edges.values()].map((e) => {
        const a = byId.get(e.from)!;
        const b = byId.get(e.to)!;
        const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const ux = (b.x - a.x) / len;
        const uy = (b.y - a.y) / len;
        // 逆向きの関係と重ならないよう、線を進行方向の右側へ少しずらす
        const both = edges.has(`${e.to}>${e.from}`);
        const off = both ? 7 : 0;
        const ox = -uy * off;
        const oy = ux * off;
        const x1 = a.x + ux * R + ox;
        const y1 = a.y + uy * R + oy;
        const x2 = b.x - ux * (R + 3) + ox;
        const y2 = b.y - uy * (R + 3) + oy;
        const mx = (x1 + x2) / 2 + ox * 1.6;
        const my = (y1 + y2) / 2 + oy * 1.6;
        return (
          <g key={`${e.from}>${e.to}`}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} className="graph-edge" markerEnd="url(#arrow)" />
            <text x={mx} y={my} className="graph-label" textAnchor="middle" dominantBaseline="middle">
              {e.labels.join('・')}
            </text>
          </g>
        );
      })}
      {pos.map((p) => {
        const c = nameOf.get(p.id);
        if (!c) return null;
        return (
          <g
            key={p.id}
            transform={`translate(${p.x},${p.y})`}
            className={`graph-node${selectedId === p.id ? ' selected' : ''}`}
            style={{ '--hue': hueFromText(c.name) } as CSSProperties}
            onPointerDown={(e) => {
              (e.target as Element).releasePointerCapture?.(e.pointerId);
              const s = toSvg(e);
              drag.current = { id: p.id, startX: s.x, startY: s.y, moved: false };
            }}
            role="button"
            aria-label={c.name}
          >
            <circle r={R} />
            <text className="graph-initial" textAnchor="middle" dominantBaseline="central">
              {[...c.name].slice(0, 2).join('')}
            </text>
            <text className="graph-name" y={R + 14} textAnchor="middle">
              {c.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
