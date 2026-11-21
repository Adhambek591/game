// ---------- intro fly-over points: the real posted groups / bosses of the running mission (map.js flyFor) ----------
export const INTRO_M = {};
export function flyPoints() { const gs = ((G.mis && G.mis.groups) || []).filter(g => !g.o || !g.o.nofly); if (!gs.length) return null; gs.sort((a, b) => b.z - a.z);
  let pick = gs; if (gs.length > 5) { const keep = new Set(gs.filter(g => g.boss)); keep.add(gs[0]); keep.add(gs[gs.length - 1]); for (let i = 1; keep.size < 5 && i < gs.length - 1; i += Math.max(1, Math.round(gs.length / 4))) keep.add(gs[i]); pick = gs.filter(g => keep.has(g)); }
  return pick.map(g => { const b = g.boss; return { x: b ? b.x : g.x, z: b ? b.z : g.z, g, label: t(g.label), boss: !!b, name: b ? t(g.bossName || b.d.name || g.label) : '', img: g.img || null, chap: !!g.chapBoss, big: b && b.d.heavy }; }); }
export const flyStart = on => { G.flying = !!on; };
