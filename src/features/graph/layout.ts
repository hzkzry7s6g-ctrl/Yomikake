import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, type SimulationNodeDatum } from 'd3-force';
import type { Character, Relation } from '../../db/db';

export interface NodePos {
  id: number;
  x: number;
  y: number;
}

interface SimNode extends SimulationNodeDatum {
  id: number;
}

/**
 * 力学モデルで配置する。ドラッグで置いた人物はその位置に固定する。
 * 毎回同じ結果になるよう、初期位置は id から決めた円周上にする。
 */
export function layoutGraph(characters: Character[], relations: Relation[]): NodePos[] {
  const n = characters.length;
  const nodes: SimNode[] = characters.map((c, i) => {
    const angle = (2 * Math.PI * i) / Math.max(n, 1);
    const fixed = c.x !== undefined && c.y !== undefined;
    return {
      id: c.id,
      x: fixed ? c.x : Math.cos(angle) * 120,
      y: fixed ? c.y : Math.sin(angle) * 120,
      fx: fixed ? c.x : undefined,
      fy: fixed ? c.y : undefined,
    };
  });
  const ids = new Set(nodes.map((d) => d.id));
  const links = relations
    .filter((r) => ids.has(r.fromId) && ids.has(r.toId) && r.fromId !== r.toId)
    .map((r) => ({ source: r.fromId, target: r.toId }));

  const sim = forceSimulation(nodes)
    .force('link', forceLink<SimNode, { source: number; target: number }>(links).id((d) => d.id).distance(140))
    .force('charge', forceManyBody().strength(-520))
    .force('collide', forceCollide(60))
    .force('center', forceCenter(0, 0))
    .stop();
  for (let i = 0; i < 300; i++) sim.tick();

  return nodes.map((d) => ({ id: d.id, x: d.x ?? 0, y: d.y ?? 0 }));
}

export function boundsOf(nodes: NodePos[], pad = 60) {
  if (nodes.length === 0) return { x: -150, y: -150, w: 300, h: 300 };
  const xs = nodes.map((p) => p.x);
  const ys = nodes.map((p) => p.y);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const w = Math.max(maxX - minX + pad * 2, 260);
  const h = Math.max(maxY - minY + pad * 2, 220);
  return { x: (minX + maxX) / 2 - w / 2, y: (minY + maxY) / 2 - h / 2, w, h };
}
