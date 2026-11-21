// Qirq qiz — missions (prologue 2 + 7 chapters × 4 = 30), v2: posted enemy groups, convoy, direction arrow, secrets, checkpoints. Each chapter: first mission plays the chapter intro cutscene,
// the last one is the chapter boss and ends the chapter (saveProg / epilogue). Story helpers come from story.js via initMissions(H).
import { G, $, T, THREE, breakable, num, SET, spawn, enemies, gate, marker, setBoss, wait, until, qte, world, refreshSkills, makePlayer, SAVE, addGold, ADS, flash, burst, ringFx, hintRaw, decor, clearLevel, setMood, ensureReal, scene, renderer, gradePass, A, fire, telegraph, toggleMount, camera, markHunt } from './engine.js?v=1795218616';
import { t } from './i18n.js?v=1795218616';
import { Sfx, setMusic } from './audio.js?v=1795218616';
import { applyLight, LIGHTS, place } from './env.js?v=1795218616';
import { makeHorse } from './horse.js?v=1795218616';

// ---------- mission table ----------
// id, c = chapter, ty = type (map icon), n = name key, o = objective key, s = 3 star rules, fl = label of the 'flag' rule, boss = chapter boss (ends chapter)
// rules: win | nodeath | hp50 (HP > 50% at the end) | time:N (finished within N s of game time) | flag / flag2 (mission-specific)
export const MLIST = [
  { id: '0-1', c: 0, ty: 'defend', n: 'v3n_0_1', o: 'v3o_0_1', s: ['win', 'most', 'all'] },
  { id: '0-2', c: 0, ty: 'duel', n: 'mn_0_2', o: 'o_duel', s: ['win', 'flag', 'flag2'], fl: 's_hold', fl2: 's_resist' },
  { id: '1-1', c: 1, ty: 'rescue', n: 'v3n_1_1', o: 'v3o_1_1', s: ['win', 'most', 'all'] },
  { id: '1-2', c: 1, ty: 'rescue', n: 'v3n_1_2', o: 'v3o_1_2', s: ['win', 'most', 'all'] },
  { id: '1-3', c: 1, ty: 'rescue', n: 'v3n_1_3', o: 'v3o_1_3', s: ['win', 'most', 'all'] },
  { id: '1-4', c: 1, ty: 'boss', n: 'n_qa', o: 'o_boss', s: ['win', 'most', 'all'], boss: 1 },
  { id: '2-1', c: 2, ty: 'ride', n: 'v3n_2_1', o: 'f3o_2_1', s: ['win', 'most', 'all'] },
  { id: '2-2', c: 2, ty: 'duel', n: 'v3n_2_2', o: 'v3o_2_2', s: ['win', 'most', 'all'] },
  { id: '2-3', c: 2, ty: 'escort', n: 'v3n_2_3', o: 'f3o_2_3', s: ['win', 'most', 'all'] },
  { id: '2-4', c: 2, ty: 'boss', n: 'n_qd', o: 'f3o_2_4', s: ['win', 'most', 'all'], boss: 1 },
  { id: '3-1', c: 3, ty: 'stealth', n: 'v3n_3_1', o: 'v3o_3_1', s: ['win', 'most', 'all'] },
  { id: '3-2', c: 3, ty: 'rescue', n: 'v3n_3_2', o: 'v3o_3_2', s: ['win', 'most', 'all'] },
  { id: '3-3', c: 3, ty: 'guard', n: 'v3n_3_3', o: 'f3o_3_3', s: ['win', 'most', 'all'] },
  { id: '3-4', c: 3, ty: 'boss', n: 'n_ja', o: 'o_otbasqan', s: ['win', 'most', 'all'], boss: 1 },
  { id: '4-1', c: 4, ty: 'ride', n: 'v3n_4_1', o: 'f3o_4_1', s: ['win', 'most', 'all'] },
  { id: '4-2', c: 4, ty: 'duel', n: 'v3n_4_2', o: 'v3o_4_2', s: ['win', 'most', 'all'] },
  { id: '4-3', c: 4, ty: 'mini', n: 'v3n_4_3', o: 'v3o_4_3', s: ['win', 'most', 'all'] },
  { id: '4-4', c: 4, ty: 'boss', n: 'n_ay', o: 'o_dragon', s: ['win', 'most', 'all'], boss: 1 },
  { id: '5-1', c: 5, ty: 'rescue', n: 'v3n_5_1', o: 'v3o_5_1', s: ['win', 'most', 'all'] },
  { id: '5-2', c: 5, ty: 'duel', n: 'v3n_5_2', o: 'v3o_5_2', s: ['win', 'most', 'all'] },
  { id: '5-3', c: 5, ty: 'rescue', n: 'v3n_5_3', o: 'v3o_5_3', s: ['win', 'most', 'all'] },
  { id: '5-4', c: 5, ty: 'boss', n: 'n_qu', o: 'o_qunqar', s: ['win', 'most', 'all'], boss: 1 },
  { id: '6-1', c: 6, ty: 'rescue', n: 'v3n_6_1', o: 'v3o_6_1', s: ['win', 'most', 'all'] },
  { id: '6-2', c: 6, ty: 'gate', n: 'v3n_6_2', o: 'v3o_6_2', s: ['win', 'most', 'all'] },
  { id: '6-3', c: 6, ty: 'rescue', n: 'v3n_6_3', o: 'v3o_6_3', s: ['win', 'most', 'all'] },
  { id: '6-4', c: 6, ty: 'boss', n: 'n_qg', o: 'o_king', s: ['win', 'most', 'all'], boss: 1 },
  { id: '7-1', c: 7, ty: 'ride', n: 'mn_7_1', o: 'f3o_7_1', s: ['win', 'flag', 'flag2'], fl: 'f3_s_time', fl2: 'f3_s_rings' },
  { id: '7-2', c: 7, ty: 'totem', n: 'v3n_7_2', o: 'v3o_7_2', s: ['win', 'most', 'all'] },
  { id: '7-3', c: 7, ty: 'duel', n: 'v3n_7_3', o: 'v3o_7_3', s: ['win', 'most', 'all'] },
  { id: '7-4', c: 7, ty: 'boss', n: 'n_su', o: 'o_final', s: ['win', 'most', 'all'], boss: 1 },
];
export const TYICON = { defend: '⚔', duel: '⚔', story: '🏠', rescue: '⛓', survive: '⏳', boss: '💀', ride: '🐎', escort: '🛡', stealth: '🌙', mini: '🐺', archer: '🏹', guard: '🛡', gate: '🪓', totem: '🪓' };
export const midx = id => MLIST.findIndex(m => m.id === id);
export const byCh = c => MLIST.filter(m => m.c === c);
export function ruleLabel(m, r) { if (r === 'win') return t('s_win'); if (r === 'nodeath') return t('s_nodeath'); if (r === 'hp50') return t('s_hp50');
  if (r.startsWith('time:')) { const n = +r.slice(5); return t('s_time', { t: Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0') }); } if (r === 'sec') return t('s_sec'); const q = G.mis && G.mis.m === m && !resStats().total && !G.mis.cv; if (r === 'most') return t(q ? 's_mostq' : 's_most'); if (r === 'all') return t(q ? 's_allq' : 's_all'); if (r === 'flag') return t(m.fl); if (r === 'flag2') return t(m.fl2); return r; }

let H = null;
const qs = new URLSearchParams(location.search);
const FAST = () => G.misFast || 1;
export function initMissions(h) { H = h; const v0 = h.victory; if (v0 && !v0.rf) { h.victory = async (...a) => { await resFinish(); return v0(...a); }; h.victory.rf = true; } window.__MS = { run: runMission, list: MLIST, auto, win: () => G.mis && (G.mis.force = true) }; }
export function runMission(id) {
  const i = midx(id), m = MLIST[i]; if (!m) return runMission('0-1');
  try { resCleanup(); } catch (e) { }
  G.mis = { id, m, c: m.c, t0: G.time, d0: 0, flag: false, flag2: false, run: (G.misRun = (G.misRun || 0) + 1) }; G.flying = false; try { hpBar(null); if (stEl) stEl.style.opacity = 0; storm.sv = storm.to = null; $('timer').style.display = 'none'; } catch (e) { }
  try { localStorage.setItem('qq_last', id); } catch (e) { }
  return (id === '0-0' ? Promise.resolve() : w4Ensure()).then(() => RUN[id]());
}
// bench #1 lazy load: characters that the title and the tutorial do not need are fetched before the first other mission, with a progress line (sizes in KB)
const W4DEF = { allayar: 1069, surtaysha: 1075, wolf: 593, wolfman: 593, mother: 568, archer: 616, mage: 622 }; let w4EnsP = null;
function w4Ensure() { if (w4EnsP) return w4EnsP; const ks = Object.keys(W4DEF).filter(k => !(A.real && A.real[k])); if (!ks.length || !A.real) return (w4EnsP = Promise.resolve());
  const tot = ks.reduce((q, k) => q + W4DEF[k], 0) / 1024; let got = 0; const el = document.createElement('div'); el.id = 'w4load'; el.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:80;padding:10px 18px;border-radius:12px;background:rgba(12,14,34,.92);border:1px solid rgba(255,210,120,.6);color:#ffe7b8;font:700 14px/1.3 system-ui,sans-serif;text-align:center;pointer-events:none'; document.body.appendChild(el);
  const show = () => { el.textContent = t('w4_loading') + ' ' + got.toFixed(1) + ' / ' + tot.toFixed(1) + ' MB'; }; show();
  const p = Promise.all(ks.map(k => ensureReal([k]).then(() => { got += W4DEF[k] / 1024; show(); }))).catch(e => console.warn(e)).then(() => { el.remove(); if (ks.some(k => !A.real[k])) w4EnsP = null; }); return (w4EnsP = p); }
const mstart = () => { G.mis.started = true; G.mis.t0 = G.time; G.mis.d0 = G.stats.deaths; G.mis.qz = G.ents.filter(e => e.type === 'qiz' && !e.dead); try { assignHunt(); } catch (e) { console.warn(e); } };
function starsOf() { const M = G.mis, m = M.m, p = G.player;
  return m.s.map(r => r === 'win' ? true : r === 'nodeath' ? G.stats.deaths <= M.d0 : r === 'hp50' ? !!(p && !p.dead && p.hp > p.maxHp * .5) : r.startsWith('time:') ? (G.time - M.t0) <= +r.slice(5) : r === 'sec' ? !!(M.sec && M.sec.total && M.sec.list.filter(o => o.kind === 'page').every(o => o.got)) : r === 'most' ? starMost() : r === 'all' ? starAll() : r === 'flag' ? !!M.flag : r === 'flag2' ? !!M.flag2 : false); }
// outcome stars: people saved (or, with nobody to rescue, maidens alive); 3rd = everyone saved and no maiden lost
function starMost() { const S = resStats(), q = (G.mis.qz || []).length; const cv = G.mis.cv; if (cv && !S.total) return cv.pool > cv.max * .5; if (S.total) { const saved = S.saved; /* people still locked in / held at the end are not saved */ return saved >= Math.ceil(S.total * .6); } return maidLost() <= Math.floor(q / 2); }
function starAll() { const S = resStats(); const cv = G.mis.cv; if (cv && !S.total) return !cv.everFailed && cv.pool > cv.max * .7 && maidLost() === 0; return S.saved === S.total && maidLost() === 0; }
// mission complete → stars + end screen (boss missions also finish the chapter)
async function win() {
  await resFinish();
  if (G.mis.beforeWin) { const f = G.mis.beforeWin; G.mis.beforeWin = null; await f(); }
  for (const g of (G.mis && G.mis.res) || []) for (const c of g.ps) if (!c.dead && !c.lostP && (c.st === 'run' || g.freed)) c.saved = true;  // freed and on their way = saved (before the stars are counted)
  const M = G.mis, m = M.m, st = starsOf(), k = st.filter(Boolean).length, i = midx(m.id), next = MLIST[i + 1];
  try { window.__META && window.__META.missionEnd(m.id, k); } catch (e) { }
  $('timer').style.display = 'none'; G.tick = null; M.aim = null; try { hpBar(null); } catch (e) { } try { resCleanup(); } catch (e) { }
  H.saveProg(m.boss ? m.c + 1 : Math.max(1, m.c));
  if (m.id === '7-4') { H.saveStars(m.id, k); return H.epilogue(st); }
  await H.fadeTo(true); G.paused = true; $('hud').classList.remove('on');
  $('eh').textContent = (m.c ? t('ch' + m.c) : t('ch0')) + ' · ' + t(m.n); H.endStars(m.id, k, 3);
  $('stl').innerHTML = st.map((ok, j) => `<div class="${ok ? '' : 'no'}">${ok ? '★' : '☆'} ${ruleLabel(m, m.s[j])}</div>`).join('') + `<div>🪙 +${G.chGold || 0}${M.sec && M.sec.total ? '   📜 ' + M.sec.n + '/' + M.sec.total : ''}</div>` + (next ? `<div class="no">▸ ${TYICON[next.ty] || ''} ${t(next.n)}</div>` : '');
  $('etb').textContent = m.boss ? t('ch' + m.c) + ' — ' + t('done') : '';
  const chEnd = !next || next.c !== m.c || !!m.boss, MP = window.__M; $('ereplay').textContent = chEnd && MP ? t('m_btn') + ' ▸' : next ? t('ms_next') : t('replay');
  const g0 = G.chGold || 0; $('eadx2').style.display = (g0 > 0 && (window.QQ_ADS || window.ysdk)) ? '' : 'none';   /* no inline block: css/ui2 + body.w4noads decide */ $('eadx2').textContent = t('adX2') + ' (+' + g0 + ' 🪙)'; $('eadx2').onclick = async () => { if (await ADS.rewarded()) { addGold(g0); $('eadx2').style.display = 'none'; } };
  $('eshop').textContent = t('shopT'); $('eshop').onclick = () => H.openShop(); $('end').classList.add('on'); $('fade').classList.remove('in');
  const em = $('emap'); if (em) em.style.display = chEnd && MP ? 'none' : '';
  const toMap = () => { clearTimeout(win.autoT); if (!$('end').classList.contains('on')) return; try { MP.openMap('end'); } catch (e) { $('end').classList.remove('on'); runMission(next ? next.id : '0-1'); } };
  $('ereplay').onclick = () => { clearTimeout(win.autoT); if (chEnd && MP) return toMap(); $('end').classList.remove('on'); runMission(next ? next.id : '0-1'); };
  clearTimeout(win.autoT); if (chEnd && MP) win.autoT = setTimeout(toMap, 4200);
  try { window.__META && window.__META.endUI && window.__META.endUI({ id: m.id, next: next ? next.id : null, chEnd: !!(chEnd && MP), gold: g0 }); } catch (e) { }   // ui (ui4): short ad label, layout class
}
async function fail() { $('timer').style.display = 'none'; G.tick = null; setMusic('off'); try { Sfx.defeat && Sfx.defeat(); } catch (e) { } await H.bannerShow('', t('ms_fail'), '', 2.6); return runMission(G.mis.id); }

// ---------- shared setup ----------
const M = () => G.mis.m;
const sq = (n, z, x0 = 0) => { for (let i = 0; i < n + SAVE.up.squad; i++) spawn('qiz', x0 + (i % 2 ? 1 : -1) * (1.5 + (i >> 1) * 1.6), z + 2 + (i >> 1) * 1.2); };
const F3_CAP = 40;   // enemy budget per mission (fix3): rein() and the ally balance stop adding units past it
const sp = (ty, x, z) => { if (G.mis) G.mis.nE = (G.mis.nE || 0) + 1; return ty === 'potion' ? H.potionSoldier(x, z) : spawn(ty, x, z); };
function live() { $('hud').classList.add('on'); $('fade').classList.remove('in'); G.paused = false; G.freeze = false; const f = G.mis && G.mis.onLive; if (f) { G.mis.onLive = null; try { f(); } catch (e) { console.warn(e); } } }
const ban = (dur = 3) => H.bannerShow(t(M().c ? 'ch' + M().c : 'ch0'), t(M().n), t(M().o), dur);
async function gu(c, mood, build, need, z, chap, n = 5, opt = {}) { await H.fadeTo(true); await H.chapterStart(mood, build, need); if (opt.tod) tod(opt.tod); const p = H.heroSetup('gulayim', 0, z, chap); for (const a of opt.allies || []) spawn(a[0], a[1], z + a[2]); sq(n, z); H.setHero('gu'); live(); return p; }
async function sar(mood, build, need, z, n = 5, opt = {}) { await H.fadeTo(true); await H.chapterStart(mood, build, ['sarbinaz', ...need]); if (opt.tod) tod(opt.tod); const p = H.heroSetup('sarbinaz', 0, z, 4); p.maxHp = p.hp = 700; p.d = { ...T.sarbinaz, dmg: [24, 34] }; sq(n, z); H.setHero('sa'); live(); return p; }
// time of day: re-light the chapter scenery (env.js presets) and recolour its sky dome; no new art
const TOD = {
  night: { sun: [0x9fb4e8, 1.1], dir: [-.35, .62, -.7], hemi: [0x5a6c9c, 0x14141e, .8], fog: [0x1a2234, 26, 92], exp: .82, sat: .9, warm: -.03, con: .38, shc: [0, .05, .22], hic: [.3, .36, .52], dust: 0x8090c0, sky: { top: 0x080c1c, hor: 0x2c3854, cloud: 0x3a4664, sun: 0xd0dcff } },
  dusk: { sun: [0xff7a42, 3.5], dir: [.75, .28, -.6], hemi: [0xffa478, 0x3a2222, 1.25], fog: [0xb85e3e, 36, 112], exp: .95, sat: 1.42, warm: .07, con: .38, shc: [0, .08, .3], hic: [1, .5, .15], dust: 0xffa070, sky: { top: 0x3a3c7a, hor: 0xff9254, cloud: 0xffb890, sun: 0xff9a48 } },
};
function tod(k) { const L = TOD[k]; if (!L) return; LIGHTS['m_' + k] = L; try { applyLight('m_' + k, { scene, renderer, grade: gradePass, G }); } catch (e) { }
  const S = L.sky; world.traverse(o => { const u = o.material && o.material.uniforms; if (u && u.top && u.hor && u.sunc) { u.top.value.set(S.top); u.hor.value.set(S.hor); if (u.cl) u.cl.value.set(S.cloud); u.sunc.value.set(S.sun); if (u.sd) u.sd.value.set(...L.dir).normalize(); } }); }

// ======================================================================
// ENCOUNTER KIT (v2): enemies are placed in the level BEFORE the intro fly-over (standing guard, patrolling, sitting by a fire),
// and wake up when the hero comes close, when one of them is hit, or on script. Reinforcements still pop in (ambush / twist).
// ======================================================================
const rnd = (a, b) => a + Math.random() * (b - a), hyp = Math.hypot;
// role aliases → the combat agent's unit types when they exist (nayza = heavy spearman, boribasi = alpha wolf), else safe fallbacks
const ALIAS = { heavy: ['nayza', 'potion'], alpha: ['boribasi', 'wolf'], elite: ['elite', 'potion'] };
const TY = k => (k === 'potion' || T[k]) ? k : ALIAS[k] ? (ALIAS[k].find(a => a === 'potion' || T[a]) || 'askar') : 'askar';
const LBL = { askar: 'e_horde', potion: 'e_horde', wolf: 'e_wolf', boribasi: 'e_wolf', archer: 'e_arch', mage: 'e_mage', shaman: 'e_mage' };
// post(list, o): list = [type, x, z, pose?, arg?]; pose: 'g' guard (default), 'p' patrol (arg = half-width, along x), 'pz' patrol along z, 's' sit (by the fire)
// o: { fire:[x,z], label:'i18n key', wake: radius, nofly:true, y: height for 'g' poses (ridge) }
function post(list, o = {}) {
  const g = { es: [], awake: false, o, x: 0, z: 0, wakeR: o.wake ?? 12, label: o.label, boss: null };
  if (o.fire) fire(o.fire[0], o.fire[1], 1.05);
  const cnt = {};
  list.forEach(([ty, x, z, pose, arg], i) => { ty = TY(ty); const e = sp(ty, x, z); e.spawnT = 0; e.o.scale.setScalar(e.vs || e.d.scale || 1); cnt[ty] = (cnt[ty] || 0) + 1;
    e.grp = g; e.next = e.custom || null; e.pose = pose || 'g'; e.hx = x; e.hz0 = z; e.pd = i % 2 ? 1 : -1; e.parg = arg ?? 3; e.seed = rnd(0, 9); e.farT = -1e9;
    e.rot = 0; if (o.fire) e.rot = Math.atan2(o.fire[0] - x, o.fire[1] - z); else if (o.face !== undefined) e.rot = o.face; e.rot0 = e.rot;
    if (o.y && ty === 'archer') e.y = o.y; e.custom = sleepAI; g.es.push(e); });
  g.zMin = Math.min(...g.es.map(e => e.z));
  g.x = g.es.reduce((s, e) => s + e.x, 0) / g.es.length; g.z = g.es.reduce((s, e) => s + e.z, 0) / g.es.length;
  if (!g.label) { let b = 'askar', bn = 0; for (const k in cnt) if (cnt[k] > bn) { bn = cnt[k]; b = k; } g.label = LBL[b] || 'e_horde'; }
  (G.mis.groups = G.mis.groups || []).push(g); return g; }
function sleepAI(e, dt) { const g = e.grp;
  if (g.awake) { if ((e.wakeT = (e.wakeT ?? rnd(0, .45)) - dt) > 0) { e.play('Idle_Combat'); return true; } e.custom = e.next; e.farT = 0; e.y = 0; e.state = 'chase'; e.o.visible = true; return false; }
  e.farT = -1e9; const P = G.player, cv = G.mis && G.mis.cv;
  if (!G.flying && (e.hp < e.maxHp || (P && !P.dead && !g.o.noPass && G.mis && G.mis.started && P.z < g.zMin - 6) || (P && !P.dead && hyp(P.x - e.x, P.z - e.z) < g.wakeR && e.z > G.limitZ - 1) || (cv && !g.o.noCv && hyp(cv.x - e.x, cv.z - e.z) < g.wakeR))) { wake(g); return true; }
  if (e.pose === 's') { e.rot = e.rot0; e.play('Sit_Floor_Idle'); }
  else if (e.pose === 'p' || e.pose === 'pz') { const ax = e.pose === 'p' ? 'x' : 'z', h0 = ax === 'x' ? e.hx : e.hz0; e.wp = (e.wp ?? rnd(0, 2)) - dt;
    if (e.wp > 0) { e.play('Idle'); } else { e[ax] += e.pd * dt * 1.25; if (Math.abs(e[ax] - h0) > e.parg) { e.pd *= -1; e[ax] = h0 + Math.sign(e[ax] - h0) * e.parg; e.wp = rnd(1.2, 3); } e.rot = ax === 'x' ? (e.pd > 0 ? Math.PI / 2 : -Math.PI / 2) : (e.pd > 0 ? 0 : Math.PI); e.play(e.type === 'wolf' ? 'Walking_A' : 'Walking_A', { ts: .8 }); } }
  else { e.rot = e.rot0 + Math.sin(G.time * .45 + e.seed) * .55; e.play('Idle'); }
  return true; }
let hornT = 0;
function wake(g, quiet) { if (g.awake) return; g.awake = true; for (const e of g.es) if (!e.dead) num(e, '!', 'c'); if (!quiet && G.time - hornT > 4) { hornT = G.time; Sfx.horn(); } if (!G.boss) setMusic('battle'); if (g.o.onWake) g.o.onWake(g); }
const alive = g => g.es.filter(e => !e.dead);
const near = (list, P = G.player) => { let b = null, bd = 1e9; for (const e of list) { if (e.dead || e.gone) continue; const d = hyp(e.x - P.x, e.z - P.z); if (d < bd) { bd = d; b = e; } } return b; };
// wait until the given groups are destroyed; the direction arrow points at the nearest survivor; a checkpoint is saved afterwards
// the fight is won but people are still locked in / waiting: finish the rescues before the victory banner (their clocks keep running)
const resPend = () => ((G.mis && G.mis.res) || []).filter(g => !g.done && !g.freed && g.kind !== 'walk' && g.kind !== 'ride' && g.ps.some(c => !c.dead && !c.lostP && !c.saved && !c.gone));
async function resFinish() { const M = G.mis; if (!M || M.force || !resPend().length) return; for (const g of resPend()) g.on = true; M.need = resPend().flatMap(g => [...g.guards, ...g.hand]); const a0 = M.aim; M.aim = () => resAim(true) || (a0 && a0()); await until(() => !resPend().length || M.force || G.mis !== M); if (G.mis === M) { M.aim = a0; M.need = null; } }
// people in danger with a running clock come first on the arrow: the door to break / the wounded to reach (nearest, ahead or beside, never far behind)
function resAim(any) { const P = G.player; if (!P || !G.mis || !G.mis.res) return null; let b = null, bd = 1e9; for (const g of G.mis.res) { if (!g.on || g.freed || g.done) continue; const tgt = g.door && !g.door.dead ? { x: g.door.x - Math.sign(g.door.x || 1) * 1.2, z: g.door.z } : g.kind === 'wound' ? { x: g.x, z: g.z } : any ? near([...g.guards, ...g.hand]) : null; if (!tgt) continue; const d = hyp(tgt.x - P.x, tgt.z - P.z); if (!any && tgt.z > P.z + 25) continue; const sc = d + (g.T || 0) * .3; if (sc < bd) { bd = sc; b = tgt; } } return b; }
// arrow focus (fix3): the nearest enemy within 25 m, else the nearest GROUP (an enemy with company within 8 m), never a lone far straggler (the engine walks those in)
const focusOf = (list, P = G.player) => { const L = list.filter(e => !e.dead && !e.gone); if (!L.length || !P) return null; let b = null, bd = 1e9; for (const e of L) { const d = hyp(e.x - P.x, e.z - P.z); if (d < bd) { bd = d; b = e; } } if (bd <= 25) return b;
  let best = null, bs = -1e9; for (const e of L) { let n = 0; for (const f of L) if (f !== e && hyp(f.x - e.x, f.z - e.z) < 8) n++; const s = n * 12 - hyp(e.x - P.x, e.z - P.z); if (n >= 1 && s > bs) { bs = s; best = e; } } return best || (bd <= 40 ? b : null); };
const aimOf = all => () => { const r = resAim(); if (r) { const P = G.player, ne = near(all); if (!ne || hyp(ne.x - P.x, ne.z - P.z) > 6) return r; } const h = near(all.filter(e => e.hunt)), P = G.player; if (h && P && hyp(h.x - P.x, h.z - P.z) < 35) return h; return focusOf(all); };
async function clear(...gs) { const all = gs.flatMap(g => g.es); G.mis.aim = aimOf(all); G.mis.need = all;
  await until(() => all.every(e => e.dead) || G.mis.force); if (G.mis.force) for (const e of all) if (!e.dead) e.die(); G.mis.aim = null; G.mis.need = null; cp(); }
// reinforcements (ambush / twist): pop in with the usual smoke, optional bark
function rein(list, who, key) { list = list.slice(0, Math.max(0, F3_CAP - ((G.mis && G.mis.nE) || 0)));
  // QA: reinforcements never appear next to her — a point closer than 16 m is moved behind the camera (or far up the road when there is no room behind)
  { const P = G.player; if (P) list = list.map(([ty, x, z]) => { if (hyp(x - P.x, z - P.z) >= 16) return [ty, x, z]; const back = P.z + 17 + rnd(0, 3); if (back <= 11) return [ty, x, back]; const fwd = P.z - 26 - rnd(0, 4); return (G.limitZ > -1e8 && fwd < G.limitZ + 2) ? [ty, x, Math.min(11, back)] : [ty, x, fwd]; }); } const es = list.map(([ty, x, z]) => sp(TY(ty), x, z)); if (G.time - hornT > 3) { hornT = G.time; Sfx.horn(); } if (key) bark(who, key); return es; }
async function dead(es) { G.mis.aim = aimOf(es); G.mis.need = es; await until(() => es.every(e => e.dead) || G.mis.force); if (G.mis.force) for (const e of es) if (!e.dead) e.die(); G.mis.aim = null; G.mis.need = null; cp(); }
const cp = () => { const P = G.player; if (P && !P.dead) H.setCP(P.x, P.z); };
const bark = (who, key) => hintRaw(t('n_' + who) + ': ' + t(key));
const say = lines => H.dialog(lines);
// elite leader: a big captain; when he falls the rest of his group falters (stagger + morale damage)
function leader(g, x, z, nameKey = 'mb_cap') { const ty = T.elite ? 'elite' : 'askar'; const e = spawn(ty, x, z); e.spawnT = 0; if (ty === 'askar') { e.vs *= 1.38; e.r *= 1.3; e.h *= 1.38; e.maxHp = e.hp = Math.round(420 * (1 + .25 * (G.mis.c || 0))); e.dmgMul = 1.7; e.speed *= .92; e.d = { ...e.d, name: nameKey, windup: .7 }; for (const m of e.mats || []) if (m.color) m.color.offsetHSL(.02, .1, -.08); }
  e.o.scale.setScalar(e.vs || 1); e.grp = g; e.next = null; e.pose = 'g'; e.hx = x; e.hz0 = z; e.seed = 1; e.rot = e.rot0 = 0; e.farT = -1e9; e.custom = sleepAI; e.lead = true; g.es.push(e); g.boss = e; g.bossName = nameKey;
  e.onDeath = () => { Sfx.big(); flash(.25); bark('gu', 'bk_leader'); try { Sfx.bark && Sfx.bark('maid', 'kill', { x: e.x, z: e.z }); if (g.es.some(o => !o.dead && o !== e)) setTimeout(() => { try { Sfx.bark('enemy', 'flee', { x: e.x, z: e.z }); } catch (er) { } }, 4300); } catch (er) { } for (const o of g.es) if (!o.dead && o !== e) { o.stagger = 1.6; o.hp = Math.max(1, o.hp - o.maxHp * .35); o.showBar && o.showBar(); o.play('Hit_A', { once: true, force: true }); } };
  return e; }
// chapter boss standing in its arena from the start (idle); bossFight() adopts it
function preBoss(type, x, z, label, img) { const b = spawn(type, x, z); b.rot = 0; b.spawnT = 0; b.o.scale.setScalar(b.vs || T[type].scale); b.custom = e => { e.play('Idle'); e.farT = -1e9; return true; }; b.asleep = true; G.mis.preBoss = b;
  (G.mis.groups = G.mis.groups || []).push({ es: [b], awake: false, o: {}, x, z, boss: b, chapBoss: !label, bossName: label || b.d.name, label: label || b.d.name, img }); return b; }

// ---------- secrets: pages of the "Dástan kitabı" (feed the 'sec' star) and treasure chests (gold) ----------
function page(x, z) { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, .62, 10), new THREE.MeshStandardMaterial({ color: 0xe8d8a8, roughness: .9, emissive: 0x6a5020, emissiveIntensity: .6 })); m.rotation.z = Math.PI / 2; m.position.y = .95;
  const r1 = new THREE.Mesh(new THREE.TorusGeometry(.115, .025, 6, 12), new THREE.MeshStandardMaterial({ color: 0x9a1c18 })); r1.rotation.y = Math.PI / 2; r1.position.y = .95; g.add(m, r1); g.position.set(x, 0, z); world.add(g);
  const S = G.mis.sec = G.mis.sec || { n: 0, total: 0, list: [] }; S.total++; S.list.push({ g, x, z, kind: 'page' }); }
function chest(x, z, gold = 60) { const g = new THREE.Group(), wd = new THREE.MeshStandardMaterial({ color: 0x6a4420, roughness: .85 }), go = new THREE.MeshStandardMaterial({ color: 0xd8a83a, metalness: .7, roughness: .35 });
  const b = new THREE.Mesh(new THREE.BoxGeometry(.95, .5, .6), wd); b.position.y = .25; const lid = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .95, 12, 1, false, 0, Math.PI), wd); lid.rotation.z = Math.PI / 2; lid.rotation.y = Math.PI / 2; lid.position.y = .5;
  for (const sx of [-.3, .3]) { const s = new THREE.Mesh(new THREE.TorusGeometry(.31, .03, 6, 14, Math.PI), go); s.rotation.y = Math.PI / 2; s.position.set(sx, .5, 0); g.add(s); } const lk = new THREE.Mesh(new THREE.SphereGeometry(.07, 8, 6), go); lk.position.set(0, .42, .31);
  g.add(b, lid, lk); g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.position.set(x, 0, z); g.rotation.y = rnd(-.5, .5); world.add(g); G.colC.push({ x, z, r: .55 });
  const S = G.mis.sec = G.mis.sec || { n: 0, total: 0, list: [] }; S.list.push({ g, x, z, kind: 'chest', gold }); }
function secTick(tm) { const S = G.mis && G.mis.sec, P = G.player; if (!S || !P) return; for (const o of S.list) { if (o.got) continue; if (o.kind === 'page') { o.g.rotation.y = tm * 1.6; o.g.position.y = Math.sin(tm * 2.4 + o.x) * .1; }
    if (G.paused || P.dead) continue; const d = hyp(P.x - o.x, P.z - o.z); if (Math.random() < .03 && d < 22) burst(o.x + rnd(-.3, .3), 1 + rnd(0, .6), o.z, o.kind === 'page' ? 0xfff0b0 : 0xffd060, .5);
    if (d < (o.kind === 'page' ? 1.5 : 1.9)) { o.got = true; Sfx.pick(); burst(o.x, 1, o.z, 0xffe9a0, 3); ringFx(o.x, o.z, 2, 0xffe080);
      if (o.kind === 'page') { world.remove(o.g); S.n++; addGold(25, o.x, o.z); hintRaw('📜 ' + t('sec_found') + ' ' + S.n + '/' + S.total); try { const k = JSON.parse(localStorage.getItem('qq_pages') || '{}'); k[G.mis.id] = 1; localStorage.setItem('qq_pages', JSON.stringify(k)); } catch (e) { } }
      else { addGold(o.gold, o.x, o.z); o.g.children[1].rotation.x = -.9; o.g.children[1].position.set(0, .62, -.28); } } } }

// ---------- on-screen direction arrow: explicit target (G.mis.aim) → nearest awake enemy → last marker ----------
let dirEl = null;
function dirTick() { const P = G.player; if (!dirEl) { dirEl = document.createElement('div'); dirEl.id = 'dir'; dirEl.style.cssText = 'position:absolute;left:0;top:0;z-index:6;pointer-events:none;display:none;will-change:transform';
    dirEl.innerHTML = '<div class="da" style="width:0;height:0;border-left:13px solid transparent;border-right:13px solid transparent;border-bottom:26px solid #ffd060;filter:drop-shadow(0 2px 4px #000)"></div><b style="position:absolute;left:50%;top:30px;transform:translateX(-50%);font:700 13px/1 system-ui,sans-serif;color:#ffe9a8;text-shadow:0 1px 3px #000,0 0 6px #000;white-space:nowrap"></b>'; ($('hud') || document.body).appendChild(dirEl); }
  let tg = null; const M0 = G.mis;
  if (P && !P.dead && M0 && !G.paused && !G.flying && $('hud').classList.contains('on')) { if (M0.aim) tg = M0.aim(); if (!tg) { let bd = 1e9; for (const e of G.ents) { if (e.team !== 'enemy' || e.dead || e.bg || e.custom === sleepAI || e.asleep) continue; const d = hyp(e.x - P.x, e.z - P.z); if (d < bd) { bd = d; tg = e; } } if (tg && bd < 9) tg = null; else if (tg && bd < 1e9) { tg = focusOf(G.ents.filter(e => e.team === 'enemy' && !e.dead && !e.bg && e.custom !== sleepAI && !e.asleep)); M0.aimEnemy = !!tg; if (!tg) bd = 1e9 - 1; } if (!tg && bd > 1e8 && M0.hunt && !M0.cv) { let hd = 1e9; for (const e of M0.hunt) { if (e.dead || e.gone) continue; const d = hyp(e.x - P.x, e.z - P.z); if (d < hd && d < 34 && !G.colB.some(c => !c.off && c.x2 - c.x1 > G.W * .9 && c.z2 > Math.min(P.z, e.z) && c.z1 < Math.max(P.z, e.z))) { hd = d; tg = e; } } } }
    if (!tg) tg = resAim();
    if (!tg && G.markers) for (let i = G.markers.length - 1; i >= 0; i--) { const m = G.markers[i]; if (m.opt || m.z > P.z + 8) continue; tg = m; break; } }  // optional side markers (hidden children) and markers left behind never drive the arrow
  if (M0) M0.dirTg = tg; if (!tg) { dirEl.style.display = 'none'; return; } const dx = tg.x - P.x, dz = tg.z - P.z, d = hyp(dx, dz); if (d < 7) { dirEl.style.display = 'none'; return; }
  const ux = dx / d, uy = dz / d, W = innerWidth, Hh = innerHeight, k = Math.min(1, d / 26), cx = W / 2 + ux * W * (.2 + .16 * k), cy = Math.max(Hh * .2, Hh * .5 + uy * Hh * (.22 + .12 * k));
  let ax = cx, ay = cy; if (window.qqHud) { const q = window.qqHud.push(cx - 26, cy - 15, 52, 48); ax = q[0] + 26; ay = q[1] + 15; }  // QA 2b HUD: the arrow + distance never sit on the objective, bars, barks or buttons
  dirEl.style.display = 'block'; dirEl.style.transform = `translate(${ax - 13}px,${ay - 13}px)`; dirEl.firstChild.style.transform = `rotate(${Math.atan2(ux, -uy)}rad)`; dirEl.firstChild.style.borderBottomColor = tg.team === 'enemy' ? '#ff6a4a' : '#ffd060'; dirEl.lastChild.textContent = Math.round(d) + ' m'; }
// sleeping groups far from the camera focus are not drawn (phones: never more than one or two camps of skinned units on screen)
function cullTick() { const cz = G.cam ? G.cam.z : 0; for (const e of G.ents) { if (e.custom === sleepAI || e.asleep) e.o.visible = Math.abs(e.z - cz + 6) < 46; else if (e.grp && !e.o.visible) e.o.visible = true; } }
// a group the mission waits on must never sit asleep far away: wake it (the engine then brings stragglers to the fight)
let ntL = 0;
function needTick(tm) { const dt = Math.min(.1, tm - ntL); ntL = tm; const M = G.mis, P = G.player; if (!M || !M.started || !M.need || !P || P.dead || G.flying || G.paused) return;
  const rest = M.need.filter(e => !e.dead && !e.gone); for (const e of rest) { const g = e.grp; if (!g || g.awake || e.custom !== sleepAI) continue; const d = hyp(e.x - P.x, e.z - P.z); g.nT = (d > 22 || rest.length <= 3) ? (g.nT || 0) + dt : 0; if (g.nT > (rest.length <= 3 ? 5 : 12)) wake(g); } }
// the hero's own targets: one named captain per posted group (gold ring + name plate), counter on the HUD, edge chips when off screen
const HUNT_T = { nayza: 'nayza', shaman: 'shaman', mage: 'shaman', boribasi: 'boribasi' };
// balance: with maidens/Sarbinaz fighting on their own a camp would melt in seconds — scale posted groups with the number of fighting allies
// (HP +22% per ally up to ×2.2, +1 soldier for 2–3 allies / +2 for 4+, allies deal 50% damage); target: a camp takes ~60–90 s
function balanceGroups() { const M = G.mis, P = G.player; const nA = G.ents.filter(e => e.team === 'ally' && e !== P && !e.dead && !e.vict && !e.cart && e.speed > 0).length; M.nA = nA; G.allyK = nA ? .5 : 1; if (!nA) return;
  // wave4: the enemy side grows per chapter (more soldiers, new unit types: infantry → shield → archer → cavalry → catapult cart) and with the size of our host
  const W4 = window.__W4, men = W4 ? (W4.W.men | 0) : 0, c4 = M.c || 0, pool = w4Pool(c4);
  const hpK = Math.min(2.2, 1 + .22 * nA), extra = (nA >= 4 ? 2 : nA >= 2 ? 1 : 0) + Math.floor(c4 / 2) + (men >= 20 ? 1 : 0);
  for (const g of M.groups || []) { if (g.wakeR === undefined || !g.es || g.o.noHunt || g.bal) continue; g.bal = true; const es = g.es.filter(e => !e.dead && e.team === 'enemy'); if (!es.length) continue;
    for (const e of es) { e.maxHp = e.hp = Math.round(e.maxHp * hpK); }
    let manj = 0; if (es.length >= 3 && !g.awake) for (let i = 0; i < extra && !g.o.noExtra && (M.nE || 0) < F3_CAP; i++) { const b = es[i % es.length], x = clamp(b.x + rnd(-2.2, 2.2), -G.W + 1, G.W - 1), z = b.z - rnd(1, 2.5); let k4 = pool[(i + (g.es.length | 0)) % pool.length]; if (k4 === 'manj' && (manj || es.length < 4 || !W4)) k4 = 'askar';
      const e = k4 === 'manj' ? (manj = 1, M.nE = (M.nE || 0) + 1, W4.catapult(x, z - 3)) : sp(TY(k4 === 'cav' ? 'askar' : k4), x, z); if (k4 === 'cav' && W4) W4.cavalry(e); e.spawnT = 0; e.o.scale.setScalar(e.vs || e.d.scale || 1);
      e.grp = g; e.next = e.custom || null; e.pose = 'g'; e.hx = x; e.hz0 = z; e.pd = 1; e.parg = 2; e.seed = rnd(0, 9); e.farT = -1e9; e.rot = e.rot0 = b.rot0 ?? 0; e.custom = sleepAI; e.maxHp = e.hp = Math.round(e.maxHp * hpK); e.o.visible = b.o.visible; g.es.push(e); } } }
const w4Pool = c => c >= 5 ? ['askar', 'qalqan', 'archer', 'cav', 'manj', 'askar'] : c >= 4 ? ['askar', 'qalqan', 'archer', 'cav'] : c >= 3 ? ['askar', 'qalqan', 'archer'] : c >= 2 ? ['askar', 'qalqan'] : ['askar'];
function assignHunt() { const M = G.mis; M.hunt = []; try { balanceGroups(); } catch (e) { console.warn(e); } for (const g of M.groups || []) { if (g.wakeR === undefined || !g.es || g.o.noHunt) continue; const es = g.es.filter(e => !e.dead && e.team === 'enemy'); if (!es.length) continue;
    let h = g.boss && !g.boss.dead ? g.boss : es.find(e => e.d.elite) || es.find(e => HUNT_T[e.type]);
    if (!h) { if (es.length < 3) continue; h = es.find(e => e.type === 'askar') || es.find(e => e.type === 'archer'); if (!h) continue; h.maxHp = h.hp = Math.round(h.maxHp * 2.2); h.vs = (h.vs || h.d.scale || 1) * 1.14; h.o.scale.setScalar(h.vs); h.dmgMul = (h.dmgMul || 1) * 1.3; markHunt(h, h.type === 'archer' ? 'v3c_arch' : 'mb_cap'); }
    else { h.maxHp = h.hp = Math.round(h.maxHp * 1.3); markHunt(h, h.d.name || HUNT_T[h.type] || 'mb_cap'); }
    const od = h.onDeath; h.onDeath = (...a) => { if (od) od(...a); try { if (G.mis === M) { const n = M.hunt.filter(o => o.dead).length; hintRaw('🎯 ' + n + '/' + M.hunt.length + ' ✓'); } } catch (e) { } };
    M.hunt.push(h); } }
let huEl = null; const huChips = [];
function huntTick() { const M = G.mis, P = G.player; if (!huEl) { huEl = document.createElement('div'); huEl.id = 'huntcnt'; huEl.style.cssText = 'position:absolute;left:12px;top:140px;z-index:6;pointer-events:none;font:800 13px/1.2 system-ui,sans-serif;color:#ffe08a;text-shadow:0 1px 3px #000;background:rgba(0,0,0,.35);padding:3px 8px;border-radius:8px;display:none'; ($('hud') || document.body).appendChild(huEl); }
  const on = M && M.started && M.hunt && M.hunt.length && P && !G.paused && !G.flying && $('hud').classList.contains('on'); huEl.style.display = on ? 'block' : 'none';
  let k = 0; if (on) { huEl.textContent = '🎯 ' + M.hunt.filter(e => e.dead).length + '/' + M.hunt.length;
    const W = renderer.domElement.clientWidth, Hh = renderer.domElement.clientHeight;
    for (const e of M.hunt) { if (e.dead || e.gone || k >= 3) continue; const d = hyp(e.x - P.x, e.z - P.z); if (d > 28 || e.z < G.limitZ) continue; V3.set(e.x, (e.h || 2) + .6, e.z).project(camera); const back = V3.z > 1; if (back) { V3.x = -V3.x; V3.y = -1; }
      if (!back && Math.abs(V3.x) < .9 && V3.y < .85 && V3.y > -.9) continue; let c = huChips[k]; if (!c) { c = huChips[k] = document.createElement('div'); c.className = 'qqtg'; c.style.cssText = 'position:absolute;z-index:6;pointer-events:none;transform:translate(-50%,-50%);font:800 12px/1 system-ui,sans-serif;color:#ffe08a;text-shadow:0 1px 3px #000;background:rgba(60,30,0,.6);border:1px solid #ffd040;padding:3px 6px;border-radius:9px;white-space:nowrap'; ($('hud') || document.body).appendChild(c); }
      c.style.display = 'block'; c.textContent = '🎯 ' + Math.round(d) + ' m'; let lx = (clamp(V3.x, -.88, .88) + 1) / 2 * W, ly = (1 - clamp(V3.y, -.82, .8)) / 2 * Hh; if (window.qqHud) { const cw = c.offsetWidth || 60, ch = c.offsetHeight || 20, q = window.qqHud.push(lx - cw / 2, ly - ch / 2, cw, ch, ['tg']); lx = q[0] + cw / 2; ly = q[1] + ch / 2; } c.style.left = lx + 'px'; c.style.top = ly + 'px'; k++; } }
  for (let i = k; i < huChips.length; i++) huChips[i].style.display = 'none'; }
// QA watchdog: an enemy that is awake (or was displaced from his post) but stands beyond a closed gate or outside the lane for 8 s is brought back: behind the camera, awake, walking in. Mission ends never wait for an unreachable enemy.
let wdL = 0;
function wdTick(tm) { const dt = Math.min(.2, tm - wdL); wdL = tm; const M = G.mis, P = G.player; if (!M || !M.started || !P || P.dead || G.paused || G.flying || G.freeze) return;
  for (const e of G.ents) { if (e.team !== 'enemy' || e.dead || e.gone || e.bg || e.w4cat || e.w4wall || e === M.preBoss || e.maxHp >= 1e6 || e.mounted || (e.y || 0) > 1 || e === G.boss) continue;
    const post = e.custom === sleepAI && e.hz0 !== undefined && hyp(e.x - e.hx, e.z - e.hz0) < 5, far = (G.limitZ > -1e8 && e.z < G.limitZ + .4) || Math.abs(e.x) > G.W + .9;
    if (!far || post || (e.asleep && e.custom && e.custom !== sleepAI && !(Math.abs(e.x) > G.W + .9))) { e.wdT = 0; continue; }
    if (!e.wdT) { e.wdX = e.x; e.wdZ = e.z; } e.wdT = (e.wdT || 0) + dt; if (e.wdT < 8) continue; e.wdT = 0; if (hyp(e.x - e.wdX, e.z - e.wdZ) > 1.5 && e.custom) continue;   /* a scripted unit still travelling (boat landing, flanker walking in) is left alone */
    // QA pass 2: bring him back just off-screen AHEAD of her (17–23 m up the road, never beyond the closed gate); only if the gate is closer than 15 m he comes from behind the camera
    const lim = G.limitZ > -1e8 ? G.limitZ + 1.6 : -1e9, ahead = P.z - 17 - Math.random() * 6; e.x = Math.max(-G.W + 2, Math.min(G.W - 2, e.x)); e.z = ahead >= lim ? ahead : (P.z - lim >= 15 ? lim : Math.min(11, P.z + 16)); (M.wdN = (M.wdN || 0) + 1); if (e.custom) e.custom = null; e.asleep = false; e.farT = 0; e.state = 'chase'; e.y = 0; e.o.visible = true; console.warn('[watchdog] #' + M.wdN + ' ' + M.id + ' ' + e.type + ' -> ' + e.x.toFixed(0) + ',' + e.z.toFixed(0) + ' hero ' + P.z.toFixed(0) + ' gate ' + (G.limitZ > -1e8 ? G.limitZ : '-')); } }
(function loop() { requestAnimationFrame(loop); try { const tm = performance.now() / 1000; wdTick(tm); dirTick(); secTick(tm); cullTick(); needTick(tm); huntTick(); if (G.mis && G.mis.fx) G.mis.fx(tm); } catch (e) { } })();

// safe practice moment (onboarding): a harmless telegraphed circle to dodge out of
async function practiceDodge() { const p = G.player, x = p.x, z = p.z; H.hint('h_dodge', 6); telegraph(x, z, 3.2, 3); await wait(3); ringFx(x, z, 3.2, 0xff5522); Sfx.big(); if (hyp(p.x - x, p.z - z) > 3.2) { num(p, '✓', 'c'); Sfx.pick(); addGold(10, p.x, p.z); } else num(p, '✗', 'n'); }
// low barricade of sharpened stakes across the road: blocks walking, the wolf leap (5) clears it; an optional breakable gap in the middle
function stakes(z, x1 = -G.W, x2 = G.W, gap) { const wd = new THREE.MeshStandardMaterial({ color: 0x5a3c20, roughness: 1 }), g = new THREE.Group(); const geo = new THREE.CylinderGeometry(.03, .11, 1.9, 6);
  for (let x = x1 + .3; x < x2; x += .55) { if (gap && Math.abs(x - gap[0]) < gap[1]) continue; const m = new THREE.Mesh(geo, wd); m.position.set(x, .8, z + rnd(-.15, .15)); m.rotation.x = .55 + rnd(-.12, .12); m.rotation.z = rnd(-.15, .15); m.castShadow = true; g.add(m); }
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, x2 - x1, 6), wd); rail.rotation.z = Math.PI / 2; rail.position.set((x1 + x2) / 2, .55, z - .2); if (!gap) g.add(rail); world.add(g);
  const cols = []; if (gap) { cols.push({ x1, x2: gap[0] - gap[1], z1: z - .5, z2: z + .5, low: true }, { x1: gap[0] + gap[1], x2, z1: z - .5, z2: z + .5, low: true }); } else cols.push({ x1, x2, z1: z - .5, z2: z + .5, low: true }); for (const c of cols) G.colB.push(c);
  return { g, cols, open() { for (const c of cols) c.off = true; world.remove(g); } }; }

// ---------- DUEL (v3): a ring of onlookers, an opponent name card, nobody else interferes ----------
// duel(o): o = { type, x, z, R, name (i18n), title (i18n), hp, scale, dmg, poise, brain (H.bossBrain opts), intro (dialog lines),
//                nonLethal (stop at this HP fraction), crowd: [[type, n], ...] (opponent's side), after: 'flee' | 'fight' | 'stay', mounted }
// resolves { clean: never hit, time } ; mission stars read G.mis.duelClean (false once any duel took a hit)
const CHEER = ['Cheer', 'Idle_Combat', 'Idle'];
function duelRing(x, z, R, o = {}) {
  const ring = { x, z, R, crowd: [], keep: [], props: [] }, n = Math.round(R * 2.2);
  for (let i = 0; i < n; i++) { const a = i / n * 6.283 + .1; const h = place(world, 'boulder_01', x + Math.cos(a) * (R + .7), z + Math.sin(a) * (R + .7), .28 + (i % 3) * .07); if (h) ring.props.push(h); }
  const ringM = new THREE.Mesh(new THREE.RingGeometry(R - .12, R + .12, 64), new THREE.MeshBasicMaterial({ color: 0x8a5a2a, transparent: true, opacity: .55, depthWrite: false })); ringM.rotation.x = -Math.PI / 2; ringM.position.set(x, .05, z); world.add(ringM); ring.props.push(ringM);
  fire(x + R + 1.6, z - 1, .8); fire(x - R - 1.6, z - 1, .8);
  // the opponent's men stand on the far half (team npc: they watch and cheer, never fight)
  const L = o.crowd || [['askar', 6], ['archer', 2]]; let k = 0, tot = L.reduce((s, c) => s + c[1], 0);
  for (const [ty, cnt] of L) for (let i = 0; i < cnt; i++, k++) { const a = Math.PI * (1.12 + .76 * (k + .5) / tot), rr = R + 1.8 + (k % 2) * 1.1; const e = spawn(ty, x + Math.cos(a) * rr, z + Math.sin(a) * rr, 'npc', true); e.spawnT = 0; e.o.scale.setScalar(e.vs || e.d.scale || 1); e.rot = Math.atan2(x - e.x, z - e.z); e.seed = rnd(0, 9); ring.crowd.push(e); }
  return ring; }
function ringStart(ring) { const { x, z, R } = ring;
  // our own people (allies) step back to the near half and watch
  let j = 0; const al = G.ents.filter(e => e.team === 'ally' && e !== G.player && !e.dead && !e.gone && !e.cart && !e.vict);
  for (const e of al) { const a = Math.PI * (.14 + .72 * (j + .5) / Math.max(1, al.length)), rr = R + 1.6 + (j % 2); e.x = x + Math.cos(a) * rr; e.z = z + Math.sin(a) * rr; e.rot = Math.atan2(x - e.x, z - e.z); e.team = 'npc'; e.seed = rnd(0, 9); ring.keep.push(e); j++; if (e.mounted) toggleMount(e, false); }
  // any other enemy still standing holds still too
  for (const e of G.ents) if (e.team === 'enemy' && !e.dead && !e.duel) { e.team = 'npc'; ring.keep.push(Object.assign(e, { wasEnemy: true })); }
  return ring; }
function duelEnd(ring, after) {
  for (const e of ring.keep) { if (e.dead) continue; e.team = e.wasEnemy ? 'enemy' : 'ally'; e.wasEnemy = false; }
  if (after === 'fight') { const es = []; for (const c of ring.crowd) { if (c.dead) continue; const e = sp(c.type, c.x, c.z); es.push(e); c.o.visible = false; c.gone = true; c.dead = true; } return es; }
  if (after !== 'stay') for (const c of ring.crowd) { c.flee = 1; }
  return []; }
// arena(o): ring + watching crowd + the opponent standing idle (built before the fly-over; shows as a boss card)
function arena(o) { const R = o.R || 8, ring = duelRing(o.x, o.z, R, o);
  const e = spawn(o.type, o.x, o.z - R * .45, 'npc', true); e.spawnT = 0; if (o.scale) e.vs = (e.vs || e.d.scale || 1) * o.scale; e.o.scale.setScalar(e.vs || e.d.scale || 1);
  e.maxHp = e.hp = Math.round(o.hp * ([.8, 1, 1.2][SET.diff] ?? 1)); if (o.dmg) e.dmgMul = o.dmg; e.d = { ...e.d, name: o.name, poise: o.poise || e.d.poise || 160, heavy: o.heavy ?? e.d.heavy }; e.farT = -1e9; e.rot = 0;
  (G.mis.groups = G.mis.groups || []).push({ es: [e, ...ring.crowd], awake: false, o: {}, x: o.x, z: o.z - R * .45, boss: e, chapBoss: false, bossName: o.name, label: o.name, img: null });
  const tk = () => { if (e.team !== 'npc' || e.dead || !G.ents.includes(e)) return; if ((e.cT = (e.cT ?? 0) - .016) <= 0) { e.cT = 3; e.play(Math.random() < .3 ? 'Cheer' : 'Idle_Combat', { force: true }); } for (const c of ring.crowd) if (!c.dead && (c.cT = (c.cT ?? Math.random() * 3) - .016) <= 0) { c.cT = 2 + Math.random() * 3; c.play(CHEER[(Math.random() * 3) | 0], { force: true }); } requestAnimationFrame(tk); }; requestAnimationFrame(tk);
  return { ring, foe: e, o }; }
async function duel(o) {
  const P = G.player, R = o.R || 8, M = G.mis; M.duels = (M.duels || 0) + 1;
  const A = o.arena || arena(o), ring = A.ring, e = A.foe; ringStart(ring); e.team = 'enemy'; e.custom = null; e.duel = true;
  if (o.brain) e.custom = H.bossBrain(o.brain); if (o.mounted) toggleMount(e, true);
  if (o.nonLethal) { const d0 = e.damage.bind(e); e.damage = (a, s, f) => { if (e.yield) return 0; const r = d0(a, s, f); if (e.hp < e.maxHp * o.nonLethal) { e.hp = Math.max(1, Math.round(e.maxHp * o.nonLethal)); e.yield = true; } return r; }; }
  P.x = o.x; P.z = o.z + R * .45; P.act = null; P.face(e.x - P.x, e.z - P.z); e.rot = Math.atan2(P.x - e.x, P.z - e.z); if (G.cam) { G.cam.x = P.x; G.cam.z = P.z; }
  H.setCP(P.x, P.z); G.freeze = true; P.play('Idle'); e.play(o.mounted ? 'Idle' : 'Cheer', { once: true, force: true }); Sfx.horn();
  await H.bannerShow(t('duelT'), t(o.name), t(o.title || ''), 2.6); if (o.intro) await say(o.intro);
  G.freeze = false; setBoss(e); setMusic('boss'); H.objective(''); $('obj').textContent = '⚔ ' + t('duelO', { n: t(o.name) });
  let last = P.hp, hit = false, d0 = G.stats.deaths; const t0 = G.time, prev = G.tick;
  G.mis.aim = () => e.dead ? null : e;
  G.tick = dt => { if (prev) prev(dt); if (P.hp < last - .5 || G.stats.deaths > d0) hit = true; last = P.hp;
    for (const u of [P, e]) { if (!u || u.dead) continue; const dx = u.x - o.x, dz = u.z - o.z, l = hyp(dx, dz); if (l > R - .4) { u.x = o.x + dx / l * (R - .4); u.z = o.z + dz / l * (R - .4); } }
    for (const c of ring.crowd) { if (c.dead) continue; if (c.flee) { c.x += Math.sin(c.rot + Math.PI) * 4.5 * dt; c.z += Math.cos(c.rot + Math.PI) * 4.5 * dt; c.play('Running_A'); if (hyp(c.x - o.x, c.z - o.z) > R + 22) { c.o.visible = false; c.dead = c.gone = true; } continue; }
      if ((c.cT = (c.cT ?? rnd(0, 2)) - dt) <= 0) { c.cT = rnd(1.4, 3.4); c.play(CHEER[(Math.random() * 3) | 0], { force: true }); } c.rot = Math.atan2((e.dead ? o.x : (e.x + P.x) / 2) - c.x, (e.dead ? o.z : (e.z + P.z) / 2) - c.z); }
    for (const c of ring.keep) { if (c.dead || c.team !== 'npc' || c.wasEnemy) continue; if ((c.cT = (c.cT ?? rnd(0, 2)) - dt) <= 0) { c.cT = rnd(1.5, 3.5); c.play(Math.random() < .45 ? 'Cheer' : 'Idle', { force: true }); } c.rot = Math.atan2(P.x - c.x, P.z - c.z); } };
  await until(() => e.dead || e.yield || G.mis.force);
  if (G.mis.force && !e.dead && !o.nonLethal) e.die(); setBoss(null); G.mis.aim = null; try { $('obj').textContent = t(G.mis.m.o); } catch (er) { }   /* QA: the duel line no longer stays as the objective */
  if (e.yield) { e.team = 'npc'; e.custom = null; e.play('Sit_Floor_Idle', { force: true }); } else if (!e.dead) e.die();
  const clean = !hit; if (!clean) M.duelClean = false; else if (M.duelClean === undefined) M.duelClean = true;
  Sfx.big(); flash(.3); hintRaw(t(clean ? 'duelClean' : 'duelWon'));
  for (const c of ring.keep) if (!c.wasEnemy && !c.dead) c.play('Cheer', { force: true });
  await wait(1.4); const es = duelEnd(ring, o.after); G.tick = (G.tick === prev || !ring.crowd.some(c => c.flee && !c.dead)) ? prev : G.tick;
  if (o.after !== 'fight' && ring.crowd.some(c => c.flee)) { const tk = G.tick; await wait(3); if (G.tick === tk) G.tick = prev; }
  else G.tick = prev;
  setMusic(es.length ? 'battle' : 'calm'); cp(); return { clean, time: G.time - t0, foe: e, es }; }
const hint = (k, d = 6) => hintRaw(t(k));
// stealth sentry: idles/patrols, sees ~7 m in front (2.6 m all around); a hit before the alarm is a silent takedown
function sentry(ty, x, z, patrol = 0) { const e = spawn(ty, x, z); e.rot = 0; e.px = x; e.pd = Math.random() < .5 ? 1 : -1; e.seeT = 0;
  e.custom = (e, dt) => { e.farT = -1e9; const S = G.mis.st; if (S.alarm) { e.custom = null; e.farT = 0; return false; } const P = G.player; if (!P || P.dead) return true;
    if (e.hp < e.maxHp) { e.damage(1e6, P, { silent: true }); return true; }
    if (patrol) { e.x += e.pd * dt * 1.3; if (Math.abs(e.x - e.px) > patrol) e.pd *= -1; e.rot = e.pd > 0 ? Math.PI / 2 : -Math.PI / 2; e.play('Walking_A'); } else { e.rot += Math.sin(G.time * .6 + x) * dt * .5; e.play('Idle'); }
    const dx = P.x - e.x, dz = P.z - e.z, d = Math.hypot(dx, dz), dot = (dx * Math.sin(e.rot) + dz * Math.cos(e.rot)) / (d || 1);
    if (d < 2.6 || (d < 7.5 && dot > .45)) { e.seeT += dt; if (e.seeT > .7) alarm(); } else e.seeT = Math.max(0, e.seeT - dt);
    return true; }; return e; }
function alarm() { const S = G.mis.st; if (S.alarm) return; S.alarm = true; G.mis.flag = false; Sfx.horn(); flash(.3); hint('ms_alarm', 5); const P = G.player; for (const [ty, x, dz] of [['wolf', -6, -9], ['wolf', 6, -9], ['askar', -3, -12], ['askar', 3, -12], ['archer', 0, -15]]) spawn(ty, x, P.z + dz); setMusic('battle'); }
// raiders go for the captives unless the hero is right next to them
function raidAI(caps) { return (e, dt) => { e.raider = true; const P = G.player; if (P && !P.dead && Math.hypot(P.x - e.x, P.z - e.z) < 6) return false; let tg = null, bd = 1e9; for (const c of caps) { if (c.dead) continue; const d = Math.hypot(c.x - e.x, c.z - e.z); if (d < bd) { bd = d; tg = c; } } if (!tg) return false;
  const dx = tg.x - e.x, dz = tg.z - e.z; e.face(dx, dz, dt * 8); if (bd > 1.7) { e.x += dx / bd * e.speed * dt; e.z += dz / bd * e.speed * dt; e.play(e.d.run || 'Running_A'); } else { e.cd2 = (e.cd2 ?? .8) - dt; if (e.cd2 <= 0) { e.cd2 = 1.4; e.play('E_Attack', { once: true, force: true }); tg.damage(e.type === 'wolf' ? 26 : 22, e); } } return true; }; }
// big potion soldier that turns into a giant wolf (mini-boss)
function potionBoss(x, z) { const e = H.potionSoldier(x, z); e.maxHp = e.hp = 500; e.d = { ...e.d, name: 'mb_pot' }; e.vs *= 1.25; setBoss(e); e.onDeath = () => setBoss(null);
  const w = { done: false }; const old = G.tick; G.tick = dt => { if (old) old(dt); if (!w.done && e.type === 'wolf') { w.done = true; e.maxHp = e.hp = 1600; e.vs *= 1.6; e.r *= 1.5; e.dmgMul = 2; e.speed *= 1.1; setBoss(e); $('bname').textContent = t('mb_pot'); } }; return e; }

// ======================================================================
// CONVOY (2-3): two arbas pulled by harnessed, rigged horses (js/horse.js) with drivers, freed people on foot (varied gaits),
// a visible caravan trail, one shared HP pool (bar on screen), stage checkpoints.
// ======================================================================
const TR = z => Math.sin(z * .045) * 2.4 + Math.sin(z * .017 + 1) * 1.1;
function trailMesh(z0, z1) { const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 128, 0); gr.addColorStop(0, 'rgba(96,66,38,0)'); gr.addColorStop(.18, 'rgba(96,66,38,.55)'); gr.addColorStop(.82, 'rgba(96,66,38,.55)'); gr.addColorStop(1, 'rgba(96,66,38,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 256);
  for (const u of [34, 94]) { const r = g.createLinearGradient(u - 9, 0, u + 9, 0); r.addColorStop(0, 'rgba(48,30,16,0)'); r.addColorStop(.5, 'rgba(48,30,16,.85)'); r.addColorStop(1, 'rgba(48,30,16,0)'); g.fillStyle = r; g.fillRect(u - 9, 0, 18, 256); }
  g.fillStyle = 'rgba(40,26,14,.5)'; for (let i = 0; i < 26; i++) { g.beginPath(); g.ellipse(50 + Math.random() * 28, Math.random() * 256, 3.2, 4.2, Math.random(), 0, 6.3); g.fill(); }
  const tx = new THREE.CanvasTexture(c); tx.wrapT = THREE.RepeatWrapping; tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
  const pos = [], uv = [], idx = []; let n = 0; for (let z = z0; z >= z1; z -= 1.5) { const x = TR(z), dx = TR(z - .5) - TR(z + .5), l = Math.hypot(dx, 1), nx = 1 / l, nz = dx / l; pos.push(x - nx * 1.9, .045, z + nz * 1.9, x + nx * 1.9, .045, z - nz * 1.9); uv.push(0, -z / 5, 1, -z / 5); if (n) { const a = (n - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } n++; }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tx, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: THREE.DoubleSide })); m.receiveShadow = true; m.renderOrder = 1; world.add(m); return m; }
function aravaInfo() { if (aravaInfo.c) return aravaInfo.c; const src = A.props.R_arava; if (!src) return null; let m = null; src.traverse(o => { if (o.isMesh && !m) m = o; }); src.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(src), P = m.geometry.attributes.position, v = new THREE.Vector3();
  const zm = Math.max(Math.abs(bb.min.z), Math.abs(bb.max.z)), lx = bb.max.x - bb.min.x, cx = (bb.max.x + bb.min.x) / 2; let wx = 0, wn = 0, wy = 0, np = 0, nn = 0;
  for (let i = 0; i < P.count; i += 3) { v.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld); if (Math.abs(v.z) > zm * .9) { wx += v.x; wn++; wy = Math.max(wy, v.y); } if (v.x - cx > lx * .3) np++; else if (v.x - cx < -lx * .3) nn++; }
  return aravaInfo.c = { wx: wx / Math.max(1, wn), wr: wy / 2, zm, front: np < nn ? 1 : -1, x0: bb.min.x, x1: bb.max.x, top: bb.max.y }; }
function wheelTex() { if (wheelTex.c) return wheelTex.c; const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.translate(128, 128);
  g.fillStyle = 'rgba(22,14,8,.93)'; g.beginPath(); g.arc(0, 0, 118, 0, 6.3); g.fill(); g.strokeStyle = '#6a4a2a'; g.lineWidth = 9; for (let i = 0; i < 12; i++) { g.rotate(Math.PI / 6); g.beginPath(); g.moveTo(0, 14); g.lineTo(0, 108); g.stroke(); }
  g.strokeStyle = '#5a3c20'; g.lineWidth = 20; g.beginPath(); g.arc(0, 0, 112, 0, 6.3); g.stroke(); g.strokeStyle = '#6e3a2a'; g.lineWidth = 5; g.beginPath(); g.arc(0, 0, 123, 0, 6.3); g.stroke(); g.fillStyle = '#4a3018'; g.beginPath(); g.arc(0, 0, 22, 0, 6.3); g.fill(); g.fillStyle = '#2a1c10'; g.beginPath(); g.arc(0, 0, 8, 0, 6.3); g.fill();
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return wheelTex.c = tx; }
// one arba + harnessed horse; group origin on the ground under the axle, forward = +z
function mkCart(coat) { const I = aravaInfo(), S = 2.1, g = new THREE.Group(); if (!I) return null;
  const R = I.wr * S, ax = I.front * I.wx * S, tipD = (I.front > 0 ? I.x1 : -I.x0) * S - ax;      // model x → group z
  const tilt = new THREE.Group(); tilt.position.set(0, R, 0); g.add(tilt); const body = A.props.R_arava.clone(true); body.scale.setScalar(S); body.rotation.y = I.front > 0 ? -Math.PI / 2 : Math.PI / 2; body.position.set(0, -R, -ax); body.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); tilt.add(body);
  const tipY = .98, a = Math.atan2(tipY - R, tipD) + Math.atan2(R, tipD); tilt.rotation.x = -a; g.userData.tilt = tilt; g.userData.a = a;
  const wm = new THREE.MeshStandardMaterial({ map: wheelTex(), transparent: true, roughness: 1, side: THREE.DoubleSide }), wheels = [];
  for (const s of [-1, 1]) { const w = new THREE.Group(); w.position.set(s * (I.zm * S + .04), R, 0); const d = new THREE.Mesh(new THREE.CircleGeometry(R * 1.04, 28), wm); d.rotation.y = Math.PI / 2; d.castShadow = true; w.add(d); g.add(w); wheels.push(w); }
  const hz = makeHorse(A.props.R_horse_lo || A.props.R_horse, { coat, far: A.props.R_horse_far }); const hg = hz ? hz.group : new THREE.Group(); hg.scale.setScalar(1.75); const hzc = tipD - .75; hg.position.set(0, 0, hzc); g.add(hg);
  // harness: wooden arch over the withers between the shaft tips, breast collar, reins to the driver
  const wd = new THREE.MeshStandardMaterial({ color: 0x6a4420, roughness: .9 }), lt = new THREE.MeshStandardMaterial({ color: 0x2c1a0e, roughness: .8 }); const sw = I.zm * S * .62;
  const arch = new THREE.Mesh(new THREE.TorusGeometry(sw, .055, 6, 18, Math.PI), wd); arch.position.set(0, tipY - .05, tipD - .12); arch.scale.y = 1.25; arch.castShadow = true; g.add(arch);
  const rope = (x0, y0, z0, x1, y1, z1, r = .022, mat = lt) => { const A0 = new THREE.Vector3(x0, y0, z0), B0 = new THREE.Vector3(x1, y1, z1), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, A0.distanceTo(B0), 5), mat); m.position.copy(A0).add(B0).multiplyScalar(.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B0.clone().sub(A0).normalize()); g.add(m); return m; };
  for (const s of [-1, 1]) { rope(s * sw, tipY - .05, tipD - .12, s * .34, 1.38, hzc + .7, .035); rope(s * .2, 1.75, .15 * tipD, s * .18, 2.0, hzc + 1.25); rope(s * sw * .98, tipY - .1, tipD - .9, s * .36, 1.2, hzc - .6, .03); }
  return { g, wheels, hz, R, tipD, seatZ: tipD * .1, seatY: R + .42 + Math.sin(a) * tipD * .1, spin: 0 }; }
const WALK = [["asir", 1], ["mother", .9], ["child", 1.25], ["elder", .78], ["asir", 1.05], ["bayimbet", .95], ["child", 1.3], ["mother", .88]];
function convoyBuild(z0, hpMax) {
  const cv = { s: 0, z0, x: TR(z0), z: z0, v: 0, sp: 2.5, halt: false, slow: 1, pool: hpMax, max: hpMax, failed: false, everFailed: false, carts: [], mem: [], cpS: 0, cpPool: hpMax, dead: false, hitT: 0, threat: false };
  const at = s => { const z = z0 - s; return { x: TR(z), z, yaw: Math.atan2(TR(z - .6) - TR(z + .6), -1.2) }; }; cv.at = at;
  const hurt = e => { e.damage = (amt, src) => { if (cv.failed || G.mis.force) return 0; amt = Math.max(1, Math.round(Math.min(amt, 28) * .38 * ([.6, 1, 1.3][SET.diff] ?? 1))); cv.pool = Math.max(0, cv.pool - amt); cv.hitT = .5; num(e, '-' + amt, 'p'); e.flash = .12; burst(e.x, 1.2, e.z, 0xff5040, .8); if (!e.cart && e.curName !== 'Hit_A') e.play('Hit_A', { once: true, force: true }); return amt; }; e.hp = e.maxHp = 1e9; };
  [['bay', 0], ['dun', 7.5]].forEach(([coat, back], i) => { const c = mkCart(coat); if (!c) return; world.add(c.g); c.back = back; c.tiltZ = 0; const col = { x: 0, z: 0, r: 1.5 }; G.colC.push(col); c.col = col;
    const d = spawn(i ? 'elder' : 'asir', 0, z0 + back, 'ally'); d.cart = c; d.r = 1.5; d.d = { ...d.d, follow: false }; hurt(d); d.custom = e => { e.play('Sit_Floor_Idle'); return true; }; c.driver = d; cv.carts.push(c); cv.mem.push(d); });
  WALK.forEach(([ty, gait], i) => { const side = i % 2 ? 1 : -1, back = 2.5 + (i >> 1) * 2.6 + (i % 3) * .5, lat = side * (2.3 + (i % 3) * .55); const p0 = at(Math.max(0, -back)); const e = spawn(ty, TR(z0 + back) + lat, z0 + back, 'ally'); e.d = { ...e.d, follow: false }; hurt(e); e.gait = gait; e.back = back; e.lat = lat; e.seed = rnd(0, 9); e.rot = Math.PI;
    e.custom = (e, dt) => { const q = at(cv.s - e.back), huddle = cv.threat ? .45 : 1; const tx = q.x + Math.cos(q.yaw) * e.lat * huddle + Math.sin(G.time * .31 + e.seed) * .45, tz = q.z + Math.sin(G.time * .23 + e.seed * 2) * .6 + (cv.threat ? (e.back > 5 ? -1.5 : 1) : 0); const dx = tx - e.x, dz = tz - e.z, l = hyp(dx, dz);
      const vmax = (e.type === 'child' ? 4.2 : 3) * e.gait * FAST(); if (l > (e.mv ? .25 : .9)) { e.mv = 1; const v = Math.min(vmax, l * 2.2); e.x += dx / l * v * dt; e.z += dz / l * v * dt; e.face(dx, dz, dt * 7); e.play(e.type === 'child' && v > 2.6 ? 'Running_A' : 'Walking_A', { ts: Math.max(.55, v / 1.7 / FAST()) * (.9 + e.gait * .1) }); }
      else { e.mv = 0; if (cv.threat) { if (e.seed > 4.5) e.play('Sit_Floor_Idle'); else { e.play('Idle'); const f = near(enemies(), e); if (f) e.face(f.x - e.x, f.z - e.z, dt * 3); } } else e.play('Idle'); } return true; }; cv.mem.push(e); });
  cv.place = () => { const q = at(cv.s); cv.x = q.x; cv.z = q.z; for (const c of cv.carts) { const k = at(cv.s - c.back); c.g.position.set(k.x, 0, k.z); c.g.rotation.y = k.yaw + Math.PI; c.g.rotation.z = c.tiltZ; c.col.x = k.x; c.col.z = k.z; const d = c.driver, fx = Math.sin(k.yaw + Math.PI), fz = Math.cos(k.yaw + Math.PI); d.x = k.x + fx * c.seatZ; d.z = k.z + fz * c.seatZ; d.y = c.seatY; d.rot = k.yaw + Math.PI; } };
  cv.snap = () => { cv.place(); for (const e of cv.mem) if (!e.cart) { const q = at(cv.s - e.back); e.x = q.x + Math.cos(q.yaw) * e.lat; e.z = q.z; } };
  cv.tick = dt => { const P = G.player; if (!P) return; const es = enemies().filter(e => e.custom !== sleepAI); cv.threat = es.some(e => cv.mem.some(m => hyp(e.x - m.x, e.z - m.z) < 8.5)); const nearP = !P.dead && hyp(P.x - cv.x, P.z - (cv.z + 5)) < 19; cv.far = !nearP;
    const want = (!cv.halt && (!cv.threat || cv.creep) && nearP && !cv.failed && cv.s < cv.goalS) ? cv.sp * cv.slow * FAST() * (cv.threat ? cv.creep : 1) : 0; cv.v += (want - cv.v) * Math.min(1, dt * 1.8); if (cv.v < .02 && !want) cv.v = 0; cv.s += cv.v * dt; cv.place();
    for (const c of cv.carts) { c.spin += cv.v * dt / c.R; for (const w of c.wheels) if (!w.userData.off) w.rotation.x = c.spin; if (c.hz) c.hz.update(dt, cv.v / FAST(), 1.75); c.g.userData.tilt.rotation.x = -c.g.userData.a + Math.sin(c.spin * 2.3) * .012 * Math.min(1, cv.v); }
    if (cv.hitT > 0) cv.hitT -= dt; if (!es.length && !cv.failed && cv.hitT <= 0 && cv.pool < cv.max) cv.pool = Math.min(cv.max, cv.pool + cv.max * .006 * dt); if (cv.pool <= 0 && !cv.failed && !G.mis.force) { cv.failed = cv.everFailed = true; } hpBar(cv); };
  cv.goalS = 1e9; cv.snap(); G.mis.cv = cv; G.mis.esc = cv; return cv; }
let cvEl = null;
function hpBar(cv) { if (!cvEl) { cvEl = document.createElement('div'); cvEl.id = 'cvbar'; cvEl.style.cssText = 'position:absolute;left:50%;top:44px;transform:translateX(-50%);z-index:6;pointer-events:none;display:none;align-items:center;gap:7px;font:700 12px/1 system-ui,sans-serif;color:#ffe9a8;text-shadow:0 1px 3px #000';
    cvEl.innerHTML = '<span></span><div style="width:170px;height:11px;border:1.5px solid #d8a83a;border-radius:6px;background:rgba(0,0,0,.55);overflow:hidden"><i style="display:block;height:100%;width:100%;background:linear-gradient(#7fd66a,#3c9a3a);transition:width .25s"></i></div><em style="font-style:normal"></em>'; ($('hud') || document.body).appendChild(cvEl); }
  if (!cv) { cvEl.style.display = 'none'; return; } const k = cv.pool / cv.max; cvEl.style.display = 'flex'; cvEl.firstChild.textContent = '🛒 ' + t('cv_hp'); const bar = cvEl.children[1].firstChild; bar.style.width = (k * 100) + '%'; bar.style.background = k > .5 ? 'linear-gradient(#7fd66a,#3c9a3a)' : k > .25 ? 'linear-gradient(#f0c040,#c08a20)' : 'linear-gradient(#f06a4a,#b02a1a)'; cvEl.lastChild.textContent = Math.ceil(k * 100) + '%'; cvEl.children[1].style.boxShadow = cv.hitT > 0 ? '0 0 10px #ff4020' : 'none'; }
// sandstorm look: close fog + sand overlay + drifting dust
let stEl = null;
function storm(on) { if (!stEl) { stEl = document.createElement('div'); stEl.style.cssText = 'position:absolute;inset:0;z-index:4;pointer-events:none;opacity:0;transition:opacity 2.5s;background:radial-gradient(ellipse at 50% 55%,rgba(214,170,110,.18) 0%,rgba(190,140,80,.62) 55%,rgba(150,104,56,.9) 100%)'; ($('hud') || document.body).appendChild(stEl); }
  stEl.style.opacity = on ? 1 : 0; const f = scene.fog; if (!f) return; if (on) { storm.sv = storm.sv || { n: f.near, f: f.far, c: f.color.getHex() }; storm.to = { n: 5, f: 30, c: 0xc89a5e }; } else if (storm.sv) { storm.to = storm.sv; }
  G.mis.fx = () => { const f2 = scene.fog, T0 = storm.to; if (!f2 || !T0) return; f2.near += (T0.n - f2.near) * .03; f2.far += (T0.f - f2.far) * .03; f2.color.lerp(new THREE.Color(T0.c), .03); const P = G.player; if (on && P && !G.paused && Math.random() < .35) burst(P.x + rnd(-12, 12), rnd(.3, 3), P.z + rnd(-12, 6), 0xd8b070, rnd(1.5, 4), false); if (!on && Math.abs(f2.far - T0.f) < 1) { storm.sv = null; storm.to = null; G.mis.fx = null; } }; }
// ======================================================================
// RESCUE kit (v3): people in danger — roped and dragged off, trapped in burning yurts/stables, caged, bound for sacrifice.
// Every group has its own visible countdown above it; when it runs out they burn / are carried away. Enemies go for them.
// Freed people run to safety. Stars: 1 = done, 2 = most people (≥60%) saved, 3 = all saved and no maiden lost.
// ======================================================================
// people(list, o): list = [[type, x, z], ...]; o = { kind: 'bound'|'drag'|'fire'|'cage'|'altar'|'wound', T: seconds, guards: post-group or [es],
//   door: breakable, handlers: [es] (drag), exit: {x,z}, safe: {x,z}, raid: n (guards that hunt the people), auto: start the clock at once, near: start radius, label }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const RES_ICON = { walk: '🧍', ride: '⛓', bound: '⛓', drag: '⛓', fire: '🔥', cage: '⛓', altar: '🩸', wound: '✚' };
let resEl = null;
function resHud() { if (!resEl) { resEl = document.createElement('div'); resEl.id = 'rescnt'; resEl.style.cssText = 'position:absolute;left:12px;top:116px;z-index:6;pointer-events:none;font:800 13px/1.2 system-ui,sans-serif;color:#ffe9a8;text-shadow:0 1px 3px #000;background:rgba(0,0,0,.35);padding:3px 8px;border-radius:8px;display:none'; ($('hud') || document.body).appendChild(resEl); }
  const S = resStats(); if (!S.total || !G.mis || G.mis.noResHud) { resEl.style.display = 'none'; return; } resEl.style.display = 'block'; resEl.textContent = '🧍 ' + S.saved + '/' + S.total + (S.lost ? '   ✖ ' + S.lost : ''); }
function resStats() { const L = (G.mis && G.mis.res) || []; let total = 0, saved = 0, lost = 0; for (const g of L) for (const c of g.ps) { total++; if (c.saved) saved++; else if (c.dead || c.lostP) lost++; } return { total, saved, lost }; }
function people(list, o = {}) {
  const g = { ps: [], o, kind: o.kind || 'bound', T: o.T ?? 40, on: false, freed: false, done: false, guards: o.guards ? (o.guards.es || o.guards) : [], hand: o.handlers || [], door: o.door || null, lt: -1, ropes: [] };
  for (const [ty, x, z] of list) { const c = spawn(ty || 'asir', x, z, 'ally', true); c.maxHp = c.hp = o.hp || 260; c.spawnT = 0; c.o.scale.setScalar(c.vs || c.d.scale || 1); c.d = { ...c.d, follow: false, name: '' }; c.vict = g; c.st = 'held'; c.rot = o.face ?? 0; c.seed = rnd(0, 9); c.custom = victimAI; c.r = .45; const d0 = c.damage.bind(c); c.damage = (a, s2, f) => d0((c.st === 'held' || c.st === 'safe') && !(s2 && s2.raider) ? a * .25 : a, s2, f); g.ps.push(c); }
  g.x = g.ps.reduce((s, c) => s + c.x, 0) / g.ps.length; g.z = g.ps.reduce((s, c) => s + c.z, 0) / g.ps.length;
  if (g.kind === 'drag') for (const c of g.ps) { const m = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, 1, 4), new THREE.MeshStandardMaterial({ color: 0x7a5a32, roughness: 1 })); world.add(m); g.ropes.push(m); }
  if (o.raid) { let k = 0; for (const e of g.guards) if (k < o.raid && !e.dead) { const r = raidAI(g.ps.filter(c => c.st === 'held')); if (e.grp) e.next = r; else e.custom = r; k++; } }
  const el = document.createElement('div'); el.className = 'qqtg'; el.style.cssText = 'position:absolute;z-index:5;pointer-events:none;transform:translate(-50%,-100%);font:800 13px/1 system-ui,sans-serif;color:#fff;text-shadow:0 1px 3px #000,0 0 6px #000;background:rgba(120,20,10,.55);border:1px solid rgba(255,200,120,.6);padding:3px 7px;border-radius:9px;white-space:nowrap;display:none'; ($('hud') || document.body).appendChild(el); g.el = el;
  (G.mis.res = G.mis.res || []).push(g); (G.mis.groups = G.mis.groups || []).push({ es: g.ps, awake: true, o: {}, x: g.x, z: g.z, label: o.label || 'r_' + g.kind });
  return g; }
const V3 = new THREE.Vector3();
function resTick(g, dt) {
  if (g.done || !G.mis.started) return; const P = G.player, o = g.o, alive = g.ps.filter(c => !c.dead && !c.lostP && !c.saved);
  if (!g.on && (o.auto || (P && hyp(P.x - g.x, P.z - g.z) < (o.near || 30)))) { g.on = true; if (o.guardR) g.guards = enemies().filter(e => hyp(e.x - g.x, e.z - g.z) < o.guardR); if (o.onStart) o.onStart(g); }
  if (g.guards.some(e => e.escaped)) { for (const c of alive) { c.lostP = true; c.o.visible = false; c.gone = true; } g.done = true; g.el.style.display = 'none'; return; }
  // freed?
  if (g.kind === 'walk') { g.T = alive.length ? Math.max(...alive.map(c => hyp(c.x - o.safe.x, c.z - o.safe.z))) / (o.speed || 1) : 0; }
  if (g.on && !g.freed && g.kind !== 'walk' && g.guards.every(e => e.dead) && g.hand.every(e => e.dead) && (!g.door || g.door.dead) && (g.kind !== 'wound' || (P && alive.some(c => hyp(P.x - c.x, P.z - c.z) < 2.6)))) {
    g.freed = true; for (const c of alive) { c.st = g.kind === 'ride' ? 'safe' : 'run'; if (g.kind === 'ride') { c.saved = true; c.y = 0; } c.play('Cheer', { force: true }); burst(c.x, 1.4, c.z, 0xffe0a0, 1.2); } if (alive.length) { Sfx.pick(); hintRaw(t('r_freed', { n: alive.length })); addGold(12 * alive.length, g.x, g.z); } for (const r of g.ropes) r.visible = false; }
  // the clock
  if (g.on && !g.freed && g.T > 0 && g.kind !== 'drag') { g.T -= dt * FAST(); if (g.T <= 0) { g.T = 0;
    if (g.kind === 'fire' || g.kind === 'altar') { for (const c of alive) { burst(c.x, 1, c.z, g.kind === 'fire' ? 0xff6a20 : 0xaa1020, 2.5); c.hp = 0; c.die && c.die(); } Sfx.big(); hintRaw(t('r_lost_' + g.kind)); }
    else { for (const c of alive) c.st = 'taken'; hintRaw(t('r_taken')); } } }
  // drag: handlers walk the rope line to the exit
  if (g.kind === 'drag') { const h = g.hand.filter(e => !e.dead); if (h.length && g.on && !g.freed) { const lead = h[0], ex = o.exit; const d = hyp(ex.x - lead.x, ex.z - lead.z); g.T = d / (o.speed || 1.5); if (d < 1.5) { for (const c of alive) { c.lostP = true; c.o.visible = false; } for (const e of h) { e.o.visible = false; e.dead = e.gone = true; } for (const r of g.ropes) r.visible = false; hintRaw(t('r_taken')); } }
    g.ps.forEach((c, i) => { const r = g.ropes[i]; if (!r || !r.visible) return; const a = h[0]; if (!a || c.dead || c.st !== 'held') { r.visible = false; return; } const A0 = V3.set(a.x, 1.0, a.z), B = new THREE.Vector3(c.x, 1.0, c.z); r.position.copy(A0).add(B).multiplyScalar(.5); r.scale.y = Math.max(.1, A0.distanceTo(B)); r.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A0).normalize()); }); }
  if (!alive.length) { g.done = true; g.el.style.display = 'none'; return; }
  // label
  const show = g.on && !g.freed && alive.some(c => c.st === 'held' || c.st === 'taken');
  if (show) { let x = 0, z = 0; for (const c of alive) { x += c.x; z += c.z; } V3.set(x / alive.length, 2.6, z / alive.length).project(camera); if (V3.z > 1) { V3.x = -V3.x; V3.y = -1; }
    const off = Math.abs(V3.x) > .82 || V3.y > .68 || V3.y < -.8; V3.x = clamp(V3.x, -.82, .82); V3.y = clamp(V3.y, -.8, .68);
    g.el.style.display = 'block'; g.el.style.opacity = off ? .85 : 1;
    const s = Math.ceil(g.T); g.el.textContent = (RES_ICON[g.kind] || '⛓') + ' ' + alive.length + (g.kind === 'ride' ? '' : '  ⏳ ' + s);
    { const W = renderer.domElement.clientWidth, Hh = renderer.domElement.clientHeight; let lx = (V3.x + 1) / 2 * W, ly = (1 - V3.y) / 2 * Hh + 14; if (window.qqHud) { const cw = g.el.offsetWidth || 70, ch = g.el.offsetHeight || 20, q = window.qqHud.push(lx - cw / 2, ly - ch, cw, ch, ['tg']); lx = q[0] + cw / 2; ly = q[1] + ch; } g.el.style.left = lx + 'px'; g.el.style.top = ly + 'px'; } /* QA 2b HUD: kept off the objective / boss bar / panels */ g.el.style.background = s <= 10 ? 'rgba(200,20,10,.75)' : 'rgba(120,20,10,.55)'; }
  else g.el.style.display = 'none'; }
function victimAI(c, dt) { const g = c.vict; if (G.flying) { c.play(g.kind === 'fire' || g.kind === 'walk' ? 'Idle' : 'Sit_Floor_Idle'); return true; } if (g.lt !== G.time) { g.lt = G.time; resTick(g, dt); resHud(); } if (G.mis.hazard && G.mis.hzT !== G.time && !G.paused && !G.flying) { G.mis.hzT = G.time; G.mis.hazard(dt); } if (c.saved) { if ((c.ct = (c.ct ?? 0) - dt) <= 0) { c.ct = rnd(1.5, 3); c.play(Math.random() < .5 ? 'Cheer' : 'Idle', { force: true }); } return true; }
  const o = g.o, sp = (c.type === 'elder' ? 3.8 : 4.8) * FAST();   // freed people RUN (fix3)
  const go = (tx, tz, v, anim) => { const dx = tx - c.x, dz = tz - c.z, l = hyp(dx, dz); if (l < .3) return l; c.x += dx / l * Math.min(v * dt, l); c.z += dz / l * Math.min(v * dt, l); c.face(dx, dz, dt * 8); c.play(anim, { ts: v / 2.2 / FAST() }); return l; };
  if (c.st === 'run') { const s = o.safe || G.mis.safe || { x: c.x, z: c.z + 30 }, sd = Math.sign(s.x || c.x || Math.sin(c.seed)) || 1; const l = go(sd * (G.W - 1.3 - Math.abs(Math.sin(c.seed * 3.1)) * 1.6), s.z + Math.cos(c.seed) * 2.5, sp, 'Running_A'); if (l < 1.2) { c.saved = true; c.st = 'safe'; c.rot = Math.PI; } return true; }
  if (c.st === 'taken') { const ex = o.exit || { x: c.x > 0 ? G.W + 4 : -G.W - 4, z: c.z - 8 }; const l = go(ex.x + Math.sin(c.seed) * 1.2, ex.z, 1.35 * FAST(), 'Walking_A'); if (l < 1 || Math.abs(c.x) > G.W + 2) { c.lostP = true; c.o.visible = false; c.gone = true; } return true; }
  if (g.kind === 'drag') { const h = g.hand.find(e => !e.dead); if (h) { const i = g.ps.indexOf(c), bx = h.x - Math.sin(h.rot) * (1.6 + i * 1.1), bz = h.z - Math.cos(h.rot) * (1.6 + i * 1.1); if (go(bx, bz, 2.4 * FAST(), 'Walking_A') < .3) c.play('Idle'); return true; } }
  if (g.kind === 'walk') { const s = o.safe, i = g.ps.indexOf(c); if (go(s.x + ((i % 3) - 1) * 1.3, s.z + (i / 3 | 0) * 1.2, (g.halt ? 0 : (o.speed || 1)) * FAST() + 1e-4, 'Walking_A') < 1) { c.saved = true; c.st = 'safe'; } else if (g.halt) c.play('Idle'); return true; }
  if (g.kind === 'ride') { const f = g.guards[0]; if (f && !f.dead) { c.x = f.x - Math.sin(f.rot) * .75; c.z = f.z - Math.cos(f.rot) * .75; c.y = 1.15; c.rot = f.rot; } c.play('Sit_Floor_Idle'); return true; }
  if (g.kind === 'fire') { if ((c.ct = (c.ct ?? 0) - dt) <= 0) { c.ct = rnd(.8, 2); c.play(Math.random() < .5 ? 'Idle' : 'Cheer', { force: true }); } return true; }
  c.play('Sit_Floor_Idle'); return true; }
// handler AI: walks the roped line to the exit; turns to fight when the hero is close or he is hit
function dragAI(g) { return (e, dt) => { const P = G.player; e.farT = -1e9; if (e.hp < e.maxHp || (P && !P.dead && hyp(P.x - e.x, P.z - e.z) < 6.5)) { e.custom = null; e.asleep = false; e.farT = 0; return false; } if (!g.on) { e.asleep = true; e.play('Idle'); return true; } e.asleep = false;
  const ex = g.o.exit, dx = ex.x - e.x, dz = ex.z - e.z, l = hyp(dx, dz) || 1, v = (g.o.speed || 1.5) * FAST();
  // QA blocker (1-1 / 1-3 / 3-2): a handler never walks through a closed gate or out of the lane — where he cannot go on he turns round and fights (awake, inside the arena, reachable)
  const lim = G.limitZ > -1e8 ? G.limitZ + 1.6 : -1e9, nx = Math.max(-G.W + 1, Math.min(G.W - 1, e.x + dx / l * v * dt)), nz = Math.max(lim, e.z + dz / l * v * dt), mv = Math.abs(nx - e.x) + Math.abs(nz - e.z); e.x = nx; e.z = nz;
  if (l < 1.2 || mv < v * dt * .35) { e.custom = null; e.asleep = false; e.farT = 0; e.state = 'chase'; return false; }
  e.face(dx, dz, dt * 5); e.play('Walking_A', { ts: .75 }); e.farT = -1e9; return true; }; }
function dragGroup(caps, hands, exit, o = {}) { const hs = hands.map(([ty, x, z]) => { const e = sp(TY(ty), x, z); e.spawnT = 0; e.o.scale.setScalar(e.vs || 1); e.farT = -1e9; return e; }); const g = people(caps, { ...o, kind: 'drag', handlers: hs, exit }); for (const e of hs) e.custom = dragAI(g); return g; }
// maidens at the start of the mission (losses count against the 3rd star)
function maidLost() { const L = (G.mis && G.mis.qz) || []; return L.filter(e => e.dead).length; }
function resCleanup() { for (const g of (G.mis && G.mis.res) || []) { if (g.el) g.el.remove(); for (const r of g.ropes) r.visible = false; } if (resEl) resEl.style.display = 'none'; }
// hazard: telegraphed strikes around the hero (rockfall / arrow rain / fire rain)
function rain(every, kind) { let t0 = 2; const col = kind === 'rock' ? 0xb08a60 : kind === 'fire' ? 0xff6a20 : 0xd8d0b0;
  return dt => { t0 -= dt * FAST(); if (t0 > 0) return; t0 = every; const P = G.player; if (!P || P.dead) return; const pts = []; for (let i = 0; i < 3; i++) { const x = clamp(P.x + rnd(-5, 5), -G.W, G.W), z = P.z + rnd(-6, 4); pts.push([x, z]); telegraph(x, z, 2.2, 1.2, kind === 'rock' ? 0xaa7744 : 0xff4422); }
    G.waits.push({ t: 1.2, r: () => { for (const [x, z] of pts) { burst(x, kind === 'rock' ? 2.5 : .6, z, col, 2.6, kind === 'rock'); ringFx(x, z, 2.2, col); for (const e of G.ents) if (!e.dead && e.team !== 'enemy' && e.team !== 'npc' && hyp(e.x - x, e.z - z) < 2.4) e.damage(kind === 'rock' ? 38 : 26, { x, z, y: 0, team: 'enemy', d: {}, type: 'rock', dead: false }, { kb: 4 }); } G.shake = .3; Sfx.big(); } }); }; }
// ---------- runners ----------
const RUN = {};
const flyPt = (x, z, label, es = []) => (G.mis.groups = G.mis.groups || []).push({ es, awake: true, o: {}, x, z, label });
// freed villagers cheer, then run home (back down the road) and leave the level
function freeRun(es) { for (const c of es) { c.play('Cheer', { force: true }); burst(c.x, 1.5, c.z, 0xffe0a0, 1.5); } Sfx.pick(); setTimeout(() => { for (const c of es) { if (c.dead || c.gone) continue; c.team = 'ally'; c.d = { ...c.d, team: 'ally', follow: false }; c.hp = c.maxHp = 1e9; const z1 = c.z + 26; c.custom = (e, dt) => { e.z += 5 * dt; e.x += (Math.sign(e.x || 1) * 8 - e.x) * dt * .5; e.rot = 0; e.play('Running_A'); if (e.z > z1 || e.z > 8) { e.dead = true; e.remove(); } return true; }; } }, 1500); }
const obj = s => { H.objective(''); $('obj').textContent = s; };
// ===== PROLOGUE (Allayar) — teaches: move, attack, dodge (safe practice), skills =====
RUN['0-1'] = async () => { const { NIGHT } = H.moods;
  await H.fadeTo(true); try { await H.bannerShow('📜 ' + t('w4_tale'), t('w4_flash'), t('w4_play_al'), 3.2); } catch (e) { }   /* flashback card: the messenger's tale, the player is Allayar */
  await H.lore('lore0'); clearLevel(); setMood(NIGHT); G.emberDown = false; H.buildProlog(); setMusic('off'); G.freeze = false; G.stats.deaths = 0; setBoss(null); G.chGold = 0;
  const p = makePlayer('allayar', 0, 3); G.sk[1].on = true; G.sk[2].on = true; G.sk[3].on = true; refreshSkills(); H.setHero('al'); H.setDeath(); H.setCP(0, 3); H.objective('');
  $('hud').classList.add('on'); G.paused = true;
  spawn('son', -2.8, 1); spawn('son', 2.8, 1); H.skirmish(-9, -8); H.skirmish(9, -24); H.skirmish(-9.5, -44); H.skirmish(9, -66);
  const g1 = post([['askar', -1.6, -29.6, 's'], ['askar', -5.4, -30.4, 's'], ['askar', 4, -26, 'p', 2.5], ['askar', 0, -33]], { fire: [-3.5, -30.6] });
  const g3 = post([['askar', -6, -66], ['askar', 6, -66], ['archer', -9, -72], ['archer', 9, -72]], { nofly: true, wake: 0 }); chest(9.3, -17, 50);
  // wave4 / missions audit: no Camel Dev here (off-plan). The finale is the plan's beat: Allayar holds the line while the townsfolk flee past him into the town.
  const folk = ['mother', 'child', 'elder', 'asir', 'mother', 'child', 'elder', 'asir', 'mother', 'asir'].map((ty, i) => { const sd = i % 2 ? 1 : -1, e = spawn(ty, sd * (7.2 + (i % 3) * .9), -53 - (i >> 1) * 1.7, 'npc', true); e.spawnT = 0; e.o.scale.setScalar(e.vs || e.d.scale || 1); e.rot = 0; e.farT = -1e9; e.w4folk = 1; e.play('Sit_Floor_Idle'); return e; });
  await H.cutscene('v1', 'nar1'); live(); setMusic('battle'); await ban(3); mstart();
  await wait(.6); await say([['al', 'd_al1']]);
  H.objective('o_move'); H.hint('h_move', 7); const g1g = gate(-42); const mk = marker(0, -13);
  await H.reach(0, -13, 4); mk.remove(); H.objective('o_defend'); H.hint('h_attack', 7); wake(g1);
  await clear(g1); await practiceDodge(); await wait(.8);
  H.hint('h_skill', 7); await dead(rein([['askar', -6, -30], ['askar', 6, -30], ['wolf', 0, -35], ['wolf', -9, -27], ['wolf', 9, -27], ['askar', 2, -37]]));
  g1g.open(); H.setCP(0, -34); p.hp = Math.min(p.maxHp, p.hp + 250); H.objective('o_square'); const g2 = gate(-78);
  await H.goTo(-46); setMusic('battle'); Sfx.horn(); await H.bannerShow('', '🛡 ' + t('w4_hold_o'), '', 2.2); H.objective('w4_hold_o'); H.setCP(0, -44); wake(g3, true);
  const WV = [[['askar', -6, -75], ['askar', 6, -75], ['askar', 0, -76.5]], [['askar', -8, -75], ['wolf', -3, -76.5], ['wolf', 3, -76.5], ['askar', 8, -75], ['archer', 0, -77]], [['askar', -7, -75], ['askar', 7, -75], ['askar', -2, -76.5], ['askar', 2, -76.5], ['archer', -9, -77], ['archer', 9, -77]]];
  let wi = 0, cur = g3.es.slice(), safeN = 0, lostN = 0, goT = 1, gi = 0, lp = '', brk = new Set();
  G.mis.aim = () => near(cur.filter(e => !e.dead)) || { x: 0, z: -52 };
  G.tick = dt => { goT -= dt; if (goT <= 0 && gi < folk.length) { goT = 2.6; const e = folk[gi++]; e.w4run = 1; }
    for (const e of folk) { if (!e.w4run || e.gone || e.dead) continue; const tx = Math.sign(e.x) * 4.8,   /* inner lanes: the street-side skirmishes at x = ±9 blocked the outer ones */  v = 4.3 * (e.type === 'elder' ? .8 : 1); e.x += (tx - e.x) * Math.min(1, dt * 2); e.z += v * dt; e.rot = 0; e.play('Running_A');
      e.w4t = (e.w4t || 0) + dt; if (e.z > 9 || e.w4t > 24) {   /* 24 s failsafe: nobody stays stuck in the street */ if (e.z <= 9) burst(e.x, 1, e.z, 0xc8a070, 1.6, true); e.gone = true; e.dead = true; e.o.visible = false; safeN++; } }
    for (const e of enemies()) if (!e.dead && e.z > -36 && !brk.has(e) && e.custom !== sleepAI) { brk.add(e); const v = folk.find(q => q.w4run && !q.gone && !q.w4lost) || folk.find(q => !q.gone && !q.w4lost); if (v) { v.w4lost = 1; v.w4run = 0; v.gone = true; lostN++; v.play('Death_A', { once: true, force: true }); hintRaw('⚠ ' + t('w4_hold_lost')); } }
    const s2 = '🛡 ' + t('w4_wave', { n: Math.min(3, wi + 1), m: 3 }) + ' — ' + t('w4_hold_hud', { n: safeN, m: folk.length - lostN }); if (s2 !== lp) { lp = s2; $('obj').textContent = s2; } };
  for (wi = 0; wi < 3 && !G.mis.force; wi++) { try { Sfx.stinger && Sfx.stinger('wave'); } catch (er) { } if (wi) { cur = rein(WV[wi], 'al', null); for (const e of cur) { e.state = 'chase'; e.farT = 0; } } else cur = cur.concat(rein(WV[0], 'al', null));
    await until(() => cur.every(e => e.dead) || G.mis.force); cp(); if (wi < 2) await wait(1.5); }
  for (const e of folk) if (!e.gone) e.w4run = 1; await until(() => folk.every(e => e.gone) || G.mis.force); if (G.mis.force) for (const e of enemies()) e.die();
  G.tick = null; G.mis.aim = null; setMusic('off'); g2.open(); await H.bannerShow('', '🛡 ' + t('w4_hold_win'), '', 2); await wait(.6); await H.victory(); return win(); };
RUN['0-2'] = async () => { const { NIGHT } = H.moods;
  await H.fadeTo(true); clearLevel(); setMood(NIGHT); G.emberDown = false; H.buildProlog(); setMusic('off'); G.freeze = false; G.stats.deaths = 0; setBoss(null); G.chGold = 0;
  const p = makePlayer('allayar', 0, -70); G.sk[1].on = G.sk[2].on = G.sk[3].on = true; refreshSkills(); H.setHero('al'); H.setDeath(); H.setCP(0, -70); H.objective('');
  spawn('son', -2.8, -68); spawn('son', 2.8, -68); H.skirmish(-9, -80); H.skirmish(9, -86);
  const gg = post([['askar', -3, -84], ['askar', 3, -84], ['askar', 0, -86.5, 'p', 3], ['archer', -6, -89], ['archer', 6, -89]]);
  const su = preBoss('surtaysha', 0, -103, 'n_su', 'p_su'); su.invuln = true;
  live(); setMusic('battle'); await ban(3); mstart();
  H.objective('o_square'); await clear(gg); const mk2 = marker(0, -94); await H.reach(0, -94, 4.5); mk2.remove();
  su.custom = null; su.asleep = false; su.invuln = T.surtaysha.invuln; su.rot = 0; setBoss(su); G.noDeath = true; setMusic('boss'); Sfx.horn();
  await wait(.8); await say([['su', 'd_su1'], ['al', 'd_al2']]); H.objective('o_duel');
  const t0 = G.time; await until(() => G.time - t0 > 20 || p.hp < p.maxHp * .3 || G.mis.force); G.mis.flag = G.time - t0 > 20;
  await say([['su', 'd_su2']]); H.objective('o_resist');
  for (const e of G.ents) if (e.team === 'ally' && e !== p) e.die(); G.tele.forEach(o => o.dead = true);
  G.freeze = true; p.x = Math.max(-2.5, Math.min(2.5, p.x)); p.z = Math.max(-100.5, Math.min(-97, p.z)); su.x = p.x; su.z = p.z - 3.4; su.rot = 0;   /* fix3: clinch mid-arena like story.js (the boss is no longer dragged to wherever the player stood) */ p.rot = Math.PI; p.act = null; p.y = 0; p.play('Block', { force: true }); su.play('2H_Melee_Idle', { force: true });
  let lv = 50; G.tick = () => { if (G.qte) lv = Math.min(lv, G.qte.v); }; await qte(qs.get('fast') ? 1 : 6.5, 36, 5.5); G.tick = null; G.mis.flag2 = lv > 0;
  flash(.9); Sfx.big(); G.shake = 1; p.play('Death_A', { once: true, force: true }); await wait(1.3);
  G.freeze = false; await say([['al', 'd_al3']]);
  await H.fadeTo(true); setBoss(null); $('hud').classList.remove('on'); setMusic('off'); G.paused = true;
  await H.cutscene('v2', 'nar2'); await H.lore('lore_sur'); try { localStorage.setItem('qq_prog', 'm1'); } catch (e) { } return win(); };

// ===== CHAPTER 1 =====
async function ch1Start(z, sk, mood) { const { DAY } = H.moods; await H.fadeTo(true); await ensureReal(['qashqir', 'sarbinaz']); clearLevel(); setMood(mood || DAY); G.emberDown = true; H.buildMission(); setMusic('off'); G.freeze = false; G.stats.deaths = 0; G.chGold = 0;
  const p = makePlayer('gulayim', 0, z); for (let i = 0; i < 5 + SAVE.up.squad; i++) spawn('qiz', (i % 2 ? 1 : -1) * (1.5 + (i >> 1) * 1.6), z + 2 + (i >> 1) * 1.2); for (const k of sk) G.sk[k].on = true; refreshSkills(); H.setHero('gu'); H.setDeath(); H.setCP(0, z); H.objective(''); setBoss(null); return p; }
// 1-1 teaches: attack (one lone looter = safe practice), skills 2-3, the ulti. Side objective: 3 hidden children.
RUN['1-1'] = async () => {
  const p = await ch1Start(3, [1]); $('hud').classList.add('on'); G.paused = true; let kidsN = 0;
  const kids = [[-9.5, -12], [9.5, -34], [-9.5, -62]].map(([x, z]) => ({ e: spawn('child', x, z, 'npc'), m: Object.assign(marker(x, z, 0x66ff88, 1), { opt: true }), x, z, found: false })); kids.forEach(k => { k.e.rot = 0; k.e.play('Sit_Floor_Idle'); });
  const mo = spawn('mother', 2, -23, 'npc'); mo.rot = 0; flyPt(2, -23, 'n_mo');
  const g0p = post([['askar', 4.5, -12, 'p', 2]], { nofly: true, wake: 7 });
  const gA = post([['askar', -2.2, -46.4, 's'], ['askar', 1.4, -47.2, 's'], ['askar', 5, -50, 'p', 2.5], ['archer', -8, -54], ['archer', 8, -54]], { fire: [-.5, -48.4] });
  const gC = post([['askar', -6, -74], ['askar', 6, -74], ['askar', -3, -79, 'p', 2], ['askar', 3, -79], ['askar', 0, -82], ['wolf', -9, -72, 'pz', 2], ['wolf', 9, -72, 'pz', 2], ['archer', -8, -83], ['archer', 8, -83]]);
  await H.lore('lore1'); await H.cutscene('v3', 'nar3'); live(); setMusic('calm'); await ban(3); mstart();
  G.tick = () => { for (const k of kids) if (!k.found && hyp(p.x - k.x, p.z - k.z) < 2.4) { k.found = true; kidsN++; k.m.remove(); k.e.play('Cheer'); Sfx.pick(); addGold(15, k.x, k.z); hintRaw(t('childFound') + ' ' + kidsN + '/3'); } };
  H.objective('o_mother'); H.hint('h_attack', 6); const g0 = gate(-30); const mm = marker(2, -23, 0xffd060, 1.6);
  await H.reach(2, -23, 3.6); mm.remove(); mo.face(p.x - mo.x, p.z - mo.z); p.act = null; p.play('Idle');
  await say([['mo', 'd_mo1'], ['gu', 'd_gu1'], ['mo', 'd_mo2'], ['mo', 'd_mo3'], ['gu', 'd_gu2']]); Sfx.power(); flash(.3);
  g0.open(); H.setCP(0, -26); H.objective('o_guards'); const g1 = gate(-60); setMusic('battle');
  await clear(gA, g0p);
  G.sk[2].on = G.sk[3].on = G.sk[5].on = true; refreshSkills(); H.hint('', 9, t('h_skill5'));
  await dead(rein([['askar', -6, -48], ['askar', 6, -48], ['askar', 0, -54], ['wolf', -9, -44], ['wolf', 9, -44], ['archer', 0, -57]]));
  g1.open(); H.setCP(0, -52); p.hp = Math.min(p.maxHp, p.hp + 200); H.objective('o_go'); setMusic('calm'); const ms = marker(0, -64);
  await H.reach(0, -64, 4); ms.remove(); const sa = spawn('sarbinaz', 5, -58, 'ally'); sa.rot = Math.PI;
  await wait(.5); await say([['sa', 'd_sa1'], ['gu', 'd_gu3']]);
  G.sk[4].on = true; G.ulti = 100; refreshSkills(); H.hint('h_ulti', 9); H.objective('o_horde'); const g2 = gate(-88); setMusic('battle'); wake(gC);
  await until(() => alive(gC).length <= 4 || G.mis.force); rein([['wolf', -8, p.z + 9], ['wolf', 8, p.z + 9], ['askar', 0, p.z + 11]], 'sa', 'bk_back');
  await clear(gC); await until(() => enemies().length === 0 || G.mis.force);
  g2.open(); G.tick = null; G.mis.flag = kidsN >= 3; setMusic('off'); await H.victory(); return win(); };
// 1-2 the stable: kill the sorcerer, then break the door before the timer; twist: wolves from behind while the door burns
RUN['1-2'] = async () => {
  const p = await ch1Start(-84, [1, 2, 3, 4, 5]); const sa = spawn('sarbinaz', 3, -82, 'ally');
  const gS = post([['mage', 4, -104], ['askar', 0, -100, 'p', 2.5], ['askar', -4, -103], ['askar', 6, -96], ['wolf', -8, -98, 'pz', 2]], { label: 'e_mage' }); flyPt(7.8, -100, 'e_cap'); chest(-9.3, -93, 60);
  live(); setMusic('calm'); await ban(3); mstart();
  let door = null, doorT = 0, bk = null, tw = false;
  G.tick = dt => { if (door) { doorT -= dt * FAST(); $('timer').textContent = Math.max(0, Math.ceil(doorT)); if (doorT < 26 && !tw) { tw = true; rein([['wolf', -7, p.z + 9], ['wolf', 0, p.z + 11], ['wolf', 7, p.z + 9]], 'sa', 'bk_back'); } } };
  H.objective('o_stable'); const g3 = gate(-112); setMusic('battle'); await clear(gS);
  door = new THREE.Mesh(new THREE.BoxGeometry(.35, 2.6, 2.2), new THREE.MeshStandardMaterial({ color: 0x5a3a1c, roughness: 1 })); door.position.set(7.8, 1.3, -100); door.castShadow = true; world.add(door); bk = breakable({ mesh: door, x: 7.8, z: -100, hp: 420, dmg: { slam: 120, any: 60 }, barY: 3.4, rad: 1.4, showNum: true, dust: 0x6a4a2a, spark: 0xffcc88, chunks: 16 }); const dm = marker(6.4, -100, 0xff8844, 1.5);
  doorT = 45; H.objective('o_door'); $('timer').style.display = 'block'; Sfx.horn(); G.mis.aim = () => ({ x: 6.4, z: -100 });
  spawn('askar', -6, -108); spawn('askar', 6, -108); spawn('wolf', 0, -110);
  await until(() => bk.dead || doorT <= 0 || G.mis.force); G.mis.aim = null; G.mis.flag = bk.dead; $('timer').style.display = 'none'; if (!bk.dead) bk.shatter(); dm.remove(); door = null; burst(7.8, 1.5, -100, 0xffcc88, 4);
  [[5.6, -99], [5.2, -101], [4.4, -100]].forEach(([x, z], i) => { const c = spawn(i ? 'child' : 'mother', x, z, 'npc'); c.rot = -Math.PI / 2; c.play('Cheer'); });
  Sfx.pick(); await H.bannerShow('', t(G.mis.flag ? 'saved' : 'savedLate'), '', 2.4); await until(() => enemies().length === 0 || G.mis.force); g3.open(); G.tick = null; setMusic('off'); return win(); };
// 1-3 NEW "Free the village": three guard camps hold the villagers; twist: a counter-attack from behind; climax: the captain's camp
RUN['1-3'] = async () => { const { DUSK } = H.moods;
  const p = await ch1Start(3, [1, 2, 3, 4, 5], DUSK); tod('dusk'); spawn('sarbinaz', 3, 5, 'ally');
  const C1 = await H.captives([[-6.5, -33.5], [-5, -35], [-7.5, -35.5]]), C2 = await H.captives([[6, -66], [7.5, -67.5], [5, -68]]), C3 = await H.captives([[-2, -103], [0, -104.5], [2, -103], [0, -101.5]]);
  const g1 = post([['askar', -.4, -30.2, 's'], ['askar', -3.6, -29.6, 's'], ['askar', 3, -33, 'p', 3], ['archer', -8.5, -30]], { fire: [-2, -31.6] });
  const st = stakes(-58.5, -G.W, G.W, [-7, 2.4]);
  const g2 = post([['askar', -7, -56, 'p', 1.6], ['askar', 2, -62], ['askar', -2, -64, 'p', 3], ['wolf', 8, -61, 'pz', 2], ['archer', 3, -66], ['archer', 9, -64.5]], { label: 'e_arch' });
  const g3 = post([['askar', -4.6, -95.6, 's'], ['askar', 3.2, -96.4, 's'], ['askar', -7, -99, 'p', 2], ['askar', 7, -99, 'p', 2], ['archer', -8, -104], ['archer', 5, -106.5], ['shaman', -4, -106.5]], { fire: [-.6, -97.4], label: 'mb_cap' }); leader(g3, 0, -99.5);
  page(9.6, -47); chest(-9.6, -81, 70);
  live(); setMusic('calm'); await ban(3); mstart(); await say([['sa', 'f13a'], ['gu', 'f13b']]);
  let n = 0; const O = () => obj(t('mo_1_3') + '  ⛓ ' + n + '/3'); O(); setMusic('battle'); const gt = gate(-112);
  G.mis.aim = () => near(g1.es) || C1[0]; await clear(g1); freeRun(C1); n = 1; O(); p.hp = Math.min(p.maxHp, p.hp + 150);
  g2.o.onWake = () => H.hint('', 6, t('h_leap')); await wait(1.2); await clear(g2); freeRun(C2); n = 2; O(); p.hp = Math.min(p.maxHp, p.hp + 150);
  await wait(1); await dead(rein([['wolf', -8, p.z + 10], ['wolf', 8, p.z + 10], ['wolf', 0, p.z + 12], ['askar', -4, p.z + 12], ['askar', 4, p.z + 12]], 'sa', 'bk_back'));
  g3.o.onWake = () => bark('sa', 'f13c'); await clear(g3); await until(() => enemies().length === 0 || G.mis.force); freeRun(C3); n = 3; O(); gt.open();
  setMusic('off'); await wait(1.4); await say([['gu', 'f13d']]); await H.victory(); return win(); };
// 1-4 boss Qashqir (visible in his arena from the start, with his pack); then the wolf-leap tutorial over the ravine
RUN['1-4'] = async () => {
  const p = await ch1Start(-116, [1, 2, 3, 4, 5]); spawn('sarbinaz', 3, -114, 'ally');
  const q = preBoss('qashqir', 0, -140); const gw = post([['wolf', -5, -134, 'p', 2], ['wolf', 5, -135, 'p', 2], ['wolf', 0, -131, 'pz', 1.5]], { nofly: true, wake: 0 });
  live(); setMusic('calm'); await ban(3); mstart();
  H.objective('o_boss'); const g4 = gate(-150); await H.goTo(-123); wake(gw); setMusic('battle'); await clear(gw);   // fix3: the wolves first, the boss alone
  q.custom = H.qashqirAI; q.asleep = false; G.freeze = true; p.act = null; p.play('Idle'); await wait(.6);
  await say([['qa', 'd_qa1'], ['gu', 'd_gu4']]); G.freeze = false; setBoss(q); setMusic('boss'); Sfx.howl(); H.setCP(0, -124); const d0 = G.stats.deaths;
  await until(() => q.dead || G.mis.force); if (!q.dead) q.die(); H.soul(q); G.mis.flag = G.stats.deaths === d0; for (const e of enemies()) e.die(); setMusic('off'); await wait(1.2); await H.victory();
  await H.fadeTo(true); G.paused = true; await H.cutscene('v4', 'nar4'); G.paused = false; setBoss(null);
  G.sk[5].on = true; refreshSkills(); Sfx.power(); flash(.5); setMusic('calm'); await H.bannerShow('', t('wolf'), t('wolfDesc'), 3.6);
  g4.open(); H.setCP(0, -146); H.objective('o_gap'); H.hint('o_gap', 9); G.ravineAhead = true; const mf = marker(0, -180, 0xbfe3ff, 2);
  await until(() => (p.z < -169 && !p.leaping) || G.mis.force); G.ravineAhead = false; H.objective('o_trail'); await until(() => p.z < -175.5 || G.mis.force); mf.remove();
  await H.fadeTo(true); G.paused = true; $('hud').classList.remove('on'); await H.cutscene(null, 'nar5', 'ruins'); return win(); };

// ===== CHAPTER 2 =====
RUN['2-1'] = async () => { const { HOT } = H.moods; await H.chapterIntro(2, 'nar6', 'ruins'); G.curCh = 1; mstart();
  G.mis.flag = await H.rideLevel('gulayim', HOT, 'o_ride2', [['askar', -4, -16], ['askar', 4, -20], ['archer', 0, -26], ['askar', -6, -32], ['archer', 6, -36], ['askar', 0, -42]], 'flee'); return win(); };
// 2-2 Bayimbet's trap: hook = the traitor, twist = wolves spring the ambush around you, climax = the raiders' camp behind stakes (wolf leap shortcut)
RUN['2-2'] = async () => { const { HOT } = H.moods;
  const p = await gu(2, HOT, H.B[2], [], 3, 1); const ba = spawn('bayimbet', 6, -30, 'npc'); ba.rot = 0; flyPt(6, -30, 'n_ba');
  const st = stakes(-71, -G.W, G.W, [8.5, 2.2]);
  const gA = post([['askar', -2.2, -62.6, 's'], ['askar', 1.6, -63.4, 's'], ['heavy', 5, -66], ['wolf', -7, -64, 'pz', 2], ['askar', -5, -67, 'p', 2]], { fire: [-.4, -64.4] });
  const gB = post([['archer', -6, -75], ['archer', 0, -76], ['archer', 6, -75], ['shaman', 0, -79]], { label: 'e_arch', wake: 0, face: 0 }); leader(gA, 0, -67);
  page(-9.6, -46); chest(9.4, -84, 80);
  setMusic('calm'); await ban(3); mstart(); await say([['sa', 'x2a'], ['gu', 'x2b']]);
  H.objective('o_trail2'); const g0 = gate(-40); const mb = marker(6, -30);
  await H.reach(6, -30, 3.4); mb.remove(); ba.face(p.x - ba.x, p.z - ba.z); p.face(ba.x - p.x, ba.z - p.z); p.act = null; p.play('Idle'); await say([['ba', 'd_ba1'], ['gu', 'd_gu5'], ['ba', 'd_ba2'], ['gu', 'd_gu6']]);
  H.objective('o_ambush'); setMusic('battle'); await dead(rein([['wolf', p.x - 7, p.z - 3], ['wolf', p.x + 4, p.z - 7], ['wolf', p.x - 5, p.z + 6], ['wolf', p.x + 6, p.z + 5], ['askar', 0, p.z - 9]], 'sa', 'bk_amb')); g0.open();
  const g1 = gate(-90); gA.o.onWake = () => { wake(gB, true); H.hint('', 6, t('h_leap')); }; await clear(gA, gB);
  await dead(rein([['heavy', -4, p.z - 9], ['wolf', -9, p.z + 2], ['wolf', 9, p.z + 2], ['askar', -3, p.z - 12], ['askar', 3, p.z - 12]], 'sa', 'bk_rein')); g1.open(); setMusic('off'); await H.victory(); return win(); };
// 2-3 the convoy
async function cvRetry(cv) { $('timer').style.display = 'none'; storm(false); await H.bannerShow('', t('ms_fail'), '', 2.4); for (const e of G.ents) if (e.rf && !e.dead) { e.dead = true; e.remove(); }
  cv.s = cv.cpS; cv.pool = Math.max(cv.cpPool, cv.max * .6); cv.failed = false; cv.halt = false; cv.slow = 1; cv.creep = 0; cv.v = 0; cv.extra = null; for (const c of cv.carts) { c.tiltZ = 0; for (const w of c.wheels) if (w.userData.off) w.userData.fix(); } cv.snap(); const P = G.player; P.x = cv.x + 3; P.z = cv.z - 2; P.hp = P.maxHp; H.setCP(P.x, P.z); }
RUN['2-3'] = async () => { const { HOT } = H.moods;
  const p = await gu(2, HOT, H.B[2], [], -13, 1, 3); trailMesh(12, -184); const cv = convoyBuild(-10, 1600); p.x = cv.x + 3.5; H.setCP(p.x, p.z); cv.go = z => { cv.goalS = cv.z0 - z; }; cv.go(-10);
  const R = l => { const es = rein(l); for (const e of es) e.rf = true; return es; }, U = async c => { await until(() => c() || cv.failed || G.mis.force); return cv.failed && !G.mis.force; };
  let si = 0; const SKIP = +(new URLSearchParams(location.search).get('cvs') || 0), S0 = [-10, -40, -84, -84, -136];  // ?cvs=N: test only, start at stage N
  const stage = async fn => { if (si < SKIP) { if (si === 0) for (const e of gW.es) e.die(); if (si === 1) for (const e of gR.es) e.die(); si++; if (si === SKIP) { cv.s = cv.z0 - S0[si]; cv.snap(); p.x = cv.x + 3; p.z = cv.z - 2; } return; } si++; for (;;) { cv.cpS = cv.s; cv.cpPool = cv.pool; cp(); await fn(); if (!cv.failed || G.mis.force) return; await cvRetry(cv); } };
  // posted before the fly-over: wolves on the trail, archers on the ridge, the blockade
  const gW = post([['wolf', TR(-32) - 2, -32, 'p', 3], ['wolf', TR(-35) + 3, -35, 'p', 2], ['wolf', TR(-38), -38, 'pz', 2]], { wake: 11 });
  const dune = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), new THREE.MeshStandardMaterial({ color: 0xb89a6a, roughness: 1 })); dune.scale.set(3.6, 1.45, 8.5); dune.position.set(10.2, -.05, -66); dune.receiveShadow = true; world.add(dune); for (const [x, z, s] of [[8.2, -59.5, 1.3], [8, -72.5, 1.5], [11, -66, 2.4]]) place(world, 'boulder_01', x, z, s);
  const gR = post([['archer', 9, -61.5], ['archer', 9.6, -64.5], ['archer', 9.2, -67.5], ['archer', 9.7, -70.5], ['askar', 6.2, -63, 'pz', 2], ['askar', 6, -69, 'pz', 2]], { y: 1.3, label: 'e_arch', wake: 0, noCv: true, face: -Math.PI / 2 });
  const bz = -161, bx = TR(bz); const st = stakes(bz, -G.W, G.W, [bx, 2.3]);
  const bm = new THREE.Group(), wdm = new THREE.MeshStandardMaterial({ color: 0x5a3c20, roughness: 1 }); for (const y of [.35, .85, 1.35]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.16, .18, 4.6, 8), wdm); l.rotation.z = Math.PI / 2; l.position.set(0, y, (y - .85) * .25); l.castShadow = true; bm.add(l); } for (const sx of [-1.7, 0, 1.7]) for (const k of [-1, 1]) { const s = new THREE.Mesh(new THREE.CylinderGeometry(.09, .11, 2.3, 6), wdm); s.position.set(sx, .95, 0); s.rotation.x = k * .5; s.castShadow = true; bm.add(s); } bm.position.set(bx, 0, bz);
  const bar = breakable({ mesh: bm, x: bx, z: bz, w: 4.6, d: 1, hp: 380, dmg: { slam: 130, any: 45 }, barY: 2.5, rad: 2.6, showNum: true, dust: 0x6a4a2a, spark: 0xffcc88, chunks: 14 });
  const gB = post([['askar', bx - 3, bz + 7.2, 's'], ['askar', bx + 3, bz + 6.6, 's'], ['askar', bx - 6.5, bz + 5, 'p', 2], ['heavy', bx + 6, bz + 4], ['archer', bx - 4.5, bz - 3.5], ['archer', bx + 4.5, bz - 3.5], ['shaman', bx, bz - 5.5]], { fire: [bx, bz + 8.6], label: 'mb_cap', wake: 13, noCv: true }); leader(gB, bx, bz + 4.5);
  chest(-9.6, -96, 80);
  setMusic('calm'); G.tick = dt => { cv.tick(dt); if (cv.extra) cv.extra(dt); }; await ban(3); mstart(); await say([['sa', 'cv_d1'], ['gu', 'cv_d2']]); obj(t('mo_2_3')); setMusic('battle'); H.hint('', 7, t('cv_start'));
  G.mis.aim = () => cv.far ? { x: cv.x, z: cv.z + 4 } : null; let farT = 0;
  // 1) wolves on the trail, then raiders burst out of the dunes
  await stage(async () => { cv.go(-40); if (await U(() => cv.z <= -39.6 && alive(gW).length === 0)) return; const cz = cv.z;
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) burst(s * 10.5, .6, cz + rnd(-6, 6), 0xd8b070, 3);
    const a = R([['askar', -10.5, cz - 3], ['askar', -10.5, cz + 2], ['askar', -10, cz + 7], ['askar', 10.5, cz - 1], ['askar', 10.5, cz + 5], ['potion', 10, cz - 6]]); bark('sa', 'bk_amb'); if (await U(() => a.every(e => e.dead))) return; });
  // 2) archers on the ridge shoot the caravan while it keeps rolling
  await stage(async () => { cv.go(-84); if (await U(() => cv.z <= -50 || gR.awake)) return; wake(gR); H.hint('', 6, t('cv_arch')); if (await U(() => alive(gR).length === 0 && cv.z <= -83.6)) return; });
  // 3) a wheel breaks: hold the ground until it is repaired
  await stage(async () => { const c = cv.carts[0], w = c.wheels[0]; cv.halt = true; c.tiltZ = .11; w.userData.off = true; const wp = w.position.clone(); w.userData.fix = () => { w.userData.off = false; w.position.copy(wp); w.rotation.set(0, 0, 0); c.tiltZ = 0; }; w.position.set(wp.x - 1.1, .12, wp.z - .6); w.rotation.set(0, 0, Math.PI / 2 - .12);
    Sfx.big(); G.shake = .5; burst(cv.x, .5, cv.z, 0xd8b070, 4); bark('sa', 'cv_wheel1'); H.hint('', 6, t('cv_wheel')); const tm = $('timer'); tm.style.display = 'block'; let T0 = 36, k = 0, es = []; const cz = cv.z;
    const W = [[36, [['askar', -4, cz - 15], ['askar', 4, cz - 16], ['askar', 0, cz - 18], ['archer', -7, cz - 20], ['archer', 7, cz - 20]]], [24, [['wolf', -8, cz + 17], ['wolf', 8, cz + 17], ['wolf', -3, cz + 19], ['wolf', 3, cz + 19]], 'bk_back'], [12, [['heavy', -9, cz - 10], ['shaman', -10, cz - 14], ['askar', 9, cz - 8], ['askar', 9.5, cz - 12]], 'bk_rein']];
    cv.extra = dt => { T0 -= dt * FAST(); tm.textContent = '🔧 ' + Math.max(0, Math.ceil(T0)); if (k < W.length && T0 <= W[k][0]) { es = es.concat(R(W[k][1])); if (W[k][2]) bark('sa', W[k][2]); k++; } };
    const bad = await U(() => T0 <= 0 && es.every(e => e.dead)); cv.extra = null; tm.style.display = 'none'; if (bad) return; w.userData.fix(); cv.halt = false; cv.pool = Math.min(cv.max, cv.pool + cv.max * .25); Sfx.pick(); H.hint('', 5, t('cv_fixed')); });
  // 4) sandstorm: wolves come out of the dust in pairs while the caravan crawls on
  await stage(async () => { storm(true); cv.slow = .72; cv.creep = .45; cv.go(-146); H.hint('', 6, t('cv_storm')); let nw = 3, hv = false, es = [];
    cv.extra = dt => { nw -= dt * FAST(); if (nw <= 0 && cv.z > -128 && es.filter(e => !e.dead).length < 4) { nw = 10; const s = Math.random() < .5 ? -1 : 1; es = es.concat(R([['wolf', s * 10.5, cv.z - 4], ['wolf', -s * 10.5, cv.z + 6]])); } if (!hv && cv.z < -116) { hv = true; es = es.concat(R([['heavy', 0, cv.z - 14], ['askar', -3, cv.z - 15], ['askar', 3, cv.z - 15]])); bark('sa', 'bk_rein'); } };
    const bad = await U(() => cv.z <= -136); cv.extra = null; storm(false); cv.slow = 1; cv.creep = 0; if (bad) return; if (await U(() => es.every(e => e.dead))) return; });
  // 5) the blockade: break through (or leap over the stakes) and beat the captain
  await stage(async () => { cv.go(-146); if (await U(() => cv.z <= -145.6 || gB.awake)) return; wake(gB); H.hint('', 6, t('cv_block')); obj(t('cv_block')); setTimeout(() => { if (!bar.dead && G.mis.cv === cv) H.hint('', 6, t('h_leap')); }, 9000);
    G.mis.aim = () => cv.far ? { x: cv.x, z: cv.z + 4 } : bar.dead ? near(gB.es) : (near(gB.es.filter(e => (e.z - bz) * (G.player.z - bz) > 0)) || { x: bx, z: G.player.z < bz ? bz - 1.5 : bz + 1.5 });  // from whichever side she is on: never sends her back over the stakes  // behind the stakes → point at the barricade first
    if (await U(() => alive(gB).length === 0 && bar.dead)) return; });
  if (G.mis.force && !bar.dead) bar.shatter(); st.open(); obj(t('mo_2_3')); G.mis.aim = () => cv.far ? { x: cv.x, z: cv.z + 4 } : null; bark('gu', 'bk_done'); cv.go(-175); await U(() => cv.z <= -174.6);
  G.mis.flag = !cv.everFailed && cv.pool > cv.max * .5; G.tick = null; G.mis.aim = null; for (const e of cv.mem) if (!e.cart) e.custom = e2 => { e2.play('Cheer'); return true; };
  setMusic('off'); await wait(.8); await say([['gu', 'cv_d3']]); hpBar(null); await H.victory(); return win(); };
RUN['2-4'] = async () => { const { HOT } = H.moods;
  const p = await gu(2, HOT, H.B[2], ['qumdev'], -84, 1); const b0 = preBoss('qumdev', 0, -132);
  const gO = post([['wolf', -5, -100, 'p', 2.5], ['wolf', 5, -101, 'p', 2.5], ['askar', -2, -104], ['askar', 2, -104], ['archer', 0, -107]]); chest(9.4, -156, 90);
  setMusic('calm'); await ban(3); mstart(); bark('sa', 'bk_wolf');
  obj(t('f3o_2_4')); const g2 = gate(-150); setMusic('battle'); await clear(gO); await H.goTo(-112); H.hint('', 4, t('h_sand'));
  G.onBoss = b => { H.weakWhile(b, () => b.openT > 0, 'w_qd'); b.onLeap = () => H.openUp(b, 7, 'w_open'); };
  G.mis.flag = await H.bossFight('qumdev', 0, -132, [['qd', 'd_qd1'], ['gu', 'd_gu7']], H.bossBrain({ dmg: 44, every: 3.2, moves: ['quake', 'quake', 'charge'], col: 0xd8b070, phases: [[[1, .55], e => { e.spdMul = 1.2; }], [[2, .25], e => { e.dmgMul = 1.25; }]] }));
  await H.gainPower(6, 'pw6', 'pw6d'); g2.open(); H.objective('o_go'); await H.goTo(-158); return win(); };

// ===== CHAPTER 3 =====
RUN['3-1'] = async () => { const { DAY } = H.moods; await H.chapterIntro(3, 'nar7', 'ruins');
  const p = await gu(3, DAY, H.B[3], [], 3, 2);
  const gA = post([['askar', -1.8, -35.4, 's'], ['askar', 1.8, -36.2, 's'], ['potion', 4, -40], ['askar', -6, -38, 'p', 2], ['archer', -8, -46], ['archer', 8, -46]], { fire: [0, -37.4] });
  const c1 = await H.captives([[-5, -62], [-3, -63], [3, -63], [5, -62]]);
  const gB = post([['wolf', -6, -56, 'p', 2.5], ['wolf', 6, -57, 'p', 2.5], ['shaman', 0, -60], ['askar', -2, -57], ['askar', 2, -57]], { label: 'e_cap' }); leader(gB, 0, -55.5);
  page(9.6, -26); chest(-9.4, -50, 70);
  setMusic('calm'); await ban(3); mstart(); await say([['sa', 'x3a'], ['gu', 'x3b']]);
  H.objective('o_camp'); setMusic('battle'); const g0 = gate(-70);
  await clear(gA); gB.o.onWake = () => bark('sa', 'f13c'); await clear(gB);
  await dead(rein([['askar', -10, p.z + 2], ['askar', -10, p.z - 3], ['wolf', -9, p.z + 6], ['archer', -10, p.z - 7], ['heavy', 9, p.z - 4]], 'sa', 'bk_rein'));
  await H.freeCaptives(c1); g0.open(); setMusic('off'); await wait(1.6); await H.victory(); return win(); };
RUN['3-2'] = async () => { const { DUSK } = H.moods; G.curCh = 2; mstart();
  await H.rideLevel('gulayim', DUSK, 'mo_3_2', [['askar', -4, -30], ['askar', 4, -32], ['archer', 0, -38], ['askar', -6, -50], ['askar', 6, -52], ['archer', -3, -60], ['archer', 3, -60], ['askar', 0, -72], ['askar', -5, -84], ['askar', 5, -86], ['archer', 0, -94]], 'fight'); return win(); };
RUN['3-3'] = async () => { const { NIGHT } = H.moods;
  const p = await gu(3, NIGHT, H.B[3], [], 3, 2, -99, { tod: 'night' }); G.mis.st = { alarm: false }; G.mis.flag = true;
  const S = [['askar', -4, -28, 4], ['askar', 6, -36, 0], ['archer', -7, -50, 0], ['askar', 2, -58, 5], ['askar', -6, -74, 0], ['archer', 6, -80, 3], ['askar', 0, -96, 6], ['askar', -7, -112, 0], ['askar', 7, -114, 0], ['archer', 0, -126, 5], ['askar', -4, -138, 0], ['askar', 4, -140, 0]].map(([ty, x, z, pt]) => sentry(ty, x, z, pt));
  for (const e of S) { e.spawnT = 0; e.o.scale.setScalar(e.vs || 1); } fire(-8.5, -74, 1); fire(8.5, -113, 1); flyPt(0, -32, 'e_horde'); flyPt(0, -96, 'e_horde'); flyPt(0, -152, 'e_cap'); chest(9.5, -66, 80); chest(-9.5, -120, 80);
  const cs = await H.captives([[-4, -150], [-1.5, -152], [1.5, -152], [4, -150], [0, -155]]);
  setMusic('calm'); await ban(3); mstart(); H.objective('mo_3_3'); hint('ms_sneak', 8); const mk = marker(0, -148, 0x66ff88, 2);
  G.tick = () => { if (p.z < -70 && !G.mis.st.cp1) { G.mis.st.cp1 = 1; cp(); } if (p.z < -110 && !G.mis.st.cp2) { G.mis.st.cp2 = 1; cp(); } };
  await H.reach(0, -148, 3.5); mk.remove(); G.tick = null; if (G.mis.st.alarm) await until(() => enemies().length === 0 || G.mis.force); if (G.mis.force) for (const e of enemies()) e.die();
  await H.freeCaptives(cs); setMusic('off'); await wait(1.6); await H.victory(); return win(); };
RUN['3-4'] = async () => { const { DAY } = H.moods;
  const p = await gu(3, DAY, H.B[3], ['jallod', 'otbasqan'], -66, 2); const b0 = preBoss('jallod', 0, -108);
  const gG = post([['askar', -3, -80], ['askar', 3, -80], ['archer', -7, -84], ['archer', 7, -84], ['wolf', 0, -83, 'p', 3]]);
  const c2 = await H.captives([[-5, -150], [-2, -152], [2, -152], [5, -150], [0, -155]]);
  const gC = post([['heavy', 0, -146], ['askar', -6, -140, 'p', 2], ['askar', 6, -140, 'p', 2], ['wolf', -3, -144], ['wolf', 3, -144], ['archer', 0, -160], ['shaman', -7, -158]], { label: 'e_cap', wake: 0 });
  setMusic('calm'); await ban(3); mstart();
  H.objective('o_otbasqan'); const g1 = gate(-125); setMusic('battle'); await clear(gG); await H.goTo(-88); H.hint('', 5, t('h_chain'));
  G.onBoss = b => { H.weakWhile(b, () => b.openT > 0, 'w_ja'); b.onSlam = () => { H.openUp(b, 6, 'w_open'); b.stagger = 1.5; }; };
  G.mis.flag = await H.bossFight('jallod', 0, -108, [['ja', 'd_ja1'], ['gu', 'd_gu8']], H.bossBrain({ dmg: 40, every: 2.8, moves: ['charge', 'quake', 'charge'], col: 0xaa3322, phases: [[[1, .5], e => { e.spdMul = 1.25; }]] }));
  await H.gainPower(7, 'pw7', 'pw7d'); const ob = spawn('otbasqan', 0, -118, 'ally'); ob.rot = 0; await say([['ot', 'd_ot1'], ['gu', 'd_gu9'], ['ot', 'd_ot2']]); g1.open(); H.setCP(0, -120);
  H.objective('o_free'); setMusic('battle'); gC.wakeR = 13; await clear(gC); await H.freeCaptives(c2);
  setMusic('off'); await H.goTo(-158); return win(); };
// ===== CHAPTER 4 =====
RUN['4-1'] = async () => { const { DAY } = H.moods; await H.chapterIntro(4, 'nar8', 'ruins'); G.curCh = 3; mstart();
  G.mis.flag = await H.rideLevel('gulayim', DAY, 'o_ride4', [['askar', -4, -18], ['archer', 4, -24], ['askar', 0, -30], ['archer', -6, -38], ['askar', 6, -44], ['archer', 0, -50], ['askar', -3, -56]], 'flee'); return win(); };
// 4-2 the ships: shore camp → archers behind stakes (leap shortcut) → twist: a landing party from the water → the captain
RUN['4-2'] = async () => { const { DAY } = H.moods;
  const p = await gu(4, DAY, H.B[4], ['otbasqan'], 3, 3, 4, { allies: [['otbasqan', 2.6, 2]] });
  const gA = post([['askar', -2, -39.4, 's'], ['askar', 1.8, -40.2, 's'], ['heavy', 0, -45], ['askar', -6, -42, 'p', 2], ['archer', -8, -50], ['archer', 8, -50]], { fire: [0, -41.4] });
  const st = stakes(-66, -G.W, G.W, [-8.5, 2.2]); const gS = post([['archer', -3, -70], ['archer', 3, -70], ['archer', 0, -72], ['shaman', 6, -72]], { label: 'e_arch', face: 0 });
  const gB = post([['wolf', -6, -80, 'p', 2.5], ['wolf', 6, -81, 'p', 2.5], ['askar', -4, -86], ['askar', 4, -86], ['heavy', -2, -88], ['archer', 0, -93]], { label: 'mb_cap' }); leader(gB, 0, -85);
  page(9.6, -58); chest(-9.5, -96, 90);
  setMusic('calm'); await ban(3); mstart(); await say([['ot', 'x4a'], ['gu', 'x4b']]);
  H.objective('o_ships'); setMusic('battle'); const g0 = gate(-110);
  await clear(gA); H.hint('', 6, t('h_leap')); await clear(gS);
  await dead(rein([['askar', 10, p.z - 2], ['askar', 10, p.z + 3], ['wolf', 10, p.z - 6], ['wolf', -10, p.z + 5], ['archer', 10, p.z - 9]], 'ot', 'bk_rein'));
  gB.o.onWake = () => bark('ot', 'f13c'); await clear(gB); g0.open(); setMusic('off'); await H.victory(); return win(); };
// 4-3 the wolf chieftain: prowling packs, then the giant wolf (visible on his rock from the start)
RUN['4-3'] = async () => { const { DUSK } = H.moods;
  const p = await gu(4, DUSK, H.B[4], ['qashqir', 'otbasqan'], 3, 3, 4, { allies: [['otbasqan', 2.6, 2]], tod: 'dusk' });
  const g1 = post([['wolf', -6, -38, 'p', 3], ['wolf', 6, -40, 'p', 3], ['wolf', 0, -45, 'pz', 2], ['wolf', -9, -31, 'pz', 2], ['wolf', 9, -31, 'pz', 2]]);
  const g2 = post([['potion', 0, -58], ['wolf', -7, -55, 'p', 2], ['wolf', 7, -55, 'p', 2], ['askar', -3, -60], ['askar', 3, -60], ['archer', 0, -65]], { label: 'e_horde' });
  const g3 = post([['wolf', -8, -94, 'p', 2], ['wolf', 8, -94, 'p', 2], ['wolf', -4, -99], ['wolf', 4, -99], ['alpha', 0, -102]]);
  const b0 = preBoss('qashqir', 0, -113, 'mb_wolf', 'p_qa'); chest(9.5, -74, 90);
  setMusic('calm'); await ban(3); mstart(); bark('ot', 'bk_wolf');
  H.objective('mo_4_3'); setMusic('battle'); const g0 = gate(-70);
  await clear(g1); await clear(g2); await dead(rein([['wolf', -8, p.z + 9], ['wolf', 8, p.z + 9], ['wolf', 0, p.z + 11]], 'ot', 'bk_back')); g0.open(); H.setCP(0, -64);
  const gx = gate(-130); await clear(g3); await H.goTo(-97);
  G.onBoss = b => { b.d = { ...b.d, name: 'mb_wolf' }; b.maxHp = b.hp = 2600; for (const m of b.mats || []) if (m.color) m.color.multiplyScalar(.8); };
  G.mis.flag = await H.bossFight('qashqir', 0, -113, [['ot', 'mb_ot1'], ['gu', 'mb_gu1']], H.qashqirAI); gx.open(); return win(); };
RUN['4-4'] = async () => { const { DAY } = H.moods;
  const p = await gu(4, DAY, H.B[4], ['aydarho', 'otbasqan'], -104, 3, 4, { allies: [['otbasqan', 2.6, 2]] }); const b0 = preBoss('aydarho', 0, -170.5);
  const gG = post([['askar', -4, -120], ['askar', 4, -120], ['archer', -8, -126], ['archer', 8, -126], ['shaman', 0, -128]]); chest(-9.5, -140, 100);
  setMusic('calm'); await ban(3); mstart();
  H.objective('o_dragon'); setMusic('battle'); await clear(gG); await H.goTo(-134);
  const gD = gate(-163); G.onBoss = b => { b.maxHp = b.hp = 4500; b.weakHint = 'w_ay'; b.weak = () => (b.ashore > 0 ? 1.6 : H.RES()); b.onChain = () => { if (b.sub) return; b.ashore = 6; b.z = -165.5; H.openUp(b, 6, 'w_open'); }; };
  G.mis.flag = await H.bossFight('aydarho', 0, -170.5, [['ay', 'd_ay1'], ['gu', 'd_gu10']], H.dragonAI);
  await H.gainPower(8, 'pw8', 'pw8d'); return win(); };

// ===== CHAPTER 5 (Sarbinaz) =====
RUN['5-1'] = async () => { const { DUSK } = H.moods; await H.chapterIntro(5, 'nar9', 'ruins');
  const p = await sar(DUSK, H.B[5], [], 3);
  const gA = post([['askar', -1.8, -33.4, 's'], ['askar', 1.8, -34.2, 's'], ['heavy', 0, -38], ['wolf', 5, -40, 'p', 2], ['archer', -7, -46], ['archer', 7, -46]], { fire: [0, -35.4] });
  const gB = post([['heavy', 3, -64], ['wolf', -6, -60, 'p', 2], ['wolf', 6, -60, 'p', 2], ['shaman', 0, -72], ['askar', -4, -66], ['askar', 4, -66]], { label: 'mb_cap' }); leader(gB, 0, -68);
  page(-9.6, -52); chest(9.5, -84, 100);
  setMusic('calm'); await ban(3); mstart(); await say([['sa', 'x5a']]);
  H.objective('o_pass'); setMusic('battle'); const g0 = gate(-100);
  await clear(gA); await dead(rein([['wolf', -8, p.z + 9], ['wolf', 8, p.z + 9], ['wolf', 0, p.z - 12], ['askar', -4, p.z - 13], ['askar', 4, p.z - 13]], 'sa', 'bk_back'));
  await clear(gB); await dead(rein([['wolf', -7, p.z - 10], ['wolf', 7, p.z - 10], ['archer', 0, p.z - 14]])); g0.open(); setMusic('off'); await H.victory(); return win(); };
// 5-2 archer duel: four firing lines seen from the start; rush them between volleys; twist: sorcerers join the last line
RUN['5-2'] = async () => { const { DUSK } = H.moods;
  const p = await sar(DUSK, H.B[5], [], 3, 3);
  const g1 = post([['archer', -6, -34], ['archer', 6, -34], ['archer', 0, -40], ['askar', -3, -29, 'p', 2], ['askar', 3, -29, 'p', 2]], { label: 'e_arch' });
  const s1 = stakes(-47, -G.W, G.W, [7.5, 2.4]); const g2 = post([['archer', -9, -51], ['archer', -4, -52], ['archer', 1, -52], ['archer', 6, -51], ['mage', -2, -56]], { label: 'e_arch', face: 0 });
  const g3 = post([['archer', -8, -88], ['archer', 8, -88], ['archer', -3, -94], ['archer', 3, -94], ['wolf', -6, -82, 'p', 2], ['wolf', 6, -82, 'p', 2]], { label: 'e_arch' });
  const s2 = stakes(-100, -G.W, G.W, [-7.5, 2.4]); const g4 = post([['archer', -9, -104], ['archer', 9, -104], ['archer', 0, -110], ['heavy', 0, -103.5], ['archer', 4, -106]], { label: 'e_arch', face: 0 });
  chest(-9.5, -64, 90);
  setMusic('calm'); await ban(3); mstart(); H.objective('mo_5_2'); setMusic('battle'); hint('ms_archint', 7);
  const g0 = gate(-60); await clear(g1); await clear(g2); g0.open(); H.setCP(0, -56);
  const gx = gate(-120); await clear(g3); rein([['mage', -6, -107], ['mage', 6, -107]], 'sa', 'bk_rein'); await clear(g4); await until(() => enemies().length === 0 || G.mis.force); gx.open();
  setMusic('off'); await H.victory(); return win(); };
// 5-3 the wounded maiden rides (faster than walking); ambushes are checkpoints, never a full restart
async function escortRide(z0, zGoal, hp, ambush, hintKey, objKey) {
  const e = spawn('qiz', 0, z0, 'ally'); e.maxHp = e.hp = hp; e.d = { ...e.d, follow: false }; e.rot = Math.PI; toggleMount(e, true); e.horseHp = e.horseMax = 1e9; G.mis.esc = e; let failed = false, ever = false, cpZ = z0, wt = 0, ev = 0;
  const d0 = e.damage.bind(e); e.damage = (a, s, o) => { if (failed || G.mis.force) return 0; const r = d0(a, s, o); if (e.hp <= 0 || e.dead) { e.dead = false; e.hp = 1; failed = ever = true; } return r; }; e.die = () => { failed = ever = true; e.hp = 1; };
  const amb = ambush.map(a => ({ ...a, done: false }));
  e.custom = (e, dt) => { const P = G.player, thr = enemies().some(f => f.custom !== sleepAI && hyp(f.x - e.x, f.z - e.z) < 8), nearP = P && !P.dead && hyp(P.x - e.x, P.z - e.z) < 14; e.far = !nearP;
    const want = (!thr && nearP && e.z > zGoal && !failed) ? 3.3 * FAST() : 0; ev += (want - ev) * Math.min(1, dt * 2); e.z -= ev * dt; e.x += (0 - e.x) * Math.min(1, dt * .6); e.rot = Math.PI; e.play('Idle');
    for (const a of amb) if (!a.done && e.z < a.z) { a.done = true; cpZ = e.z; cp(); const es = rein(a.w.map(([ty, x, dz]) => [ty, x, e.z + dz]), 'sa', a.bark); for (const f of es) f.rf = true; }
    return true; };
  hint(hintKey, 7); G.mis.aim = () => e.far ? e : null;
  G.tick = dt => { wt -= dt; if (wt <= 0) { wt = .5; obj(t(objKey) + '  ❤ ' + Math.max(0, Math.round(e.hp / e.maxHp * 100)) + '%'); } };
  for (;;) { await until(() => failed || e.z <= zGoal || G.mis.force); if (!failed || G.mis.force) break;
    await H.bannerShow('', t('ms_fail'), '', 2.4); for (const f of G.ents) if (f.rf && !f.dead) { f.dead = true; f.remove(); } e.z = cpZ + 3; e.hp = e.maxHp * .6; for (const a of amb) if (a.z <= cpZ + 3.5) a.done = false; const P = G.player; P.x = 2.5; P.z = e.z; P.hp = P.maxHp; failed = false; }
  G.tick = null; G.mis.aim = null; G.mis.flag = !ever && e.hp > e.maxHp * .5; e.custom = e2 => { e2.play('Idle'); return true; }; await until(() => enemies().filter(f => f.custom !== sleepAI).length === 0 || G.mis.force); return true; }
RUN['5-3'] = async () => { const { NIGHT } = H.moods;
  const p = await sar(NIGHT, H.B[5], [], 3, 3, { tod: 'night' });
  const gF = post([['askar', -2, -139.4, 's'], ['askar', 1.8, -140.2, 's'], ['archer', -7, -144], ['archer', 7, -144], ['heavy', 0, -145]], { fire: [0, -141.4], label: 'mb_cap', wake: 14 }); leader(gF, 0, -143.5); chest(9.5, -62, 90);
  setMusic('calm'); await ban(3); mstart(); H.objective('mo_5_3'); setMusic('battle');
  await escortRide(-1, -128, 800, [
    { z: -14, w: [['wolf', -7, -14], ['wolf', 7, -14], ['wolf', 0, -18]], bark: 'bk_wolf' },
    { z: -40, w: [['askar', -5, -14], ['askar', 5, -14], ['archer', -8, -20], ['archer', 8, -20]], bark: 'bk_arch' },
    { z: -66, w: [['wolf', -9, 9], ['wolf', 9, 9], ['heavy', 0, -14], ['askar', -4, -12]], bark: 'bk_back' },
    { z: -96, w: [['shaman', 0, -20], ['askar', -6, -12], ['askar', 6, -12], ['wolf', -3, -16], ['wolf', 3, -16]], bark: 'bk_rein' }], 'ms_eschint2', 'mo_5_3');
  obj(t('o_horde')); await clear(gF); await until(() => enemies().length === 0 || G.mis.force); setMusic('off'); await H.victory(); return win(); };
RUN['5-4'] = async () => { const { DUSK } = H.moods;
  const p = await sar(DUSK, H.B[5], ['qunqar'], -96); const b0 = preBoss('qunqar', 0, -136);
  const gG = post([['askar', -4, -108], ['askar', 4, -108], ['wolf', -7, -111, 'p', 2], ['wolf', 7, -111, 'p', 2], ['archer', 0, -114]]);
  setMusic('calm'); await ban(3); mstart();
  H.objective('o_qunqar'); setMusic('battle'); await clear(gG); await H.goTo(-116);
  G.onBoss = b => H.weakWhile(b, () => G.player.shield > 0, 'w_qu');
  G.mis.flag = await H.bossFight('qunqar', 0, -136, [['qu', 'd_qu1'], ['sa', 'd_sa2']], H.bossBrain({ dmg: 52, every: 2.9, moves: ['quake', 'charge', 'charge'], col: 0xff4422, phases: [[[1, .6], e => { e.spdMul = 1.15; }], [[2, .3], e => { e.dmgMul = 1.3; e.spdMul = 1.3; }]] }));
  await H.gainPower(9, 'pw9', 'pw9d'); return win(); };

// ===== CHAPTER 6 =====
const SAR6 = { allies: [['sarbinaz', 2.6, 2]] };
RUN['6-1'] = async () => { const { DAY } = H.moods; await H.chapterIntro(6, 'nar10', 'ruins');
  const p = await gu(6, DAY, H.B[6], ['sarbinaz'], 3, 5, 4, SAR6);
  const gA = post([['potion', 3, -38], ['askar', -6, -34, 'p', 2], ['askar', 6, -34, 'p', 2], ['askar', 0, -40], ['archer', -8, -46], ['archer', 8, -46], ['shaman', 0, -50]]);
  const gB = post([['heavy', -3, -82], ['wolf', -6, -72, 'p', 2], ['wolf', 6, -72, 'p', 2], ['askar', -3, -86], ['askar', 3, -86], ['archer', -8, -96], ['archer', 8, -96], ['shaman', 0, -100]], { label: 'mb_cap' }); leader(gB, 0, -84);
  page(9.4, -62); chest(-9.4, -24, 100);
  setMusic('calm'); await ban(3); mstart(); await say([['sa', 'x6a'], ['gu', 'x6b']]);
  H.objective('o_city'); setMusic('battle'); const g0 = gate(-60);
  await clear(gA); g0.open(); const g1 = gate(-112); await dead(rein([['askar', -10, p.z - 4], ['askar', 10, p.z - 4], ['wolf', -10, p.z + 4], ['wolf', 10, p.z + 4], ['archer', 0, p.z - 14]], 'sa', 'bk_amb'));
  gB.o.onWake = () => bark('sa', 'f13c'); await clear(gB);
  setMusic('off'); await H.victory(); return win(); };
RUN['6-2'] = async () => { const { DAY } = H.moods;
  const p = await gu(6, DAY, H.B[6], ['sarbinaz'], -70, 5, 4, { ...SAR6, tod: 'dusk' });
  const caps = [[-3, -88], [0, -89], [3, -88], [-1.5, -91.5], [1.5, -91.5]].map(([x, z]) => { const c = spawn('asir', x, z, 'ally'); c.maxHp = c.hp = 620; c.rot = 0; c.custom = c2 => { c2.play('Sit_Floor_Idle'); return true; }; return c; }); flyPt(0, -89, 'e_cap');
  const gW = post([['askar', -6, -106], ['askar', 6, -106], ['wolf', 0, -108, 'p', 3], ['archer', -8, -110]], { wake: 0 });
  setMusic('calm'); await ban(3); mstart(); bark('sa', 'bk_rein');
  G.mis.flag = true; let lost = 0, wt = 0; G.tick = dt => { const n = caps.filter(c => c.dead).length; if (n > lost) { lost = n; G.mis.flag = false; hintRaw(t('s_nocap') + ' ✗'); } wt -= dt; if (wt <= 0) { wt = .5; $('obj').textContent = t('mo_6_2') + '  ⛓ ' + (caps.length - lost) + '/' + caps.length; } };
  const g0 = gate(-112); setMusic('battle'); hint('ms_defhint', 6); const raid = raidAI(caps); H.setCP(0, -84);
  const W = async (list, es0) => { const es = es0 || list.map(([ty, x, z]) => { const e = sp(TY(ty), x, z); if (!e.potion) e.custom = raid; return e; }); G.mis.aim = () => near(es); await until(() => es.every(e => e.dead) || caps.every(c => c.dead) || G.mis.force); G.mis.aim = null; };
  wake(gW); for (const e of gW.es) e.next = raid; await W(null, gW.es);
  const WV = [[[['wolf', -9, -74], ['wolf', 9, -74], ['askar', -4, -70], ['askar', 4, -70]], 'bk_back'], [[['askar', -7, -106], ['askar', 7, -106], ['heavy', 0, -104], ['wolf', -3, -110], ['wolf', 3, -110], ['shaman', 0, -111]], 'bk_rein'], [[['wolf', -9, -96], ['wolf', 9, -96], ['askar', -9, -80], ['askar', 9, -80], ['archer', 0, -110]], 'bk_amb']];
  for (const [w, bk] of WV) { if (caps.every(c => c.dead)) break; await wait(1.5); bark('sa', bk); await W(w); }
  if (caps.every(c => c.dead) && !G.mis.force) return fail();
  const b = potionBoss(0, -104); for (const [ty, x, z] of [['askar', -6, -104], ['askar', 6, -104]]) { const e = spawn(ty, x, z); e.custom = raid; }
  await until(() => (b.dead && enemies().length === 0) || caps.every(c => c.dead) || G.mis.force); if (caps.every(c => c.dead) && !G.mis.force) return fail();
  setBoss(null); G.tick = null; g0.open(); for (const c of caps) if (!c.dead) c.play('Cheer', { force: true }); setMusic('off'); await H.victory(); return win(); };
RUN['6-3'] = async () => { const { DAY } = H.moods;
  const p = await gu(6, DAY, H.B[6], ['sarbinaz'], -100, 5, 4, SAR6); const gt = H.gateDoor(0, -120); flyPt(0, -120, 'e_gate');
  const c = await H.captives([[-8, -132], [-6, -134], [6, -134], [8, -132]]);
  const gI = post([['askar', -5, -140, 'p', 2], ['askar', 5, -140, 'p', 2], ['shaman', 0, -146], ['wolf', -3, -136], ['wolf', 3, -136], ['archer', -7, -150], ['archer', 7, -150]], { label: 'mb_cap', wake: 0 }); leader(gI, 0, -142);
  const gO = post([['askar', -4, -112], ['askar', 4, -112], ['askar', 0, -110, 'p', 3]], { nofly: true }); chest(9.4, -156, 110);
  setMusic('battle'); await ban(3); mstart();
  H.objective('o_gate'); H.hint('', 6, t('h_gate')); let nw = 9, k = 0; G.mis.aim = () => near(alive(gO)) || { x: 0, z: -118 };
  G.tick = dt => { nw -= dt; if (nw <= 0 && !gt.dead) { nw = 13; if (enemies().filter(e => e.custom !== sleepAI).length < 6) { k++; rein(k % 2 ? [['askar', -9, p.z + 9], ['askar', 9, p.z + 9], ['archer', 0, p.z + 12]] : [['wolf', -9, p.z + 8], ['wolf', 9, p.z + 8], ['askar', 0, p.z + 11]], 'sa', k === 1 ? 'bk_back' : null); } } };
  await until(() => gt.dead || G.mis.force); G.tick = null; G.mis.aim = null; if (!gt.dead) gt.shatter(); H.setCP(0, -124); gI.wakeR = 14; wake(gI);
  await clear(gI); await until(() => enemies().length === 0 || G.mis.force); await H.freeCaptives(c);
  setMusic('off'); await wait(1.4); await H.victory(); return win(); };
RUN['6-4'] = async () => { const { DAY } = H.moods;
  const p = await gu(6, DAY, H.B[6], ['qargashiq', 'sarbinaz'], -126, 5, 4, SAR6); const b0 = preBoss('qargashiq', 0, -160);
  const gG = post([['askar', -4, -140], ['askar', 4, -140], ['archer', -8, -144], ['archer', 8, -144]]);
  setMusic('calm'); await ban(3); mstart();
  H.objective('o_king'); setMusic('battle'); await clear(gG); await H.goTo(-143);
  G.onBoss = b => H.weakWhile(b, () => G.player.giant > 0, 'w_qg');
  G.mis.flag = await H.bossFight('qargashiq', 0, -160, [['qg', 'd_qg1'], ['gu', 'd_gu11']], H.bossBrain({ dmg: 56, every: 2.6, moves: ['charge', 'quake', 'charge', 'volley'], col: 0x221111, phases: [[[1, .5], e => { e.spdMul = 1.15; }], [[2, .2], e => { e.dmgMul = 1.3; }]] }));
  await H.gainPower(0, 'pw0', 'pw0d'); return win(); };

// ===== CHAPTER 7 =====
const ALL7 = { allies: [['sarbinaz', -2.6, 2], ['otbasqan', 2.6, 2]] };
RUN['7-1'] = async () => { const { DUSK } = H.moods; await H.chapterIntro(7, 'nar11', 'ruins'); G.curCh = 6; mstart();
  await H.rideLevel('gulayim', DUSK, 'o_ride7', [['askar', -5, -40], ['askar', 5, -42], ['askar', 0, -46], ['archer', -7, -52], ['archer', 7, -52], ['askar', -3, -58], ['askar', 3, -60], ['askar', 0, -66]], 'fight'); return win(); };
RUN['7-2'] = async () => { const { DUSK } = H.moods;
  const p = await gu(7, DUSK, H.B[7], ['qashqir', 'sarbinaz', 'otbasqan'], 3, 6, 3, ALL7);
  const gA = post([['heavy', 0, -38], ['askar', -2.2, -33.4, 's'], ['askar', 2, -34.2, 's'], ['wolf', -6, -40, 'p', 2], ['wolf', 6, -40, 'p', 2], ['archer', -8, -48], ['archer', 8, -48], ['shaman', 0, -52]], { fire: [0, -35.4] });
  const st = stakes(-66, -G.W, G.W, [8.5, 2.2]);
  const gB = post([['heavy', -2, -76], ['potion', 2, -76], ['wolf', -6, -72, 'p', 2], ['wolf', 6, -72, 'p', 2], ['askar', -4, -80], ['askar', 4, -80], ['archer', -7, -70], ['archer', 0, -69.5]], { label: 'n_qa' });
  const qa = preBoss('qashqir', 0, -88, 'n_qa', 'p_qa'); page(-9.6, -58); chest(9.5, -98, 120);
  setMusic('calm'); await ban(3); mstart(); await say([['gu', 'x7a'], ['sa', 'x7b'], ['ot', 'x7c']]);
  H.objective('o_horde'); setMusic('battle'); const g0 = gate(-110);
  await clear(gA); H.hint('', 6, t('h_leap')); await dead(rein([['wolf', -8, p.z + 9], ['wolf', 8, p.z + 9], ['askar', -9, p.z - 3], ['askar', 9, p.z - 3]], 'sa', 'bk_back'));
  gB.o.onWake = () => { qa.custom = H.qashqirAI; qa.asleep = false; qa.maxHp = qa.hp = 1800; setBoss(qa); bark('ot', 'f13c'); }; await clear(gB); await until(() => qa.dead || G.mis.force); if (!qa.dead) qa.die(); setBoss(null); await until(() => enemies().length === 0 || G.mis.force);
  g0.open(); setMusic('off'); await H.victory(); return win(); };
RUN['7-3'] = async () => { const { NIGHT } = H.moods;
  const p = await gu(7, NIGHT, H.B[7], ['sarbinaz', 'otbasqan'], 3, 6, 3, { ...ALL7, tod: 'night' });
  const TP = [[-7, -40], [7, -58], [-7, -80], [7, -98]], tt = TP.map(([x, z]) => H.totem(x, z)); TP.forEach(([x, z], i) => { const s = x > 0 ? -1 : 1; const g = post([['askar', x + s * 2.5, z + 1.5], ['archer', x + s * 1, z - 2.5], [i % 2 ? 'shaman' : 'wolf', x + s * 4, z - 1, i % 2 ? 'g' : 'p', 2]], { label: 'mn_7_3', nofly: i === 1 || i === 2, wake: 10 }); });
  chest(9.5, -30, 120);
  setMusic('calm'); await ban(3); mstart();
  H.objective('mo_7_3'); setMusic('battle'); const g0 = gate(-112); H.hint('', 6, t('h_totem')); let nw = 8, tw = false;
  G.mis.aim = () => near(tt.filter(o => !o.dead).map(o => ({ x: o.x, z: o.z })));
  G.tick = dt => { nw -= dt; const up = tt.filter(o => !o.dead); if (!tw && up.length <= 2) { tw = true; rein([['heavy', -3, p.z + 10], ['heavy', 3, p.z + 10], ['wolf', 0, p.z + 12]], 'sa', 'bk_back'); cp(); }
    if (nw <= 0) { nw = 11; if (enemies().filter(e => e.custom !== sleepAI).length < 7 && (G.mis.nE || 0) < F3_CAP) for (const o of up.filter(o => Math.abs(o.z - p.z) < 26).slice(0, 2)) { sp(Math.random() < .5 ? 'askar' : 'wolf', o.x + (o.x > 0 ? -2 : 2), o.z + 1.5); burst(o.x, 2, o.z, 0xff2010, 2); } } };
  await until(() => tt.every(o => o.dead) || G.mis.force); G.tick = null; G.mis.aim = null; for (const o of tt) if (!o.dead) o.shatter(); for (const g of G.mis.groups) if (g.es.length && !g.awake && g.o) wake(g, true);
  await dead(rein([['heavy', -3, p.z - 12], ['heavy', 3, p.z - 12], ['shaman', 0, p.z - 18], ['askar', -6, p.z - 10], ['askar', 6, p.z - 10]], 'ot', 'bk_rein')); await until(() => enemies().length === 0 || G.mis.force); g0.open();
  setMusic('off'); await H.victory(); return win(); };
RUN['7-4'] = async () => { const { DUSK } = H.moods;
  const p = await gu(7, DUSK, H.B[7], ['surtaysha', 'sarbinaz', 'otbasqan'], -112, 6, 3, ALL7);
  const s = preBoss('surtaysha', 0, -150); s.invuln = true; s.helm = 3; s.maxHp = s.hp = 9000;
  setMusic('calm'); await ban(3); mstart();
  H.objective('o_final'); await H.goTo(-122);
  G.freeze = true; p.act = null; p.play('Idle'); await wait(.5);
  await say([['su', 'd_su5'], ['gu', 'd_gu12'], ['su', 'd_su6']]); G.freeze = false; s.asleep = false; setBoss(s); setMusic('boss'); const d0 = G.stats.deaths; H.setCP(0, -124);
  H.objective('o_helm'); H.hint('', 6, t('h_helm')); s.onChain = () => { if (s.helm > 0) { s.helm--; burst(s.x, 4, s.z, 0xffd060, 3); num(s, t('helm') + ' ' + (3 - s.helm) + '/3', 'c'); Sfx.big(); } };
  s.custom = H.bossBrain({ dmg: 50, every: 2.6, moves: ['quake', 'volley', 'charge'], col: 0xaa0010 });
  await until(() => s.helm <= 0); s.invuln = false; flash(.5); await H.bannerShow('', t('helmOff'), '', 2);
  H.objective('o_totem'); H.hint('', 6, t('h_totem')); const tt = [H.totem(-8, -140), H.totem(8, -140), H.totem(-8, -162), H.totem(8, -162)];
  G.tick = dt => { if (s.dead) return; if (tt.some(o => !o.dead)) { s.hp = Math.min(s.maxHp, s.hp + dt * 40 * ([.35, 1, 1.2][SET.diff] ?? 1)); } };
  await until(() => tt.every(o => o.dead) && s.hp < s.maxHp * .35); G.tick = null;
  G.freeze = true; s.invuln = true; await say([['su', 'd_su7'], ['gu', 'd_gu13']]); H.objective('o_wrestle'); await qte(9, 14, 9); G.freeze = false; s.invuln = false; s.damage(s.hp + 10, p, { crit: true }); H.soul(s);
  G.mis.flag = G.stats.deaths === d0; await wait(1.4); setMusic('off'); await H.victory(); return win(); };

// ---------- test helper (never used in normal play) ----------
// auto(on, fast, steps, ts, soft): god-mode auto-play. soft = bot mode: the hero walks toward the arrow target and fights at a human-like pace (for pacing checks)
function auto(on = true, fast = 8, steps = 4, ts = 2, soft = false) { clearInterval(auto.iv); if (!on) { G.steps = 1; G.ts = 1; G.misFast = 1; return; } G.misFast = fast; G.steps = steps; G.ts = ts; let lt = G.time;
  auto.iv = setInterval(() => { try { const dT = Math.min(3, G.time - lt); lt = G.time;
    if (G.onEnter && !$('end').classList.contains('on')) G.onEnter();
    if ($('lore') && $('lore').classList.contains('on')) $('lore').querySelector('button').click();
    if ($('dead') && $('dead').classList.contains('on')) $('dretry').click();
    if (G.qte) G.qte.v = 100;
    const p = G.player; if (!p || G.paused || G.flying) return; p.hp = p.maxHp; if (p.horseHp !== undefined) p.horseHp = 999;
    const b = G.boss;
    if (soft) { let n = 0; for (const e of G.ents) if (e.team === 'enemy' && !e.dead && !e.bg && !e.invuln && e.spawnT <= 0 && e !== b && e.custom !== sleepAI && !e.asleep && Math.hypot(e.x - p.x, e.z - p.z) < 5 && n++ < 3) e.damage(45 * dT, p);
      if (b && !b.dead) { if (b.helm > 0 && b.onChain) b.onChain(); else if (!b.invuln && !b.asleep && Math.hypot(b.x - p.x, b.z - p.z) < 7) b.damage(120 * dT, p); }
      for (const o of G.breakables || []) if (!o.dead && Math.hypot(o.x - p.x, o.z - p.z) < 4) o.hit(o.only || 'slam');
      let tg = G.mis && G.mis.aim && G.mis.aim(); if (!tg) { let bd = 1e9; for (const e of G.ents) { if (e.team !== 'enemy' || e.dead || e.bg || e.custom === sleepAI || e.asleep) continue; const d = Math.hypot(e.x - p.x, e.z - p.z); if (d < bd) { bd = d; tg = e; } } } if (!tg && G.markers && G.markers.length) tg = G.markers[G.markers.length - 1]; if (!tg && G.ravineAhead) tg = { x: 0, z: -176 };
      if (!tg && G.mis && G.mis.cv) tg = { x: G.mis.cv.x + 3, z: G.mis.cv.z - 3 }; if (!tg && G.mis && G.mis.esc) tg = { x: G.mis.esc.x + 2, z: G.mis.esc.z - 2 };
      if (tg) { const dx = tg.x - p.x, dz = tg.z - p.z, d = Math.hypot(dx, dz); if (d > 2.2) { const st = Math.min(d - 1.8, 6.5 * dT); p.x += dx / d * st; p.z += dz / d * st; if (G.ravineAhead && p.z < -158 && p.z > -170) p.z = -171; } } return; }
    for (const e of G.ents) if (e.team === 'enemy' && !e.dead && !e.bg && !e.invuln && e.spawnT <= 0 && e !== b && !e.asleep) e.damage(1e6, p);
    if (b && !b.dead) { if (b.helm > 0 && b.onChain) b.onChain(); else if (!b.invuln && !b.asleep && b.spawnT <= 0) b.damage(Math.max(400, b.maxHp * .2), p); }
    for (const o of G.breakables || []) if (!o.dead) o.hit(o.only || 'slam');
    const tg = G.mis && G.mis.aim && G.mis.aim();
    if (G.mis && G.mis.esc && !G.mis.esc.dead) { p.x = G.mis.esc.x + 2.5; p.z = G.mis.esc.z - 1; }
    else if (tg) { p.x = tg.x + 1; p.z = tg.z + 1.5; }
    else if (G.markers && G.markers.length) { const m = G.markers[G.markers.length - 1]; p.x = m.x; p.z = m.z + .5; }
    else if (G.ravineAhead) { p.z = -172; }
  } catch (e) { console.warn('[auto]', e.message); } }, 600); }
// ======================================================================
// MISSIONS v3 (author's list, Nov 20): rescue battles + duels. Earlier mission code is reused where the beat survives (OLD[...]),
// new beats are added through hooks: G.mis.onLive (level built), G.mis.onRide (riders spawned), G.mis.beforeWin (final duel).
// ======================================================================
const OLD = { ...RUN };
const SAFE_BACK = z => ({ x: 0, z });
function yurt(x, z, s = 1) { const g = new THREE.Group(), fm = new THREE.MeshStandardMaterial({ color: 0xcdb48a, roughness: 1 }), dk = new THREE.MeshStandardMaterial({ color: 0x5a3c20, roughness: 1 });
  const w = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 1.7, 18, 1, true), fm); w.position.y = .85; const r = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.3, 18), fm); r.position.y = 2.3; const d = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.4), dk); d.position.set(0, .7, 2.41);
  for (const m of [w, r]) { m.castShadow = m.receiveShadow = true; m.material.side = THREE.DoubleSide; } g.add(w, r, d); g.position.set(x, 0, z); g.scale.setScalar(s); world.add(g); return g; }
function doorAt(x, z, ry = 0, hp = 300) { const m = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.6, .35), new THREE.MeshStandardMaterial({ color: 0x5a3a1c, roughness: 1 })); m.position.set(x, 1.3, z); m.rotation.y = ry; m.castShadow = true; world.add(m);
  return breakable({ mesh: m, x, z, hp, dmg: { slam: 120, any: 60 }, barY: 3.3, rad: 1.4, showNum: true, dust: 0x6a4a2a, spark: 0xffcc88, chunks: 14 }); }
function cageAt(x, z) { const g = new THREE.Group(), im = new THREE.MeshStandardMaterial({ color: 0x3a3430, metalness: .6, roughness: .5 }); for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283, b = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 2.2, 5), im); b.position.set(Math.cos(a) * 1.6, 1.1, Math.sin(a) * 1.6); g.add(b); }
  const top = new THREE.Mesh(new THREE.TorusGeometry(1.6, .06, 6, 24), im); top.rotation.x = Math.PI / 2; top.position.y = 2.2; g.add(top); g.position.set(x, 0, z); world.add(g); return g; }
const crowdOf = (a, b, c) => [['askar', a], ['archer', b || 0], ['wolf', c || 0]].filter(x => x[1]);
// duel opponents ("champions"): a base unit scaled up, with a boss move set (telegraphed charge / quake / volley)
const CH = {
  yuz: { type: 'askar', scale: 1.42, hp: 900, name: 'v3c_yuz', title: 'v3t_yuz', brain: { dmg: 30, every: 3.4, moves: ['charge', 'quake'] } },
  bay: { type: 'bayimbet', scale: 1.05, hp: 800, name: 'n_ba', title: 'v3t_bay', nonLethal: .3, brain: { dmg: 24, every: 3.2, moves: ['charge'] } },
  cap: { type: 'askar', scale: 1.5, hp: 1500, name: 'v3c_kap', title: 'v3t_kap', brain: { dmg: 34, every: 3, moves: ['charge', 'quake', 'charge'] } },
  ch1: { type: 'nayza', scale: 1.3, hp: 1100, name: 'v3c_ch1', title: 'v3t_ch1', brain: { dmg: 34, every: 3.2, moves: ['charge'] } },
  ch2: { type: 'askar', scale: 1.55, hp: 1400, name: 'v3c_ch2', title: 'v3t_ch2', brain: { dmg: 34, every: 2.8, moves: ['charge', 'quake'] } },
  ch3: { type: 'jallod', scale: .68, hp: 1900, name: 'v3c_ch3', title: 'v3t_ch3', heavy: true, brain: { dmg: 36, every: 2.6, moves: ['quake', 'charge', 'volley'], col: 0xaa3322 } },
  w1: { type: 'boribasi', scale: 1.1, hp: 1500, name: 'v3c_w1', title: 'v3t_w', brain: { dmg: 30, every: 3, moves: ['charge'] } },
  w2: { type: 'boribasi', scale: 1.2, hp: 1900, name: 'v3c_w2', title: 'v3t_w', brain: { dmg: 32, every: 2.7, moves: ['charge', 'quake'] } },
  w3: { type: 'boribasi', scale: 1.32, hp: 2400, name: 'v3c_w3', title: 'v3t_w', brain: { dmg: 36, every: 2.4, moves: ['charge', 'quake', 'charge'], col: 0x8822aa } },
};
const champ = (k, x, z, o = {}) => duel({ ...CH[k], x, z, R: 7.5, ...o });
const arenaOf = (k, x, z, o = {}) => arena({ ...CH[k], x, z, R: 7.5, ...o });

// ---------- PROLOGUE ----------
// 0-1 Sarkop gate: townsfolk flee inside while Allayar holds the square
RUN['0-1'] = async () => { G.mis.onLive = () => { G.mis.safe = { x: 0, z: 9 };
    people([['mother', -8, -27], ['child', -7, -28.5], ['elder', -9, -29]], { kind: 'bound', T: 55, guardR: 11, near: 26, label: 'r_town' });
    people([['asir', 7, -50], ['mother', 8.5, -51], ['child', 6.5, -52]], { kind: 'bound', T: 70, guardR: 13, near: 30, label: 'r_town' }); };
  return OLD['0-1'](); };
// ---------- CHAPTER 1 ----------
// 1-1 Burning village: roped villagers are dragged off; take them back, find mother, then the yuzbashi duel
RUN['1-1'] = async () => { G.mis.onLive = () => { G.mis.safe = { x: 2, z: -18 };
    dragGroup([['asir', -3, -41], ['mother', -4, -42], ['child', -2, -42.5]], [['askar', -2.5, -38.5]], { x: -G.W - 3, z: -60 }, { speed: 1.25, near: 15, label: 'r_drag' });
    dragGroup([['asir', 4, -86], ['elder', 5, -87], ['asir', 3, -87.5]], [['askar', 4, -84], ['askar', 6, -84.5]], { x: G.W + 3, z: -98 }, { speed: 1.2, near: 26, label: 'r_drag', safe: { x: 0, z: -64 } }); };
  let A = null; const ol = G.mis.onLive; G.mis.onLive = () => { ol(); A = arenaOf('yuz', 0, -96, { crowd: crowdOf(5, 2) }); };
  G.mis.beforeWin = async () => { await champ('yuz', 0, -96, { arena: A, after: 'flee', intro: [['gu', 'v3d_yuz']] }); await wait(.8); await H.victory(); };
  return OLD['1-1'](); };
// 1-2 Stable siege: women and children locked in the burning stable; a shaman and his wolves ring it
RUN['1-2'] = async () => {
  const p = await ch1Start(-84, [1, 2, 3, 4, 5]); spawn('sarbinaz', 3, -82, 'ally'); G.mis.safe = { x: 0, z: -84 };
  fire(9.6, -97.5, 1.3); fire(9.8, -102.5, 1.2);
  const door = doorAt(7.8, -100, Math.PI / 2, 420);
  const gS = post([['shaman', 2, -106], ['wolf', -4, -98, 'p', 2], ['wolf', 5, -94, 'pz', 2], ['wolf', -6, -104], ['askar', 0, -100, 'p', 2.5], ['wolf', 4, -108]], { label: 'e_mage', wake: 14 });
  const sh = gS.es[0]; sh.maxHp = sh.hp = 520; sh.d = { ...sh.d, name: 'v3c_sham' }; sh.vs *= 1.2;
  const st = people([['mother', 9.6, -99], ['child', 9.8, -100.6], ['child', 9.4, -101.8], ['mother', 9.9, -98], ['elder', 9.7, -102.6]], { kind: 'fire', T: 70, door, near: 28, label: 'r_fire', face: -Math.PI / 2 });
  chest(-9.3, -93, 60); live(); setMusic('calm'); await ban(3); mstart();
  obj(t('v3o_1_2')); setMusic('battle'); const g3 = gate(-114); G.mis.aim = () => door.dead ? near(enemies()) : { x: 6.6, z: -100 };
  wake(gS); setBoss(sh); let tw = false; G.tick = () => { if (!tw && st.T < 45) { tw = true; rein([['wolf', -8, p.z + 9], ['wolf', 8, p.z + 9], ['boribasi', 0, p.z + 12]], 'sa', 'bk_back'); } };
  await until(() => (door.dead || st.done) && enemies().length === 0 || G.mis.force); if (G.mis.force && !door.dead) door.shatter(); G.tick = null; setBoss(null); G.mis.aim = null; g3.open(); setMusic('off'); await wait(1); await H.victory(); return win(); };
// 1-3 Narrow bridge: a spearmen phalanx holds the bridge while the captive caravan is driven away on the far side
function phalanxAI(row) { return (e, dt) => { const P = G.player; if (e.hp < e.maxHp * .92 || row.broken || (P && hyp(P.x - e.x, P.z - e.z) < 3.2)) { row.broken = row.broken || e.hp < e.maxHp * .5; e.custom = null; return false; } if (!row.go) { e.play('Idle_Combat'); return true; }
  e.z += .55 * dt * FAST(); e.rot = 0; e.play('Walking_A', { ts: .55 }); e.farT = -1e9; return true; }; }
RUN['1-3'] = async () => { const { DUSK } = H.moods;
  const p = await ch1Start(3, [1, 2, 3, 4, 5], DUSK); tod('dusk'); spawn('sarbinaz', 3, 5, 'ally'); G.mis.safe = { x: 0, z: -40 };
  // the bridge: plank deck between rails (colliders keep everyone on it)
  const dk = new THREE.Mesh(new THREE.BoxGeometry(6.4, .25, 34), new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: .95 })); dk.position.set(0, .1, -77); dk.receiveShadow = true; world.add(dk);
  const rm = new THREE.MeshStandardMaterial({ color: 0x4a3018, roughness: 1 }); for (const sx of [-3.3, 3.3]) { const rl = new THREE.Mesh(new THREE.BoxGeometry(.18, .18, 34), rm); rl.position.set(sx, 1.05, -77); world.add(rl); for (let z = -60; z >= -94; z -= 1.7) { const po = new THREE.Mesh(new THREE.CylinderGeometry(.1, .12, 1.15, 6), rm); po.position.set(sx, .58, z); po.castShadow = true; world.add(po); G.colC.push({ x: sx, z, r: .5 }); } for (let z = -60; z >= -94; z -= 1.3) { G.colC.push({ x: Math.sign(sx) * 5.5, z, r: 2.2 }); G.colC.push({ x: Math.sign(sx) * 9.6, z, r: 2.5 }); } }
  const g1 = post([['askar', -.4, -30.2, 's'], ['askar', -3.6, -29.6, 's'], ['askar', 3, -33, 'p', 3], ['archer', -8.5, -30], ['wolf', 6, -27, 'pz', 2]], { fire: [-2, -31.6] });
  const row = { go: false, broken: false }; G.noVar = true;
  const ph = post([['nayza', -2, -63], ['nayza', 0, -63], ['nayza', 2, -63], ['nayza', -1, -65], ['nayza', 1, -65], ['archer', -1.5, -69], ['archer', 1.5, -69]], { label: 'v3c_phal', wake: 0, face: 0 });
  for (const e of ph.es) e.next = e.type === 'nayza' ? phalanxAI(row) : null;
  const gC = post([['askar', -3, -100], ['askar', 3, -101], ['archer', 0, -104]], { label: 'mb_cap', wake: 9 }); leader(gC, 0, -102); G.noVar = false;
  const cv = dragGroup([['asir', -1, -99], ['mother', 1, -100], ['child', 0, -101], ['asir', -1, -102], ['elder', 1, -103]], [['askar', 0, -97]], { x: 0, z: -124 }, { speed: .95, near: 42, label: 'r_drag' });
  page(9.6, -47); chest(-9.6, -50, 70);
  live(); setMusic('calm'); await ban(3); mstart(); await say([['sa', 'f13a'], ['gu', 'v3d_13']]);
  obj(t('v3o_1_3')); setMusic('battle'); const gt = gate(-128);
  await clear(g1); H.hint('', 7, t('v3h_phal')); await until(() => p.z < -50 || G.mis.force); wake(ph); row.go = true; bark('sa', 'v3b_phal');
  G.mis.aim = () => near(ph.es) || near(cv.hand); await until(() => alive(ph).length === 0 || G.mis.force); if (G.mis.force) for (const e of ph.es) if (!e.dead) e.die(); cp();
  wake(gC); await until(() => (alive(gC).length === 0 && (cv.done || cv.freed || cv.hand.every(e => e.dead))) || G.mis.force); G.mis.aim = null; await until(() => enemies().length === 0 || G.mis.force);
  gt.open(); setMusic('off'); await wait(1.4); await H.victory(); return win(); };
// ---------- CHAPTER 2 ----------
// 2-1 / 4-1 mounted chase: riders carry captives — catch them before they escape
const rideCaps = (es, k = 2) => { es.forEach((f, i) => { if (i % 3 === k % 3) return; people([['asir', f.x, f.z]], { kind: 'ride', guards: [f], auto: true, T: 999, label: 'r_drag' }); }); G.mis.noResHud = false; };
RUN['2-1'] = async () => { G.mis.onRide = es => rideCaps(es, 2); return OLD['2-1'](); };
RUN['4-1'] = async () => { G.mis.onRide = es => rideCaps(es, 1); return OLD['4-1'](); };
// 2-2 Bayimbet's trial: a non-lethal test duel in front of the camp — then raiders fall on the onlookers
RUN['2-2'] = async () => { const { HOT } = H.moods;
  const p = await gu(2, HOT, H.B[2], [], 3, 1); G.mis.safe = { x: 0, z: -14 };
  const gA = post([['askar', -2.2, -62.6, 's'], ['askar', 1.6, -63.4, 's'], ['heavy', 5, -66], ['wolf', -7, -64, 'pz', 2], ['archer', -6, -70], ['archer', 6, -70], ['shaman', 0, -73]], { fire: [-.4, -64.4] }); leader(gA, 0, -67);
  const A = arenaOf('bay', 0, -32, { crowd: [['asir', 4], ['elder', 2], ['mother', 2]] }); chest(9.4, -84, 80); page(-9.6, -46);
  setMusic('calm'); await ban(3); mstart(); await say([['sa', 'x2a'], ['gu', 'x2b']]);
  obj(t('v3o_2_2')); const mk = marker(0, -24); await H.reach(0, -24, 4); mk.remove();
  const r = await champ('bay', 0, -32, { arena: A, after: 'stay', intro: [['ba', 'd_ba1'], ['gu', 'd_gu5'], ['ba', 'v3d_bay']] });
  await say([['ba', 'v3d_bay2'], ['gu', 'd_gu6']]); H.objective('o_ambush');
  // the twist: raiders burst in on the onlookers
  const vil = people([['asir', -6, -36], ['elder', -5, -37.5], ['mother', 6, -36], ['child', 5, -37.5], ['asir', 0, -40]], { kind: 'bound', T: 40, auto: true, label: 'r_town' });
  const am = rein([['wolf', -9, -30], ['wolf', 9, -30], ['askar', -9, -42], ['askar', 9, -42], ['wolf', 0, -46]], 'sa', 'bk_amb'); vil.guards = am; for (const e of am.slice(0, 3)) e.custom = raidAI(vil.ps);
  setMusic('battle'); await dead(am); const g1 = gate(-90); gA.o.onWake = () => bark('sa', 'f13c'); await clear(gA);
  await until(() => enemies().length === 0 || G.mis.force); g1.open(); setMusic('off'); await H.victory(); return win(); };
// 2-3 Battle for the well: the freed people's caravan through the sandstorm (convoy code), raiders hold the well
RUN['2-3'] = async () => OLD['2-3']();
// ---------- CHAPTER 3 ----------
// 3-1 Night camp: free the bound captives yurt by yurt; an alarm turns it into a big battle
RUN['3-1'] = async () => { G.mis.onLive = () => { G.mis.safe = { x: 0, z: -10 };
    [[-8.5, -62], [8.5, -104], [-8, -132]].forEach(([x, z], i) => { yurt(x + (x > 0 ? 1.8 : -1.8), z - 1.5, .9); people([['asir', x, z], ['mother', x + (x > 0 ? -1 : 1), z + .8], ['child', x, z + 1.6]], { kind: 'bound', T: 75 + i * 15, guardR: 12, near: 20, label: 'r_yurt' }); }); };
  return OLD['3-3'](); };
// 3-2 The slave caravan: armoured spearmen guard the roped line
RUN['3-2'] = async () => { G.mis.onLive = () => { G.mis.safe = { x: 0, z: -12 }; G.noVar = true;
    dragGroup([['asir', 4, -47], ['asir', 5, -48.2], ['mother', 4, -49.4], ['child', 5, -50.6]], [['nayza', 4.5, -44.5], ['nayza', 6, -45], ['nayza', 3, -52], ['nayza', 6.6, -51.5]], { x: G.W + 3, z: -66 }, { speed: .9, near: 26, label: 'r_drag' });
    // wave4 / missions audit: a second roped line further up the road, guarded by armoured spearmen and swordsmen — the caravan is the fight of this mission
    dragGroup([['asir', -4, -92], ['asir', -5, -93.2], ['elder', -4, -94.4], ['asir', -5, -95.6]], [['nayza', -4.5, -89.5], ['nayza', -6, -90], ['askar', -3, -97], ['askar', -6.2, -97.5]], { x: -G.W - 3, z: -112 }, { speed: .9, near: 26, label: 'r_drag' });
    G.noVar = false; };
  return OLD['3-1'](); };
// 3-3 Hold the bridge: captives cross the river while boats land raiders from both banks; an archer commander on the ridge
RUN['3-3'] = async () => { const { DAY } = H.moods;
  const p = await gu(3, DAY, H.B[3], [], -30, 2); G.mis.safe = { x: 0, z: -20 };
  const cr = people([['asir', -1, -84], ['mother', 1, -85], ['child', 0, -86], ['asir', -1, -87.5], ['elder', 1, -88.5], ['mother', 0, -90], ['child', -1, -91], ['asir', 1, -92]], { kind: 'walk', speed: .8, auto: true, safe: { x: 0, z: -26 }, label: 'r_walk' });
  const cm = post([['archer', 9.2, -55], ['archer', 9.5, -61], ['archer', 9.2, -67]], { y: 1.3, label: 'v3c_arch', wake: 0, face: -Math.PI / 2 });
  const boss = cm.es[1]; boss.maxHp = boss.hp = 700; boss.vs *= 1.35; boss.o.scale.setScalar(boss.vs); boss.d = { ...boss.d, name: 'v3c_arch' };
  chest(-9.5, -44, 90);
  setMusic('calm'); await ban(3); mstart(); await say([['gu', 'v3d_33']]); obj(t('v3o_3_3')); setMusic('battle');
  G.mis.aim = () => { const al = cr.ps.filter(c => !c.dead && !c.lostP && !c.saved); const e = near(enemies().filter(e => al.some(c => hyp(c.x - e.x, c.z - e.z) < 14))); if (e) return e; if (!al.length) return near(enemies()); return { x: al[0].x, z: al[0].z }; };
  let k = 0, nw = 4; const B = [[['askar', -11, 0], ['askar', -11, 3], ['wolf', -11, -3]], [['askar', 11, 0], ['heavy', 11, 3], ['archer', 11, -3]], [['wolf', -11, 0], ['wolf', 11, 2], ['askar', -11, 4], ['askar', 11, -2]], [['heavy', -11, 0], ['shaman', -11, 3], ['askar', 11, 1]], [['askar', -11, 0], ['askar', 11, 0], ['wolf', -11, 3], ['wolf', 11, 3], ['archer', 11, -3]]];
  G.tick = dt => { cr.halt = enemies().some(e => cr.ps.some(c => !c.dead && hyp(c.x - e.x, c.z - e.z) < 3)); nw -= dt * FAST(); const al = cr.ps.filter(c => !c.dead && !c.lostP && !c.saved); if (nw <= 0 && k < B.length && al.length) { nw = 11; const z0 = al.reduce((s, c) => s + c.z, 0) / al.length; const es = rein(B[k].map(([ty, x, dz]) => [ty, x, z0 + dz]), 'gu', k % 2 ? 'v3b_boat' : null); es.forEach((e, i) => { if (i < 2) e.custom = raidAI(cr.ps); }); burst(-11, .5, z0, 0x88aacc, 3); burst(11, .5, z0, 0x88aacc, 3); if (k === 1) { wake(cm); setBoss(boss); bark('gu', 'v3b_arch'); } k++; } };
  await until(() => (cr.done && enemies().length === 0) || G.mis.force); G.tick = null; setBoss(null);
  setMusic('off'); await wait(1); await H.victory(); return win(); };
// ---------- CHAPTER 4 ----------
// 4-2 Ship deck: get the captives out of the hold, then duel the ship's captain on deck
RUN['4-2'] = async () => { G.mis.onLive = () => { G.mis.safe = { x: 0, z: -60 };
    people([['asir', 7.5, -88], ['mother', 8.5, -89.5], ['child', 7, -90.5], ['asir', 9, -91]], { kind: 'cage', T: 110, guardR: 11, near: 30, label: 'r_hold', exit: { x: G.W + 4, z: -96 } }); cageAt(8, -89.5); };
  let A = null; const ol = G.mis.onLive; G.mis.onLive = () => { ol(); const dk = new THREE.Mesh(new THREE.BoxGeometry(16, .3, 16), new THREE.MeshStandardMaterial({ color: 0x5a3c22, roughness: .9 })); dk.position.set(0, .12, -102); dk.receiveShadow = true; world.add(dk); try { w4Boat(0, -102); } catch (e) { console.warn(e); } A = arenaOf('cap', 0, -102, { crowd: crowdOf(5, 3) }); };
  G.mis.beforeWin = async () => {
    await champ('cap', 0, -102, { arena: A, after: 'flee', intro: [['ot', 'v3d_cap'], ['gu', 'v3d_cap2']] }); await H.victory(); };
  return OLD['4-2'](); };
// 4-3 Wolf chieftain: the fishing village at dusk — save the villagers from the pack
RUN['4-3'] = async () => { G.mis.onLive = () => { G.mis.safe = { x: 0, z: 0 };
    people([['asir', -8, -42], ['mother', -9, -43.5], ['child', -7.5, -44.5]], { kind: 'bound', T: 50, guardR: 13, near: 28, label: 'r_fish' });
    people([['elder', 8, -62], ['asir', 9, -60.5], ['child', 7.5, -61]], { kind: 'bound', T: 60, guardR: 12, near: 26, label: 'r_fish' });
    people([['mother', -8, -96], ['child', -9, -97], ['asir', -7, -98]], { kind: 'bound', T: 60, guardR: 12, near: 24, label: 'r_fish', safe: { x: 0, z: -70 } }); };
  return OLD['4-3'](); };
// ---------- CHAPTER 5 ----------
// 5-1 Pass ambush: carry the wounded maidens out under rockfall and archer fire
RUN['5-1'] = async () => { G.mis.onLive = () => { G.mis.safe = { x: 0, z: -2 }; G.mis.hazard = rain(4.2, 'rock');
    people([['qiz', -8, -40], ['qiz', -7, -41.5]], { kind: 'wound', T: 60, near: 26, label: 'r_wound' });
    people([['qiz', 8, -58], ['qiz', 7, -60]], { kind: 'wound', T: 70, near: 26, label: 'r_wound' });
    people([['qiz', -7.5, -80], ['qiz', -8.5, -82]], { kind: 'wound', T: 80, near: 26, label: 'r_wound', safe: { x: 0, z: -50 } });
    post([['archer', -10.5, -50], ['archer', 10.5, -66], ['archer', -10.5, -86]], { y: 2, label: 'e_arch', wake: 18 }); };
  const r = await OLD['5-1'](); G.mis.hazard = null; return r; };
// 5-2 Sarbinaz alone: three Kalmyk champions, one after another; each holds a cage of captives his men will carry off
RUN['5-2'] = async () => { const { DUSK } = H.moods;
  const p = await sar(DUSK, H.B[5], ['jallod'], 3, 0); G.mis.safe = { x: 0, z: 0 };
  chest(9.5, -84, 100); const AR = {}, CG = {};
  for (const [k, z, cz] of [['ch1', -30, -40], ['ch2', -62, -72], ['ch3', -94, -104]]) { AR[k] = arenaOf(k, 0, z, { crowd: crowdOf(5, 2) }); cageAt(0, cz); CG[k] = people([['asir', -.6, cz], ['mother', .6, cz + .5], ['child', 0, cz - .6]], { kind: 'cage', T: 70, near: 15, guards: [AR[k].foe], label: 'r_cage', exit: { x: 0, z: cz - 30 } }); }
  setMusic('calm'); await ban(3); mstart(); await say([['sa', 'v3d_52']]);
  for (const [k, z, cz] of [['ch1', -30, -40], ['ch2', -62, -72], ['ch3', -94, -104]]) {
    obj(t('v3o_5_2')); const mk = marker(0, z + 6); G.mis.aim = () => ({ x: 0, z: z + 6 }); await H.reach(0, z + 6, 4.5); mk.remove(); G.mis.aim = null;
    await champ(k, 0, z, { arena: AR[k], after: 'flee', intro: [['sa', 'v3d_' + k]] }); p.hp = Math.min(p.maxHp, p.hp + p.maxHp * .4); }
  setMusic('off'); await H.victory(); return win(); };
// 5-3 Archer tower: shepherds are held in the pit under the tower; archers on top, a door at its foot
RUN['5-3'] = async () => { const { DUSK } = H.moods;
  const p = await sar(DUSK, H.B[5], [], 3, 4); G.mis.safe = { x: 0, z: -20 };
  const tw = new THREE.Group(), sm = new THREE.MeshStandardMaterial({ color: 0x8a7a64, roughness: 1 }), wm = new THREE.MeshStandardMaterial({ color: 0x5a3c22, roughness: 1 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.1, 6.2, 14), sm); body.position.y = 3.1; const pl = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, .35, 14), wm); pl.position.y = 6.3; tw.add(body, pl); for (const m of [body, pl]) { m.castShadow = m.receiveShadow = true; } tw.position.set(0, 0, -78); world.add(tw); G.colC.push({ x: 0, z: -78, r: 3.1 });
  const door = doorAt(0, -74.7, 0, 520);
  const top = post([['archer', -1.6, -77], ['archer', 1.6, -77], ['archer', 0, -79.4]], { y: 6.5, label: 'v3c_tow', wake: 26 });
  const gA = post([['askar', -2, -42, 's'], ['askar', 2, -43, 's'], ['heavy', 0, -47], ['wolf', -6, -45, 'p', 2], ['archer', 7, -50]], { fire: [0, -44] });
  const gB = post([['askar', -4, -68], ['askar', 4, -68], ['heavy', 0, -70], ['shaman', -6, -72]], { label: 'mb_cap', wake: 12 }); leader(gB, 3, -71);
  const sh = people([['asir', -1.2, -73], ['elder', 0, -72.5], ['asir', 1.2, -73], ['child', 0, -73.6]], { kind: 'cage', T: 120, near: 40, label: 'r_tower', exit: { x: -G.W - 4, z: -90 } }); cageAt(0, -73.1); sh.guards = [...top.es, ...gB.es]; sh.door = door;
  chest(-9.5, -60, 100); setMusic('calm'); await ban(3); mstart(); await say([['sa', 'v3d_53']]);
  obj(t('v3o_5_3')); setMusic('battle'); const g0 = gate(-96); await clear(gA); H.hint('', 6, t('v3h_tow'));
  G.mis.aim = () => door.dead ? near([...top.es, ...gB.es]) : { x: 0, z: -73 };
  await until(() => door.dead || G.mis.force); if (!door.dead) door.shatter(); for (const e of top.es) if (!e.dead) { e.y = 0; e.z = -73; e.x += (Math.random() - .5) * 3; burst(e.x, 3, e.z, 0x9a8a70, 2); } bark('sa', 'v3b_tow');
  await until(() => enemies().length === 0 || G.mis.force); G.mis.aim = null; g0.open(); setMusic('off'); await wait(1); await H.victory(); return win(); };
// ---------- CHAPTER 6 ----------
// 6-1 Narrow streets: townsfolk locked in burning houses, one after another; attacks from every side street
RUN['6-1'] = async () => { G.mis.onLive = () => { G.mis.safe = { x: 0, z: 0 };
    [[-9.3, -30, 55], [9.3, -54, 65], [-9.3, -78, 70], [9.3, -100, 80]].forEach(([x, z, T0]) => { const d = doorAt(x - Math.sign(x) * .6, z, Math.PI / 2, 260); fire(x + Math.sign(x) * .6, z - 1.6, .9);
      people([['mother', x + Math.sign(x) * 1.2, z - .8], ['child', x + Math.sign(x) * 1.4, z + .6], ['asir', x + Math.sign(x) * 1.1, z + 1.6]], { kind: 'fire', T: T0, door: d, near: 22, label: 'r_house', face: -Math.sign(x) * Math.PI / 2 }); }); };
  return OLD['6-1'](); };
// 6-2 Gate siege under arrow and fire rain (the old gate mission), people locked in the burning quarter behind it
RUN['6-2'] = async () => { G.mis.onLive = () => { G.mis.safe = { x: 0, z: -104 }; G.mis.hazard = rain(3.6, 'fire');
    people([['mother', 4, -128], ['child', 5, -129], ['asir', 3, -129.5], ['elder', 6, -128.5]], { kind: 'fire', T: 150, guardR: 16, near: 34, label: 'r_house' }); };
  const r = await OLD['6-3'](); G.mis.hazard = null; return r; };
// 6-3 Cages: the chain champion guards the cages; open them before the captives are carried off
RUN['6-3'] = async () => { const { DAY } = H.moods;
  const p = await gu(6, DAY, H.B[6], ['sarbinaz', 'jallod'], -60, 5, 4, SAR6); G.mis.safe = { x: 0, z: -62 };
  const C = [[-7, -84, 70], [7, -98, 85], [-6, -112, 100]].map(([x, z, T0]) => { cageAt(x, z); const g = post([['askar', x + (x > 0 ? -3 : 3), z + 1.5], ['archer', x + (x > 0 ? -1 : 1), z - 3], ['wolf', x + (x > 0 ? -4 : 4), z - 1, 'p', 1.5]], { label: 'r_cage', wake: 11 });
    return people([['asir', x - .6, z], ['mother', x + .6, z + .4], ['child', x, z - .6]], { kind: 'cage', T: T0, guards: g, near: 32, raid: 0, label: 'r_cage', exit: { x: x > 0 ? G.W + 4 : -G.W - 4, z: z - 12 } }); });
  const b = preBoss('jallod', 0, -100, 'v3c_chain'); b.maxHp = b.hp = 3200; b.vs *= .82; b.o.scale.setScalar(b.vs); b.d = { ...b.d, name: 'v3c_chain' }; chest(9.4, -124, 110);
  setMusic('calm'); await ban(3); mstart(); await say([['sa', 'v3d_63']]); obj(t('v3o_6_3')); setMusic('battle'); const g0 = gate(-124);
  await until(() => p.z < -88 || b.hp < b.maxHp || G.mis.force); b.asleep = false; b.custom = H.bossBrain({ dmg: 36, every: 2.8, moves: ['charge', 'quake', 'charge'], col: 0xaa3322 }); G.mis.preBoss = null; setBoss(b); setMusic('boss'); Sfx.horn(); bark('sa', 'v3b_chain');
  G.mis.aim = () => near([b, ...C.flatMap(g => g.guards)]); await until(() => (b.dead && enemies().length === 0) || G.mis.force); if (!b.dead) b.die(); setBoss(null); G.mis.aim = null;
  g0.open(); setMusic('off'); await wait(1); await H.victory(); return win(); };
// ---------- CHAPTER 7 ----------
// 7-2 Circle of shamans: captives are bound at the totems for the sacrifice — break the totems in time
RUN['7-2'] = async () => { G.mis.onLive = () => { G.mis.safe = { x: 0, z: 0 };
    [[-7, -40, 60], [7, -58, 75], [-7, -80, 90], [7, -98, 105]].forEach(([x, z, T0]) => { const s = x > 0 ? -1 : 1; people([['asir', x + s * 1.6, z + 2.6], ['mother', x + s * 2.6, z + 1.8]], { kind: 'altar', T: T0, guardR: 7, near: 26, label: 'r_altar' }); }); };
  return OLD['7-3'](); };
// 7-3 Surtaysha's three wolf-champions: arena duels in a row (each holds captives his pack will drag away)
RUN['7-3'] = async () => { const { NIGHT } = H.moods;
  const p = await gu(7, NIGHT, H.B[7], ['sarbinaz', 'otbasqan'], 3, 6, 3, { ...ALL7, tod: 'night' }); G.mis.safe = { x: 0, z: 2 };
  chest(9.5, -48, 120); const AR = {};
  for (const [k, z, cz] of [['w1', -32, -43], ['w2', -64, -75], ['w3', -96, -107]]) { AR[k] = arenaOf(k, 0, z, { crowd: [['wolf', 5], ['askar', 3]] }); cageAt(0, cz); people([['asir', -.6, cz], ['mother', .6, cz + .5], ['child', 0, cz - .6]], { kind: 'cage', T: 75, near: 15, guards: [AR[k].foe], label: 'r_cage', exit: { x: 0, z: cz - 30 } }); }
  setMusic('calm'); await ban(3); mstart(); await say([['sa', 'v3d_73'], ['gu', 'v3d_73b']]);
  for (const [k, z, cz] of [['w1', -32, -43], ['w2', -64, -75], ['w3', -96, -107]]) {
    obj(t('v3o_7_3')); const mk = marker(0, z + 6); G.mis.aim = () => ({ x: 0, z: z + 6 }); await H.reach(0, z + 6, 4.5); mk.remove(); G.mis.aim = null;
    const r = await champ(k, 0, z, { arena: AR[k], after: k === 'w3' ? 'fight' : 'flee', intro: [['gu', 'v3d_' + k]] }); if (r.es && r.es.length) { setMusic('battle'); obj(t('v3o_7_3')); await dead(r.es); } p.hp = Math.min(p.maxHp, p.hp + p.maxHp * .35); }
  setMusic('off'); await H.victory(); return win(); };
// ======================================================================
// WAVE4 CAMPS: 2–4 enemy camps per chapter on the road to the chapter boss (yurt camp / watchtower / river ford), 60–150 soldiers each,
// shown on the world map in advance (js/wave4.js draws them). Clearing them unlocks the boss (missions unlock in list order).
// In the level: three posted groups and the captain stand in the camp from the start (fly-over shows them); the rest come out of the
// tents / tower gate in waves while fewer than 14 are up. One body stands for 3 soldiers; the engine's 40-active cap is never reached.
// ======================================================================
import { yurt as w4Yurt, wall as w4Wall, banner as w4Banner, water as w4Water, crate as w4Crate, house as w4House, ground as w4Ground, shoot as w4Shoot } from './engine.js?v=1795218616';
const W4CAMPS = { 1: [['yurt', 60], ['tower', 80]], 2: [['yurt', 80], ['tower', 90]], 3: [['ford', 90], ['yurt', 100]], 4: [['tower', 100], ['ford', 110], ['yurt', 110]], 5: [['yurt', 110], ['tower', 120], ['ford', 120]], 6: [['tower', 130], ['yurt', 130], ['ford', 140]], 7: [['yurt', 140], ['tower', 150], ['yurt', 150]] };
for (const c of Object.keys(W4CAMPS)) { const cc = +c, bi = MLIST.findIndex(m => m.c === cc && m.boss); if (bi < 0) continue;
  W4CAMPS[c].forEach(([k, n], i) => MLIST.splice(bi + i, 0, { id: cc + '-C' + (i + 1), c: cc, ty: 'camp', n: 'w4_n_' + k, o: 'w4o_camp', s: ['win', 'most', 'all'], camp: { k, n } })); }
TYICON.camp = '⛺';
const W4MOOD = { 1: 'DAY', 2: 'HOT', 3: 'DAY', 4: 'DAY', 5: 'DUSK', 6: 'DAY', 7: 'DUSK' };
// models agent's camp / ford sets (js/models_ext.js, window.__MXB.put); every call is optional — without the module the old props stay
const w4mx = (name, x, z, ry = 0, ...a) => { try { const B = window.__MXB; if (!B) return null; return B.put(world, name, x, z, ry, ...a) || true; } catch (e) { return null; } };
function w4Scene(k, c, CZ) {
  const W = G.W;
  if (k === 'yurt') { for (const [x, z] of [[-12.6, CZ + 3], [12.8, CZ - 1], [-8.6, CZ - 12],   /* QA: the two front yurts stand outside the lane now — a roof next to the camera covered the lower-right play area */ [8.8, CZ - 14], [-8.8, CZ - 25], [9, CZ - 26]]) w4Yurt(x, z, false, true);
    for (const s of [-1, 1]) { if (!w4mx('tug', s * 4.6, CZ + 7)) { try { w4Banner(s * 4.6, CZ + 7, 0x1a1a1a); } catch (e) { } } w4mx('mantlet', s * 2.6, CZ + 8.2, 0); } decor('R_arava', -9.4, CZ - 5, .6); w4Crate(5.5, CZ + 5); w4Crate(-5, CZ - 15);
    if (w4mx('tent', -6.4, CZ - 19, .3)) G.colC.push({ x: -6.4, z: CZ - 19, r: 1.6 }); if (w4mx('tent', 6.6, CZ - 20, -.3)) G.colC.push({ x: 6.6, z: CZ - 20, r: 1.6 }); w4mx('weaponRack', 6.2, CZ - 7, -1.2); w4mx('weaponRack', -6.4, CZ + 1, 1.2); w4mx('arrowBasket', 5.2, CZ - 9.5, 0); w4mx('campfire', 0, CZ - 4, 0); }
  else if (k === 'tower') { w4Wall(-W - 3, -3.4, CZ + 6, 2.4, .8); w4Wall(3.4, W + 3, CZ + 6, 2.4, .8); for (const s of [-1, 1]) { try { w4Banner(s * 3.9, CZ + 6.4, 0x1a1a1a); } catch (e) { } }
    for (const [x, z, r] of [[-6.5, CZ - 8, .3], [6.5, CZ - 9, -.3]]) { if (w4mx('watchtower', x, z, r)) G.colC.push({ x, z, r: 1.8 }); else { try { decor('B_tower', x, z, r); } catch (e) { } } } w4mx('tug', 0, CZ - 16, 0); w4mx('weaponRack', -5, CZ - 14, 1.2); w4mx('mantlet', -2.4, CZ + 3.4, 0); w4mx('mantlet', 2.4, CZ + 3.4, 0); w4mx('arrowBasket', 4, CZ - 11, 0); w4Yurt(-8.8, CZ - 19, false, true); w4Yurt(8.8, CZ - 20, false, true); w4Crate(4.5, CZ + 2); }
  else { try { w4Water(0, CZ + 9, 2 * W + 18, 7.5); } catch (e) { } for (const [x, z, s] of [[-8.5, CZ + 5, 1.4], [8, CZ + 4.6, 1.2], [-5, CZ + 13.4, 1], [6.5, CZ + 13.2, 1.3]]) { try { place(world, 'boulder_01', x, z, s); } catch (e) { } }
    w4Yurt(-8.6, CZ - 8, false, true); w4Yurt(8.8, CZ - 13, false, true); w4Yurt(-8.8, CZ - 22, false, true); decor('R_arava', 9.4, CZ - 2, 2.4);
    w4mx('fordStones', 0, CZ + 9, 0, 9); w4mx('fordStakes', -3.6, CZ + 9, Math.PI / 2, 8); w4mx('reeds', -9.5, CZ + 11.5, 0, 7); w4mx('reeds', 9.8, CZ + 6.6, 0, 6); w4mx('boat', 9.2, CZ + 10.5, .5); w4mx('tug', -4.5, CZ - 3, 0); w4mx('weaponRack', 5, CZ - 9, -1.2); w4mx('campfire', 0, CZ - 12, 0); }
}
async function campRun(m) { const c = m.c, k = m.camp.k, N = m.camp.n, CZ = -62, REP = 2, B = Math.ceil(N / REP);   // QA pass 2: one body = 2 soldiers (60 soldiers were gone in a minute), three real waves with a pause
  const mood = H.moods[W4MOOD[c]] || H.moods.DAY, build = c === 1 ? H.buildMission : H.B[c];
  const p = await gu(c, mood, () => { build(); w4Scene(k, c, CZ); }, [], 3, c - 1, 5); G.curCh = c - 1; if (m.keep) { try { window.__W4.RUN.m = null; } catch (e) { } }   /* 7-1: our host joins now, on foot (it was skipped while she was mounted) */
  const pool = w4Pool(c), pick = i => { const q = pool[i % pool.length]; return q === 'manj' ? 'askar' : q; };
  const L1 = [], L2 = [], L3 = [];
  for (let i = 0; i < 6; i++) L1.push([pick(i), (i % 3 - 1) * 2.6 + (i > 2 ? 1.3 : 0), CZ + 3.5 - (i > 2 ? 2 : 0), i % 2 ? 'p' : 'g', 1.6]);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; L2.push([pick(i + 1), Math.cos(a) * 2.3, CZ - 4 + Math.sin(a) * 2.3, 's']); }
  for (let i = 0; i < 4; i++) L3.push([pick(i + 2), (i - 1.5) * 2.2, CZ - 13.5]);
  const gA = post(L1, { label: 'e_horde', wake: 12, noExtra: true }), gB = post(L2, { fire: [0, CZ - 4], wake: 12, noExtra: true }), gC = post(L3, { wake: 11, noExtra: true });   // the camp is sized by its own soldier count: no balance extras (they were never counted and put catapults into the fire circle)
  const capt = leader(gC, 0, CZ - 11, 'mb_cap'); capt.maxHp = capt.hp = Math.round(capt.maxHp * (1.2 + .1 * c));
  if (c >= 4) for (const e of gA.es.slice(0, 2)) if (window.__W4) window.__W4.cavalry(e);
  if (c >= 5 && window.__W4) for (const x of [-5.5, 5.5].slice(0, c >= 6 ? 2 : 1)) { const cat = window.__W4.catapult(x, CZ - 17); cat.grp = gC; cat.next = cat.custom; cat.custom = sleepAI; cat.pose = 'g'; cat.hx = cat.x; cat.hz0 = cat.z; cat.seed = 1; cat.rot = cat.rot0 = 0; cat.farT = -1e9; gC.es.push(cat); }
  const cbuff = e => { if (e.w4cat || e === capt) return; e.maxHp = Math.round(e.maxHp * 1.35); e.hp = e.maxHp; e.dmgMul = (e.dmgMul || 1) * 1.2; };   /* sim: 1-C1 at the cap took 2.0 min with 68 % HP left -> tougher camp soldiers */
  const all = [...gA.es, ...gB.es, ...gC.es]; all.forEach(cbuff); let reserve = Math.max(0, B - all.length), waveT = 0, told = false, wave = 1, pause = 0; const R0 = reserve, R3 = Math.floor(R0 / 2), wv = () => Math.min(3, Math.ceil(wave)); let wLast = 1;
  const full = ['askar', 'qalqan', 'archer', 'qilich', 'nayza'], wpool = w => { const q = pool.filter(x => x !== 'manj' && x !== 'cav'); for (const x of full.slice(0, Math.min(full.length, c + w))) if (!q.includes(x)) q.push(x); return q; }, upN = () => all.filter(e => !e.dead && e !== capt && !e.w4cat).length;
  const exits = k === 'tower' ? [[-2, CZ - 23], [2, CZ - 23], [0, CZ - 25]] : k === 'ford' ? [[-3.5, CZ - 24], [3.5, CZ - 24], [0, CZ - 26]] : [[-3, CZ - 26], [3, CZ - 27], [0, CZ - 28]];
  live(); setMusic('calm'); if (!m.keep) await ban(3); mstart(); H.objective('w4o_camp'); G.mis.camp = { N, B };
  const left = () => Math.round((all.filter(e => !e.dead).length + reserve) * N / B);
  G.mis.aim = () => { const a = aimOf(all)(); return a; }; G.mis.need = all;
  let lp = ''; G.tick = dt => { const awake = [gA, gB, gC].some(g => g.awake);
    // wave 1 = the posted camp; when it is nearly beaten: 5 s pause, horn, wave 2 (first half of the reserve, in batches of <= 5 while fewer than 12 are up); the same again for wave 3 with the next unit types
    if (awake && reserve > 0) { const up = upN(), left = wave === 2 ? reserve - R3 : wave === 3 ? reserve : 0;
      if (wave === 1 && up <= 3) { wave = 1.5; pause = 5; hintRaw('⛺ ' + t('w4_camp_out')); }
      else if (wave === 2 && left <= 0 && up <= 3) { wave = 2.5; pause = 5; }
      else if (wave === 1.5 || wave === 2.5) { pause -= dt; if (pause <= 0) { wave += .5; waveT = 0; } }
      else if (left > 0) { waveT -= dt; if (up < 12 && waveT <= 0) { waveT = 5; const n = Math.min(5, left), wp = wpool(wave); reserve -= n;
          for (let i = 0; i < n; i++) { const [x, z] = exits[i % exits.length]; const e = sp(TY(wp[(i + reserve) % wp.length]), x + rnd(-1, 1), z + rnd(-1, 1)); e.state = 'chase'; e.farT = 0; e.rot = 0; cbuff(e); all.push(e); } try { Sfx.horn(); } catch (er) { } } } }
    const wn = wv(); if (wn !== wLast) { wLast = wn; hintRaw('⛺ ' + t('w4_wave', { n: wn, m: 3 })); try { Sfx.stinger && Sfx.stinger('wave'); } catch (er) { } } const s = '⛺ ' + t('w4_wave', { n: wn, m: 3 }) + ' · ' + t('w4_hud_camp', { n: left(), m: N }) + (capt.dead ? '' : '   🎯 ' + t('mb_cap')); if (s !== lp) { lp = s; $('obj').textContent = s; } };
  await until(() => (reserve <= 0 && all.every(e => e.dead)) || G.mis.force); if (G.mis.force) for (const e of all) if (!e.dead) e.die();
  G.tick = null; G.mis.aim = null; G.mis.need = null; setMusic('off'); addGold(60 + 30 * c, G.player.x, G.player.z); if (m.keep) m.keep(); await H.bannerShow('', '⛺ ' + t('w4_camp_win'), '', 1.8); await H.victory(); return win(); }
for (const m of MLIST) if (m.camp) RUN[m.id] = () => campRun(m);

// ======================================================================
// WAVE4 SHOWCASE SIEGE — "Qashal qamalı" (6-Q, after 6-1). Our two catapult carts bombard the city wall; three waves:
// 1) the sortie in front of the wall, 2) a flank attack from the steppe + the archers on the wall (shot down with ⚔ = bow volley),
// then the catapults breach the gate, 3) the garrison behind the gate and two points held by captains; the lord of the fortress fights alone at the end.
// ======================================================================
{ const i61 = MLIST.findIndex(m => m.id === '6-1'); if (i61 >= 0) MLIST.splice(i61 + 1, 0, { id: '6-Q', c: 6, ty: 'siege', n: 'w4_n_siege', o: 'w4o_siege', s: ['win', 'most', 'all'], siege: 1 }); }
TYICON.siege = '🏰';
T.w4wa = { ...T.archer, like: T.archer.like || 'archer', mdl: T.archer.mdl || 'archer' };   // archer on the wall: own type = no kit moves, never walks
const SGZ = -64;
function siegeBuild() { const WZ = SGZ; w4Ground(14, -170, 'ground1'); w4Wall(-30, 30, 13, 3, 1.6); w4Wall(-30, -3.5, WZ, 3.2, 1.6); w4Wall(3.5, 30, WZ, 3.2, 1.6);   /* 4.8 m: a taller wall hid the whole fight from the camera at its foot */
  for (const s of [-1, 1]) { try { w4Banner(s * 5, WZ + 1.6, 0x1a1a1a); } catch (e) { } w4House(s * 17, WZ - 22, 7, 8, 4); w4House(s * 17.5, WZ - 44, 7, 7, 4); w4House(s * 17, WZ - 62, 7, 8, 4); }
  w4Yurt(-15, -4, false, true); w4Yurt(15.5, -8, false, true); for (const s of [-1, 1]) { try { w4Banner(s * 9.6, -14, 0x2f6fd0); } catch (e) { } }
  w4Wall(-30, 30, -158, 6, 1.6); }
function wallArcher(x, z, y) { const e = sp('w4wa', x, z); e.spawnT = 0; e.o.scale.setScalar(e.vs || e.d.scale || 1); e.y = y; e.px = x; e.pz = z; e.cdw = rnd(2.5, 5); e.farT = -1e9; e.speed = 0; e.rot = 0; e.w4wall = 1;
  e.custom = (e, dt) => { e.x = e.px; e.z = e.pz; e.y = y; e.kx = e.kz = 0; const P = G.player; if (!P || P.dead || G.flying || !G.mis.started) { e.play('Idle'); return true; }
    const d = hyp(P.x - e.x, P.z - e.z); if (d > 34 || P.z < e.z - 2) { e.play('Idle'); return true; } e.rot = Math.atan2(P.x - e.x, P.z - e.z); e.cdw -= dt;
    if (e.cdw <= 0) { e.cdw = rnd(3.4, 4.8); e.play('1H_Ranged_Shoot', { once: true, force: true }); w4Shoot(e, { x: P.x + rnd(-1.3, 1.3), z: P.z + rnd(-1.3, 1.3) }, rnd(e.d.dmg[0], e.d.dmg[1]) * (e.dmgMul || 1)); e.shT = .7; }
    else if ((e.shT = (e.shT || 0) - dt) <= 0) e.play('Idle_Combat'); return true; }; return e; }
async function siegeRun(m) { const c = 6, WZ = SGZ, W4 = window.__W4;
  const p = await gu(c, H.moods.DAY, siegeBuild, [], 3, c - 1, 5); G.curCh = c - 1;
  const gt = H.gateDoor(0, WZ); flyPt(0, WZ, 'e_gate');
  const cats = W4 && W4.catProp ? [W4.catProp(-7.6, -20), W4.catProp(7.6, -23)] : [];
  const wa = [-9.6, -6.3, 6.3, 9.6].map(x => wallArcher(x, WZ, 4.8));
  const pool = w4Pool(c).filter(q => q !== 'manj' && q !== 'cav'), pick = i => pool[i % pool.length];
  const L1 = []; for (let i = 0; i < 8; i++) L1.push([pick(i), (i % 4 - 1.5) * 2.5, WZ + 9 + (i > 3 ? 2.6 : 0), i % 2 ? 'p' : 'g', 1.4]);
  const g1 = post(L1, { label: 'e_horde', wake: 15, noExtra: true });
  const L3 = []; for (let i = 0; i < 6; i++) L3.push([pick(i + 1), (i % 3 - 1) * 2.4, WZ - 7 - (i > 2 ? 2.4 : 0)]);
  const g3 = post(L3, { wake: 0, noExtra: true, nofly: true, noPass: true });
  const pts = [[-5.5, WZ - 26], [5.5, WZ - 48]].map(([x, z], i) => { const L = []; for (let k = 0; k < 5; k++) { const a = k / 5 * 6.283 + .4; L.push([pick(k + i), x + Math.cos(a) * 2.8, z + Math.sin(a) * 2.8]); }
    const g = post(L, { label: 'mb_cap', wake: 11, noExtra: true }); const cap = leader(g, x, z, 'mb_cap'); const mk = marker(x, z, 0xff4030, 3.4); try { w4Banner(x + (i ? 2.6 : -2.6), z - 2.4, 0x1a1a1a); } catch (e) { } return { g, cap, mk, x, z, done: false }; });
  const BO = { x: 0, z: WZ - 74, R: 8, type: TY('heavy'), hp: 4200, dmg: 1.45, scale: 1.22, name: 'w4_qbek', title: 'w4_qbek_t', crowd: [['askar', 4], ['archer', 2]], after: 'flee' }; BO.arena = arena(BO);
  live(); setMusic('battle'); await ban(3); mstart(); H.objective('w4o_siege'); hintRaw('🏰 ' + t('w4_sg_cat'));
  let ph = 1, lobT = 1.5, side = 0, lp = '', w2 = [], ptsN = 0; const up = L => L.filter(e => !e.dead), hud = s => { if (s !== lp) { lp = s; $('obj').textContent = s; } };
  const lobAt = (x, z, o) => { const cg = cats[side++ % Math.max(1, cats.length)]; if (!cg || !W4) { if (o.cb) o.cb(); return; } cg.fire(); W4.lob(cg.x, cg.z, x, z, o); };
  G.mis.aim = () => ph === 1 ? near(up(g1.es)) : ph === 2 ? (near(up(w2)) || near(up(wa)) || { x: 0, z: WZ + 12 }) : ph === 3 ? { x: 0, z: WZ + 9 } : ph === 4 ? (near(up(g3.es)) || near(pts.filter(q => !q.done).map(q => q.cap)) || null) : null;
  G.tick = dt => { lobT -= dt;
    if (lobT <= 0 && ph <= 3) { if (ph === 3) { lobT = 2.4; lobAt(rnd(-1.2, 1.2), WZ + .9, { team: 'ally', R: 2.6, dmg: 60, cb: () => { if (!gt.dead) { gt.hit('slam'); gt.hit('slam'); G.shake = Math.max(G.shake || 0, .3); } } }); }
      else { lobT = rnd(3, 4.2); const x = rnd(-10.5, 10.5); lobAt(x, WZ + rnd(-.2, .4), { team: 'ally', R: 2.3, dmg: 40, tele: false, y1: 4.2, cb: () => { burst(x, 4.6, WZ + .6, 0x9a8a70, 2.2, true); } }); } }
    const w = '🏰 ' + t('w4_wave', { n: Math.min(3, ph === 4 ? 3 : ph === 3 ? 2 : ph), m: 3 }) + ' — ';
    hud(ph === 1 ? w + t('w4_sg_left', { n: up(g1.es).length * 3 }) : ph === 2 ? w + t('w4_sg_hud1', { n: up(wa).length }) + ' · ' + t('w4_sg_left', { n: up(w2).length * 3 }) : ph === 3 ? w + t('w4_sg_gate') : ph === 4 ? w + t('w4_sg_pts', { n: ptsN, m: pts.length }) : lp);
    if (ph === 4) for (const q of pts) if (!q.done && q.cap.dead) { q.done = true; ptsN++; try { q.mk.remove(); marker(q.x, q.z, 0x40c060, 3.4); } catch (e) { } hintRaw('🚩 ' + t('w4_sg_pt', { n: ptsN, m: pts.length })); H.setCP(q.x, q.z + 4); try { Sfx.pick(); } catch (e) { } } };
  const F = () => G.mis.force;
  // wave 1: the sortie in front of the wall
  await until(() => !up(g1.es).length || F()); if (F()) for (const e of g1.es) if (!e.dead) e.die(); cp();
  // wave 2: flank attack from the steppe behind us + the archers on the wall
  ph = 2; try { Sfx.stinger && Sfx.stinger('wave'); } catch (er) { } await H.bannerShow('', '🏰 ' + t('w4_wave', { n: 2, m: 3 }), t('w4_sg_arch'), 2.2); hintRaw('🏹 ' + t('w4_sg_arch'));
  { const L = []; for (let i = 0; i < 8; i++) L.push([pick(i + 2), (i % 2 ? 1 : -1) * (5 + (i >> 1) * 1.5), Math.min(9, G.player.z + 20 + (i >> 1) * 1.6)]); w2 = rein(L, 'sa', null); for (const e of w2) { e.state = 'chase'; e.farT = 0; } }
  await until(() => (!up(w2).length && !up(wa).length) || F()); if (F()) for (const e of [...w2, ...wa]) if (!e.dead) e.die(); cp();
  // the catapults breach the gate
  ph = 3; lobT = .6; hintRaw('🏰 ' + t('w4_sg_gate')); await until(() => gt.dead || F()); if (!gt.dead) gt.shatter(); Sfx.big(); flash(.3);
  await H.bannerShow('', '🏰 ' + t('w4_sg_breach'), t('w4_wave', { n: 3, m: 3 }), 2); H.setCP(0, WZ + 6);
  // wave 3: the garrison behind the gate, then the two points
  ph = 4; try { Sfx.stinger && Sfx.stinger('wave'); } catch (er) { } g3.wakeR = 16; wake(g3); for (const q of pts) q.g.wakeR = 12;
  await until(() => (pts.every(q => q.done) && !up(g3.es).length && pts.every(q => !up(q.g.es).length)) || F()); if (F()) for (const g of [g3, ...pts.map(q => q.g)]) for (const e of g.es) if (!e.dead) e.die();
  ph = 5; G.tick = null; G.mis.aim = null; cp();
  // the lord of the fortress, one on one
  await duel(BO);
  setMusic('off'); addGold(240, G.player.x, G.player.z); await H.bannerShow('', '🏰 ' + t('w4_sg_win'), '', 2); await H.victory(); return win(); }
RUN['6-Q'] = () => siegeRun(MLIST.find(m => m.id === '6-Q'));
// missions audit: the chapter-3 intro (lore3 + c3 + nar7) played in 3-2 — it belongs to the chapter's first mission 3-1
{ const r31 = RUN['3-1'], r32 = RUN['3-2'];
  RUN['3-1'] = async () => { await H.chapterIntro(3, 'nar7', 'ruins'); return r31(); };
  RUN['3-2'] = async () => { const ci = H.chapterIntro; H.chapterIntro = async () => { H.chapterIntro = ci; await H.fadeTo(true); }; try { return await r32(); } finally { H.chapterIntro = ci; } }; }

// 4-2 (missions audit): the plank square becomes a docked war boat — bulwarks with shields, pointed bow, mast and sail, gangplank, sea around it
function w4Boat(x, z) { const g = new THREE.Group(), wd = new THREE.MeshStandardMaterial({ color: 0x4a3018, roughness: .9 }), dk2 = new THREE.MeshStandardMaterial({ color: 0x33200f, roughness: 1 });
  const box = (w, h, d, px, py, pz, ry = 0, m = wd) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(px, py, pz); b.rotation.y = ry; b.castShadow = b.receiveShadow = true; g.add(b); return b; };
  for (const s of [-1, 1]) { box(.35, 1.1, 16.4, s * 8.1, .6, 0); box(.5, .22, 16.6, s * 8.1, 1.2, 0, 0, dk2); box(.35, 1.3, 10.4, s * 4, .7, -11.3, s * .881); box(5.4, 1.1, .35, s * 5.4, .6, 8.1);
    for (let k = -3; k <= 3; k++) { const sh = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, .12, 12), new THREE.MeshStandardMaterial({ color: k % 2 ? 0x8a1c14 : 0xc8a040, roughness: .7 })); sh.rotation.z = Math.PI / 2; sh.position.set(s * 8.34, .75, k * 2.2); g.add(sh); } }
  box(2.6, .14, 4.6, 0, .14, 10.2, 0, new THREE.MeshStandardMaterial({ color: 0x6a4a28, roughness: .9 })); box(.4, 2.8, .4, 0, 1.6, -14.5);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(.2, .26, 10.5, 8), wd); mast.position.set(0, 5.25, -8.6); mast.castShadow = true; g.add(mast); box(7.6, .18, .18, 0, 9.2, -8.6);
  const sail = new THREE.Mesh(new THREE.PlaneGeometry(7, 5.2), new THREE.MeshStandardMaterial({ color: 0xd8c8a0, roughness: 1, side: THREE.DoubleSide })); sail.position.set(0, 6.5, -8.55); sail.castShadow = true; g.add(sail);
  g.position.set(x, 0, z); world.add(g); G.colC.push({ x, z: z - 8.6, r: .5 });
  { const M = G.mis, iv = setInterval(() => { try { if (G.mis !== M) { clearInterval(iv); Sfx.surface && Sfx.surface(null); return; } const P = G.player; Sfx.surface && Sfx.surface(P && Math.abs(P.x - x) < 8.2 && Math.abs(P.z - z) < 8.2 ? 'wood' : null); } catch (e) { } }, 400); }   /* audio: wooden steps on the deck */
  try { w4Water(x, z - 27, 90, 30); for (const s of [-1, 1]) w4Water(x + s * 25, z - 2, 30, 22); } catch (e) { } }
// STORY (author): "Endi Gúlayım bolıp oynaysız" belongs to the start of chapter 1 (after the messenger's tale), not to the end of the tutorial
{ const r11 = RUN['1-1']; RUN['1-1'] = async () => { const M = G.mis, iv = setInterval(() => { try { if (G.mis !== M) { clearInterval(iv); return; } if (M.started && !G.paused && !G.flying) { clearInterval(iv); setTimeout(() => { try { if (G.mis === M) hintRaw('⚔ ' + t('tu3_next')); } catch (e) { } }, 1500); } } catch (e) { clearInterval(iv); } }, 500); return r11(); }; }
// ---------- TUTORIAL 0-0 "Shınıǵıw maydanı" (training field, before the war) ----------
// Gúlayım trains the forty maidens on the river field by Miywali. One mechanic per step, advance only on success, coins + praise per step.
// Steps that need a combat feature (roll, block, parry, jump, lock-on, sniper bow) are feature-detected at run time (TU_FEAT) and skipped if missing.
// Owns: MLIST entry '0-0' (unshifted here), RUN['0-0'], window.__TUT (test/debug hook). Stars: win | flag (final duel without a hit) | flag2 (all optional challenges).
import { yurt as tuYurt, banner as tuBanner, ground as tuGround, wall as tuWall, water as tuWater, sparks as tuSparks, camOverride as tuCam } from './engine.js?v=1795218616';
import * as tuSCN from './scenery.js?v=1795218616';
import { runArchery as tuRunArch, LEVELS as tuArchLv } from './archery.js?v=1795218616';
MLIST.unshift({ id: '0-0', c: 0, ty: 'train', n: 'tu_n', o: 'tu3_o', s: ['win', 'flag', 'flag2'], fl: 'tu_s1', fl2: 'tu_s2' });
TYICON.train = '🎯';
const TUT = (() => {
  const rnd = (a, b) => a + Math.random() * (b - a), hyp = Math.hypot;
  let S = null;                       // per-run state
  const P = () => G.player;
  // ---------------- feature detection (combat moveset / archery from parallel work) ----------------
  const W = () => G.w3 || window.__COMBAT || null;                                // combat moveset API (engine.js "W3": G.w3 = { dodge, guard, jump, strong, lock })
  const ARCH = () => window.__ARCH || window.__ARCHERY || G.archery || null;      // optional public API of the bow sniper mode (js/archery.js)
  const btn = id => { const b = $(id); return b && b.isConnected ? b : null; };
  const firstBtn = (...ids) => { for (const id of ids) if (btn(id)) return id; return null; };
  const actK = () => { const p = P(); return (p && p.act && p.act.kind) || ''; };
  const w3 = k => { const w = W(); return !!(w && w[k]); };
  const TU_FEAT = {
    strong: { has: () => w3('strong') && !!btn('bS'), btn: () => firstBtn('bS') || 'bA' },
    roll: { has: () => w3('dodge'), btn: () => 'bD' },                                        // double tap ➤ (or R)
    block: { has: () => w3('guard') && !!btn('bB'), btn: () => firstBtn('bB') },
    parry: { has: () => w3('guard') && !!btn('bB'), btn: () => firstBtn('bB') },             // guard pressed < 0.3 s before the hit lands
    jump: { has: () => w3('jump') && !!btn('bJ'), btn: () => firstBtn('bJ') },
    lock: { has: () => w3('lock') && !!btn('bL'), btn: () => firstBtn('bL') },
    bow: { has: () => !!ARCH(), btn: () => firstBtn('bBow', 'bArc', 'b2') },
  };
  const blocking = () => { const p = P(); if (!p) return false; return !!(p.guard || p.blocking || /block|guard/.test(actK())); };
  const parried = () => +(G.stats && (G.stats.parry || G.stats.parries)) || 0;
  const lockTarget = () => { const p = P(); return p && (p.hl || p.hardLock || p.lockOn) || null; };
  const airborne = () => { const p = P(); return !!p && ((p.y || 0) > .35 || /jump|leap|air/.test(actK())); };

  // ---------------- small world helpers ----------------
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .9, ...o });
  const M_WOOD = mat(0x6b4524), M_WOOD2 = mat(0x8a5e34), M_STRAW = mat(0xd6b86a, { roughness: 1 }), M_SACK = mat(0xcbb48a, { roughness: 1 }), M_ROPE = mat(0x9a7a4a), M_IRON = mat(0x55524c, { metalness: .6, roughness: .45 }), M_RED = mat(0xb02a22), M_WHITE = mat(0xf2ead8), M_GOLD = new THREE.MeshStandardMaterial({ color: 0xffc94a, emissive: 0x6a4a08, metalness: .5, roughness: .35 });
  const mesh = (geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; return o; };
  const add = (g, o, rx = 0, rz = 0) => { o.rotation.x = rx; o.rotation.z = rz; g.add(o); return o; };
  function dummyMesh(shield) { const g = new THREE.Group();
    add(g, mesh(new THREE.CylinderGeometry(.09, .12, 2.3, 8), M_WOOD, 0, 1.15, 0));
    add(g, mesh(new THREE.CylinderGeometry(.34, .3, .95, 10), M_STRAW, 0, 1.25, 0));
    for (const y of [.92, 1.25, 1.58]) add(g, mesh(new THREE.TorusGeometry(.33, .025, 5, 14), M_ROPE, 0, y, 0), Math.PI / 2);
    add(g, mesh(new THREE.SphereGeometry(.24, 10, 8), M_SACK, 0, 1.98, 0));
    add(g, mesh(new THREE.CylinderGeometry(.05, .05, 1.5, 6), M_WOOD2, 0, 1.55, 0), 0, Math.PI / 2);
    for (const s of [-1, 1]) add(g, mesh(new THREE.SphereGeometry(.09, 6, 5), M_STRAW, s * .75, 1.55, 0));
    add(g, mesh(new THREE.CylinderGeometry(.45, .55, .14, 10), M_WOOD, 0, .07, 0));
    if (shield) { const sh = new THREE.Group(); add(sh, mesh(new THREE.CylinderGeometry(.62, .62, .08, 20), M_WOOD2)); add(sh, mesh(new THREE.TorusGeometry(.6, .05, 6, 22), M_IRON), Math.PI / 2);
      add(sh, mesh(new THREE.CylinderGeometry(.36, .36, .085, 16), M_RED)); add(sh, mesh(new THREE.SphereGeometry(.13, 8, 6), M_IRON, 0, .06, 0)); sh.rotation.x = Math.PI / 2; sh.position.set(0, 1.3, .42); g.add(sh); }
    return g; }
  function targetMesh(big) { const g = new THREE.Group(), R = big ? 1.0 : .72;
    const face = new THREE.Group(); [[R, M_STRAW], [R * .78, M_WHITE], [R * .56, M_RED], [R * .34, M_WHITE], [R * .14, M_GOLD]].forEach(([r, m], i) => add(face, mesh(new THREE.CylinderGeometry(r, r, .16 + i * .012, 22), m)));
    face.rotation.x = Math.PI / 2; face.position.y = 1.5; g.add(face);
    for (const s of [-1, 1]) add(g, mesh(new THREE.CylinderGeometry(.05, .06, 1.9, 6), M_WOOD, s * .45, .85, -.25), .15, s * .22);
    add(g, mesh(new THREE.CylinderGeometry(.05, .06, 1.7, 6), M_WOOD, 0, .8, -.6), -.45);
    return g; }
  function ringMesh() { const g = new THREE.Group(); const tor = new THREE.Mesh(new THREE.TorusGeometry(1.7, .13, 8, 32), new THREE.MeshBasicMaterial({ color: 0xffd060, transparent: true, opacity: .9 })); tor.position.y = 2.0; g.add(tor);
    const glow = new THREE.Mesh(new THREE.TorusGeometry(1.7, .34, 8, 32), new THREE.MeshBasicMaterial({ color: 0xffb030, transparent: true, opacity: .25, blending: THREE.AdditiveBlending, depthWrite: false })); glow.position.y = 2.0; g.add(glow); g.glow = glow; g.tor = tor;
    for (const s of [-1, 1]) add(g, mesh(new THREE.CylinderGeometry(.08, .1, 3.8, 6), M_WOOD, s * 1.85, 1.9, 0)); return g; }
  // a pinned prop that the game treats as an enemy (aim, lock, damage numbers, arrows) but never moves, never fights, never dies on its own
  function prop(x, z, visual, o = {}) { const e = spawn('askar', x, z, 'enemy', true); e.spawnT = 0; e.o.scale.setScalar(e.vs || e.d.scale || 1);
    e.o.traverse(m => { if (m.isMesh || m.isSkinnedMesh) m.visible = false; }); const k = 1 / (e.vs || e.d.scale || 1); visual.scale.setScalar(k); e.o.add(visual); e.vis = visual;
    e.d = { ...e.d, block: 0, armor: 0, poise: 0, name: o.name || e.d.name, ranged: false }; e.poiseMax = 0; e.maxHp = e.hp = 5000; e.showBar = () => { }; e.px = x; e.pz = z; e.prot = o.rot ?? 0; e.rot = e.prot; e.prop = true; e.r = o.r || .55;
    e.custom = () => true; e.farT = -1e9; const d0 = e.damage.bind(e);
    e.damage = (a, s, op = {}) => { if (e.dead) return 0; if (o.gate && !o.gate(s, op)) { tuSparks(e.x, 1.3, e.z, 0xdfe8ff, 10, 6); e.wob = .18; Sfx.hit(); if (G.time > (e.nT || 0)) { e.nT = G.time + 1.2; num(e, t(o.gateKey || 'noeffect'), 'n'); if (o.onGate) o.onGate(); } return 0; }
      const r = d0(a, s, op); e.hp = e.maxHp; if (r) { e.wob = .5; e.lastHit = G.time; if (o.onHit) o.onHit(s, op, a); } return r; };
    S.props.push(e); return e; }
  function breakProp(e) { if (!e || e.dead) return; const g = e.vis.clone(true); g.scale.setScalar(1); g.position.set(e.x, 0, e.z); g.rotation.y = e.rot; world.add(g); try { breakable({ mesh: g, x: e.x, z: e.z, hp: 1, chunks: 18, spark: 0xffd890, dust: 0xc8a070 }).shatter(); } catch (err) { console.warn(err); } e.dead = true; e.gone = true; try { e.remove(); } catch (err) { e.o.visible = false; } }
  function dropProp(e) { if (!e || e.dead) return; e.dead = true; e.gone = true; burst(e.x, 1, e.z, 0xc8a070, 2, true); try { e.remove(); } catch (err) { e.o.visible = false; } }
  function npc(type, x, z, rot = 0) { const e = spawn(type, x, z, 'npc', true); e.spawnT = 0; e.o.scale.setScalar(e.vs || e.d.scale || 1); e.rot = rot; e.seed = rnd(0, 9); S.npcs.push(e); return e; }
  // ---------------- speech bubbles over heads (non-blocking banter) ----------------
  function bubble(e, key, dur = 2.8, who) { if (!e || e.dead || !S) return; const el = document.createElement('div'); el.className = 'tubub'; const nm = who ? t('n_' + who) : ''; el.innerHTML = (nm ? '<b>' + nm + '</b>' : '') + t(key); ($('hud') || document.body).appendChild(el); const b = { e, el, until: G.time + dur }; for (const o of S.bubs) if (o.e === e) o.until = 0; S.bubs.push(b); return b; }
  const V3b = new THREE.Vector3();
  function bubTick() { const Wd = innerWidth, Hh = innerHeight; for (let i = S.bubs.length - 1; i >= 0; i--) { const b = S.bubs[i]; if (G.time > b.until || b.e.dead || b.e.gone) { b.el.remove(); S.bubs.splice(i, 1); continue; }
      V3b.set(b.e.x, (b.e.h || 2) + .55 + (b.e.mounted ? 1 : 0), b.e.z).project(camera); const on = V3b.z < 1 && Math.abs(V3b.x) < .8 && V3b.y < .5 && V3b.y > -.75 && !G.paused; b.el.style.display = on ? 'block' : 'none'; if (on) { b.el.style.left = Math.min(Wd - 120, Math.max(120, (V3b.x + 1) / 2 * Wd)) + 'px'; b.el.style.top = Math.max(118, (1 - V3b.y) / 2 * Hh) + 'px'; } } }
  // ---------------- HUD: step card, pulsing button + pointer, prize text, skip button ----------------
  const CSS = `.tubub{position:absolute;z-index:7;pointer-events:none;transform:translate(-50%,-100%);max-width:220px;padding:5px 9px;border-radius:10px;background:rgba(255,248,232,.94);color:#2a1a0c;font:600 12px/1.25 var(--fu,system-ui),sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.35);text-align:center}
.tubub b{display:block;font-size:10px;color:#9a5a10;letter-spacing:.04em;text-transform:uppercase}.tubub:after{content:'';position:absolute;left:50%;bottom:-6px;margin-left:-6px;border:6px solid transparent;border-top-color:rgba(255,248,232,.94);border-bottom:0}
#tuc{position:absolute;left:50%;bottom:62px;transform:translateX(-50%);z-index:7;pointer-events:none;display:none;align-items:center;gap:8px;max-width:56vw;padding:6px 14px 6px 7px;border-radius:18px;background:linear-gradient(180deg,rgba(28,20,40,.9),rgba(16,12,26,.9));border:1px solid rgba(255,206,110,.75);color:#fff3da;font:600 13px/1.25 var(--fu,system-ui),sans-serif;box-shadow:0 3px 14px rgba(0,0,0,.45)}
#tuc .n{flex:none;min-width:36px;height:22px;border-radius:11px;background:#e2a93a;color:#2a1606;font-weight:800;font-size:11px;display:flex;align-items:center;justify-content:center}#tuc .p{flex:none;color:#ffd77a;font-weight:800;margin-left:2px}
#tuc.ok{border-color:#7fe08a;animation:tuok .45s}@keyframes tuok{0%{transform:translateX(-50%) scale(1.14)}100%{transform:translateX(-50%) scale(1)}}
#tuptr{position:absolute;z-index:8;pointer-events:none;font-size:26px;display:none;filter:drop-shadow(0 2px 3px rgba(0,0,0,.6));animation:tuptr .8s ease-in-out infinite}@keyframes tuptr{0%,100%{margin-top:-6px}50%{margin-top:4px}}
#tuskip{position:absolute;left:50%;bottom:8px;transform:translateX(-50%);z-index:8;padding:5px 14px;border-radius:14px;border:1px solid rgba(255,220,150,.55);background:rgba(20,14,28,.62);color:#ffe7b8;font:700 12px var(--fu,system-ui),sans-serif;cursor:pointer;display:none}
#btns .ab.tuhide{display:none!important}
#tuc{bottom:46px!important;max-width:58vw!important;padding:9px 18px 9px 9px!important;font:800 17px/1.25 var(--fu,system-ui),sans-serif!important;border-width:2px!important}
#tuc .n{min-width:44px!important;height:28px!important;font-size:13px!important}#tuc .p{font-size:18px}
#tuptr{font-size:46px!important}#tuptr.drag{animation:tudrag 1.2s ease-in-out infinite!important}@keyframes tudrag{0%{transform:translate(0,0)}60%{transform:translate(0,-38px)}100%{transform:translate(0,0)}}
#btns .ab.tutor{box-shadow:0 0 0 4px #ffd060,0 0 26px 10px rgba(255,200,80,.85)!important;animation:tupulse .9s ease-in-out infinite!important}@keyframes tupulse{0%,100%{filter:brightness(1)}50%{filter:brightness(1.5)}}
#tuok{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%) scale(.3);z-index:9;pointer-events:none;font:900 120px/1 system-ui,sans-serif;color:#6fe07a;text-shadow:0 4px 18px rgba(0,0,0,.7),0 0 30px rgba(120,255,140,.6);opacity:0;transition:transform .35s cubic-bezier(.2,1.6,.4,1),opacity .3s}#tuok.on{opacity:1;transform:translate(-50%,-50%) scale(1)}
#tuprize{position:absolute;left:50%;bottom:96px;transform:translateX(-50%);z-index:7;pointer-events:none;color:#ffe08a;font:800 15px var(--fu,system-ui),sans-serif;text-shadow:0 2px 4px #000;opacity:0;white-space:nowrap}`;
  function hudOn() { if (!$('tucss')) { const s = document.createElement('style'); s.id = 'tucss'; s.textContent = CSS; document.head.appendChild(s); }
    const host = $('hud') || document.body; for (const [id, tag] of [['tuc', 'div'], ['tuptr', 'div'], ['tuprize', 'div'], ['tuskip', 'button'], ['tuok', 'div']]) { if (!$(id)) { const el = document.createElement(tag); el.id = id; host.appendChild(el); } }
    $('tuptr').textContent = '👇'; $('tuok').textContent = '✓'; $('tuskip').textContent = t('tu_skip'); $('tuskip').style.display = 'block'; $('tuskip').onpointerdown = e => { e.stopPropagation(); e.preventDefault(); skipAll(); }; }
  function card(txt, prog) { const c = $('tuc'); if (!c) return; if (!txt) { c.style.display = 'none'; return; } c.classList.remove('ok'); c.style.display = 'flex'; c.innerHTML = `<span class="n">${S.k}/${S.total}</span><span>${txt}</span>` + (prog ? `<span class="p">${prog}</span>` : ''); }
  function cardProg(prog) { const sp = $('tuc') && $('tuc').querySelector('.p'); if (sp) sp.textContent = prog; }
  function cardOk() { const c = $('tuc'); if (c) { c.classList.add('ok'); const sp = c.querySelector('.p'); if (sp) sp.textContent = '✓'; else c.insertAdjacentHTML('beforeend', '<span class="p">✓</span>'); } }
  function focus(ids) { document.querySelectorAll('.tutor').forEach(e => e.classList.remove('tutor')); S.focus = (ids || []).filter(Boolean); for (const id of S.focus) { reveal(id); const b = $(id); if (b) b.classList.add('tutor'); } }
  function ptrTick() { const el = $('tuptr'); if (!el) return; const id = S.focus && S.focus[0], b = id && $(id); if (!b || G.paused || S.over) { el.style.display = 'none'; return; } const r = b.getBoundingClientRect(); if (!r.width) { el.style.display = 'none'; return; } el.style.display = 'block'; const jy = id === 'jb' || id === 'joy'; el.classList.toggle('drag', jy); el.style.left = (r.left + r.width / 2 - 22) + 'px'; el.style.top = (jy ? r.top + r.height / 2 - 30 : r.top - 52) + 'px'; }
  function prize(txt) { const el = $('tuprize'); if (!el) return; el.textContent = txt; el.style.transition = 'none'; el.style.bottom = '84px'; el.style.opacity = 1; void el.offsetWidth; el.style.transition = 'opacity .5s ease .9s,bottom 1.4s'; el.style.bottom = '104px'; el.style.opacity = 0; }
  // action buttons appear one by one as they are taught (Shadow Fight style); everything is restored on cleanup
  const BTN_IDS = () => [...document.querySelectorAll('#btns .ab')].map(b => b.id).filter(Boolean);
  function reveal(...ids) { if (!S || !S.shown) return; for (const id of ids) if (id) { S.shown.add(id); const b = $(id); if (b) b.classList.remove('tuhide'); } }
  function btnTick() { if (!S.shown) return; for (const id of BTN_IDS()) { const b = $(id); if (b && !S.shown.has(id) && !b.classList.contains('tuhide')) b.classList.add('tuhide'); } }
  function restoreBtns() { for (const b of document.querySelectorAll('#btns .ab')) b.classList.remove('tuhide', 'tutor'); if (S) S.shown = null; try { refreshSkills(); } catch (e) { } }
  function bigOk() { const el = $('tuok'); if (!el) return; el.classList.add('on'); setTimeout(() => el.classList.remove('on'), 1000); }
  function hudOff() { for (const id of ['tuc', 'tuptr', 'tuprize', 'tuskip', 'tuok']) { const el = $(id); if (el) el.style.display = 'none'; } document.querySelectorAll('.tubub').forEach(e => e.remove()); document.querySelectorAll('.tutor').forEach(e => e.classList.remove('tutor')); }
  const joyId = () => (btn('jb') ? 'jb' : 'joy');
  // ---------------- level: ch3 river scenery (no war props) + training camp ----------------
  function rack(x, z, ry) { const g = new THREE.Group(); for (const s of [-1, 1]) add(g, mesh(new THREE.CylinderGeometry(.06, .07, 1.6, 6), M_WOOD, s * .9, .8, 0)); add(g, mesh(new THREE.CylinderGeometry(.05, .05, 2, 6), M_WOOD2, 0, 1.45, 0), 0, Math.PI / 2); add(g, mesh(new THREE.CylinderGeometry(.05, .05, 2, 6), M_WOOD2, 0, .55, 0), 0, Math.PI / 2);
    for (let i = 0; i < 5; i++) { const sp = mesh(new THREE.CylinderGeometry(.025, .025, 1.9, 5), M_WOOD, -.7 + i * .35, 1.0, .08); sp.rotation.x = -.18; g.add(sp); const tip = mesh(new THREE.ConeGeometry(.05, .2, 5), M_IRON, -.7 + i * .35, 1.98, -.1); g.add(tip); }
    g.position.set(x, 0, z); g.rotation.y = ry; world.add(g); return g; }
  const M_HAY = new THREE.MeshStandardMaterial({ color: 0xa8843a, roughness: 1 });
  function bale(x, z) { const b = mesh(new THREE.CylinderGeometry(.48, .48, .9, 12), M_HAY, x, .48, z); b.rotation.z = Math.PI / 2; b.rotation.y = rnd(-.4, .4); world.add(b); return b; }
  function build() {
    tuWall(-30, 30, -176, 4, 1.6); tuGround(14, -180, 'ground1'); tuWall(-30, 30, 13, 2.2, 1.2, false); tuWater(-G.W - 14, -80, 22, 220);
    for (const z of [-6, -24, -44, -64, -96, -124, -150]) tuYurt(G.W + 6.5, z, false, false);
    for (const [x, z] of [[-12.6, 6], [12.8, -14.5], [-13.2, -40]]) tuYurt(x, z, false, false);
    for (const [x, z, c] of [[-10.6, 2, 0xb5452c], [10.6, 2, 0x2f6f8f], [-10.6, -18, 0x5d8a4a], [10.6, -32, 0xb5452c], [-10.6, -48, 0x2f6f8f], [10.6, -66, 0x5d8a4a], [-5.2, -74, 0xb5452c], [5.2, -74, 0x2f6f8f]]) { try { tuBanner(x, z, c); } catch (e) { } }
    rack(10.2, -10, -Math.PI / 2); rack(-10.4, -22, Math.PI / 2); rack(10.4, -42, -Math.PI / 2);
    for (const [x, z] of [[-10.4, -8], [-9.8, -9.1], [10.3, -27], [-10.5, -55], [10.2, -54], [9.6, -55.2]]) bale(x, z);
    try { decor('R_horse', 10.6, -48, -1.4); decor('R_horse', 11.2, -52, -1.7); decor('R_arava', -11.2, -64, .6); } catch (e) { }
    // the archery maidens' own targets (visual only)
    for (const x of [-10.3, -8.7, -7.1]) { const tg = targetMesh(false); tg.position.set(x, 0, -50); tg.scale.setScalar(.9); world.add(tg); }
    try { tuSCN.ch3(); } catch (e) { console.warn('tut scenery', e); }
  }
  // ---------------- ambient life: sparring pairs, archers, riders, banter ----------------
  const ATK = ['1H_Melee_Attack_Slice_Diagonal', '1H_Melee_Attack_Chop', '1H_Melee_Attack_Slice_Horizontal', '1H_Melee_Attack_Stab'];
  function populate() { S.amb = [];
    for (const [x, z] of [[-8.2, -1.5], [8.6, -5.5], [8.4, -19.5], [-8.7, -28.5]]) { const sx = x < 0 ? 1.35 : -1.35; const a = npc('qiz', x, z), b = npc('qiz', x + sx, z - 1.25); a.rot = Math.atan2(b.x - a.x, b.z - a.z); b.rot = Math.atan2(a.x - b.x, a.z - b.z); a.play('Idle_Combat'); b.play('Idle_Combat'); S.amb.push({ k: 'spar', a, b, t: rnd(.2, 1.6) }); }
    for (const x of [-10.3, -8.7, -7.1]) { const e = npc('qiz', x, -36.5 - (x + 10.3) * .25, Math.PI); e.play('Idle'); S.amb.push({ k: 'arch', e, tx: x, tz: -50, t: rnd(.3, 2.8) }); }
    for (const [z, dir] of [[-36, -1], [-60, 1]]) { const e = npc('qiz', 9.6, z, dir < 0 ? Math.PI : 0); try { toggleMount(e, true); } catch (er) { } S.amb.push({ k: 'ride', e, dir, sp: rnd(4.8, 6) }); }
    for (const [x, z, r] of [[-5.5, 1.5, 2.6], [6.4, -12.5, -1.9], [-6.8, -14, 1.7]]) { const e = npc('qiz', x, z, r); e.play('Idle'); S.amb.push({ k: 'watch', e, t: rnd(1, 4) }); }
    S.sa = npc('gulayim', 2.4, 3.2, Math.PI * .85); S.sa.play('Idle'); S.sa.d = { ...S.sa.d, name: 'n_gu' }; }
  function arrowFx(x0, z0, x1, z1, y0 = 1.5, y1 = 1.5) { const g = new THREE.Group(); add(g, mesh(new THREE.CylinderGeometry(.018, .018, .9, 4), M_WOOD2), Math.PI / 2); const f = mesh(new THREE.ConeGeometry(.05, .14, 4), M_IRON, 0, 0, .5); f.rotation.x = Math.PI / 2; g.add(f); g.position.set(x0, y0, z0); g.lookAt(x1, y1, z1); world.add(g); S.arrows.push({ g, x0, z0, x1, z1, y0, y1, t: 0, dur: Math.max(.18, hyp(x1 - x0, z1 - z0) / 38) }); }
  function arrowsTick(dt) { for (let i = S.arrows.length - 1; i >= 0; i--) { const a = S.arrows[i]; a.t += dt; const k = Math.min(1, a.t / a.dur); a.g.position.set(a.x0 + (a.x1 - a.x0) * k, a.y0 + (a.y1 - a.y0) * k + Math.sin(k * Math.PI) * .5, a.z0 + (a.z1 - a.z0) * k); if (k >= 1 && !a.hit) { a.hit = true; a.stay = 1.6; if (hyp(a.x1 - G.player.x, a.z1 - G.player.z) < 18) tuSparks(a.x1, a.y1, a.z1, 0xd8c08a, 4, 2); } if (a.hit) { a.stay -= dt; if (a.stay <= 0) { world.remove(a.g); S.arrows.splice(i, 1); } } } }
  const V3a = new THREE.Vector3();
  const AMB_LINES = ['tu_a1', 'tu_a2', 'tu_a3', 'tu_a4', 'tu_a5', 'tu_a6', 'tu_a7', 'tu_a8'];
  function ambient(dt) { const p = P(); if (!S.amb) return;
    for (const a of S.amb) {
      if (a.k === 'spar') { if (a.a.dead || a.b.dead) continue; a.t -= dt; if (a.t <= 0) { const sw = Math.random() < .5, at = sw ? a.a : a.b, df = sw ? a.b : a.a; at.play(ATK[(Math.random() * 4) | 0], { once: true, force: true, ts: rnd(.85, 1.1) }); a.t = rnd(1.0, 1.9);
          setTimeout(() => { if (!S || df.dead) return; df.play(Math.random() < .7 ? 'Block' : 'Hit_A', { once: true, force: true }); if (p && hyp(df.x - p.x, df.z - p.z) < 16) tuSparks((at.x + df.x) / 2, 1.3, (at.z + df.z) / 2, 0xffe6a8, 5, 4); }, 300); } }
      else if (a.k === 'arch') { a.t -= dt; if (a.t <= 0) { a.t = rnd(2.2, 3.6); a.e.play('1H_Ranged_Shoot', { once: true, force: true }); const e = a.e; setTimeout(() => { if (S && !e.dead) arrowFx(e.x, e.z - .4, a.tx + rnd(-.25, .25), a.tz + .1, 1.55, 1.45 + rnd(-.25, .25)); }, 420); } }
      else if (a.k === 'ride') { const e = a.e; if (e.dead) continue; e.z += a.dir * a.sp * dt; if (e.z < -72) a.dir = 1; else if (e.z > -26) a.dir = -1; const want = a.dir < 0 ? Math.PI : 0; let d = want - e.rot; while (d > Math.PI) d -= 6.283; while (d < -Math.PI) d += 6.283; e.rot += d * Math.min(1, dt * 2.5); e.x = 9.6 + Math.sin(e.z * .12) * .6; e.spd = a.sp; e.play('Idle_Combat'); }
      else if (a.k === 'watch') { a.t -= dt; if (a.t <= 0) { a.t = rnd(2.5, 5); if (p) a.e.rot = Math.atan2(p.x - a.e.x, p.z - a.e.z); a.e.play(Math.random() < .35 ? 'Cheer' : 'Idle', { force: true }); } }
    }
    // walkers (partners stepping aside etc.)
    for (let i = S.walkers.length - 1; i >= 0; i--) { const w = S.walkers[i], e = w.e; const dx = w.x - e.x, dz = w.z - e.z, l = hyp(dx, dz); if (l < .25 || e.dead) { e.play('Idle'); if (w.rot !== undefined) e.rot = w.rot; S.walkers.splice(i, 1); continue; } const s = Math.min(l, (w.sp || 3.2) * dt); e.x += dx / l * s; e.z += dz / l * s; e.rot = Math.atan2(dx, dz); e.play(w.sp > 4 ? 'Running_A' : 'Walking_A'); }
    // banter: a nearby maiden says something now and then (only when no story bubble is up)
    if (p && G.time > (S.banT || 0) && !S.bubs.length) { S.banT = G.time + rnd(6, 10); const near = S.npcs.filter(e => { if (e.dead || e.mounted || e === S.sa || hyp(e.x - p.x, e.z - p.z) > 13) return false; V3a.set(e.x, (e.h || 2) + .5, e.z).project(camera); return V3a.z < 1 && Math.abs(V3a.x) < .75 && V3a.y < .45 && V3a.y > -.7; }); if (near.length) bubble(near[(Math.random() * near.length) | 0], AMB_LINES[(S.banI = ((S.banI || 0) + 1)) % AMB_LINES.length], 2.6); } }
  // ---------------- partners: real enemy AI (red wedge telegraph), harmless, never die ----------------
  function partner(x, z, who, o = {}) { const e = spawn(o.type || 'qiz', x, z, 'enemy', true); e.spawnT = 0; e.o.scale.setScalar(e.vs || e.d.scale || 1);
    e.d = { ...e.d, team: 'enemy', follow: false, windup: o.windup || 1.05, cd: o.cd || 2.1, rec: 1.05, dmg: [5, 8], string: 1, block: 0, range: 2.1, name: 'n_' + who, ranged: false };
    e.maxHp = e.hp = 100000; e.speed = 3.8; e.farT = -1e9; e.who = who; e.home = { x, z }; e.rot = 0; e.showBar = () => { };
    try { markHunt(e, 'n_' + who); } catch (er) { }
    const d0 = e.damage.bind(e); e.damage = (a, s, op) => { const r = d0(a, s, op); if (e.hp < e.maxHp * .6) e.hp = e.maxHp; if (r && s === P()) { e.lastHitT = G.time; S.parHits = (S.parHits || 0) + 1; if (airborne()) S.airHit = G.time; } return r; };
    e.custom = idleAI; S.partners.push(e); return e; }
  function idleAI(e, dt) { const p = P(); const dx = e.home.x - e.x, dz = e.home.z - e.z, l = hyp(dx, dz); if (l > .4) { e.x += dx / l * Math.min(l, 3 * dt); e.z += dz / l * Math.min(l, 3 * dt); e.play('Walking_A'); e.rot = Math.atan2(dx, dz); } else { if (p) e.face(p.x - e.x, p.z - e.z, dt * 5); e.play('Idle_Combat'); } e.clearTele && e.clearTele(); e.state = 'chase'; return true; }
  const engage = (e, on) => { if (!e || e.dead) return; e.custom = on ? null : idleAI; e.state = 'chase'; e.cd = on ? .8 : 1; };
  const toCrowd = (e, x, z, rot) => { if (!e || e.dead) return; e.custom = idleAI; e.team = 'npc'; unplate(e); S.walkers.push({ e, x, z, rot, sp: 3.4 }); };
  // ---------------- player: observe every hit taken (dodge / block / parry / shield outcomes) ----------------
  function wrapPlayer(p) { const d0 = p.damage.bind(p); p.damage = (a, s, op) => { const hp0 = p.hp, ifr = p.iframe > 0, blk = blocking(), sh = (p.shield || 0) > 0; const r = d0(a, s, op); if (S && s) { const lost = hp0 - p.hp; S.ev.push({ src: s, t: G.time, r, lost, raw: a, ifr, blk: blk && lost < a * .6, shield: sh && lost < a * .5 }); } return r; }; }
  // ---------------- per-frame logic (game time) ----------------
  function tick(dt) { if (!S || S.over) return; const p = P(); if (!p) return;
    for (const e of S.props) { if (e.dead) continue; if (e.mover) e.mover(e, dt); e.x = e.px; e.z = e.pz; e.kx = e.kz = 0; e.stagger = 0; e.downT = 0; e.air = false; e.y = 0; e.rot = e.prot; e.state = 'chase';
      if (e.vis) { e.wob = Math.max(0, (e.wob || 0) - dt * 1.5); e.vis.rotation.x = Math.sin(G.time * 22) * e.wob * .22; e.vis.rotation.z = Math.cos(G.time * 17) * e.wob * .1; } }
    { const bl = blocking(); if (bl && !S.blk0) S.gT = G.time; S.blk0 = bl; }
    const k = actK(); if (k !== S.lastK) { S.lastK = k; if (k) S.acts.push({ k, t: G.time }); if (/dodge|roll/.test(k)) { S.lastDodge = G.time; S.lastDodgeK = k; } if (S.acts.length > 30) S.acts.shift(); }
    if (p.act && p.act.kind === 'dodge' && p.act.roll && S.lastDodgeK !== 'roll') { S.lastDodge = G.time; S.lastDodgeK = 'roll'; }
    for (const e of S.props) e.farT = -1e9;   // scripted: exempt from the engine's straggler pull / auto-kill
    for (const e of S.partners) { if (e.dead) continue; e.farT = -1e9; if (e.team === 'npc') unplate(e); const st = e.state; if (e.pst === 'windup' && st !== 'windup' && !e.custom) S.strikes.push({ e, t: G.time, dodgeT: S.lastDodge || -9, dodgeK: S.lastDodgeK || '' }); e.pst = st; }
    for (let i = S.strikes.length - 1; i >= 0; i--) { const s = S.strikes[i]; if (G.time - s.t < .16) continue; S.strikes.splice(i, 1);
      const evs = S.ev.filter(v => v.src === s.e && v.t >= s.t - .08 && v.t <= s.t + .2), hurt = evs.some(v => v.lost > 0 && !v.blk && !v.shield);
      const res = { hurt, dodged: !hurt && (evs.some(v => v.ifr) || (s.t - s.dodgeT < .75 && s.t - s.dodgeT > -.05)), roll: /roll/.test(s.dodgeK), blocked: evs.some(v => v.blk), shield: evs.some(v => v.shield) };
      if (S.onStrike) try { S.onStrike(res, s); } catch (err) { console.warn(err); } }
    if (S.ev.length > 40) S.ev = S.ev.filter(v => G.time - v.t < 2);
    if (G.stats && (G.stats.pd || 0) > S.pd0) { S.pd0 = G.stats.pd; bonus('pd'); }
    ambient(dt); arrowsTick(dt); if (S.ringTick) S.ringTick(dt); if (S.rider) riderTick(dt);
    if (S.cur && S.cur.tick) S.cur.tick(dt);
    if (S.duelCard && G.time - S.duelCard > 6 && G.boss) { S.duelCard = 0; card(''); }
    if (S.cur && S.cur.prog) { const pr = S.cur.prog(); if (pr !== S.lastProg) { S.lastProg = pr; cardProg(pr); } } }
  function fx() { if (!S) return; try { bubTick(); ptrTick(); if (!S.over) btnTick(); } catch (e) { } }
  // a partner who steps out of the drill loses her name plate + gold ring (the engine re-shows hidden plates every frame, so detach them)
  function unplate(e) { for (const k of ['bar', 'aura']) { const o = e[k]; if (o) { if (o.parent) o.parent.remove(o); e[k] = null; } } e.barFg = null; e.hunt = false; }
  function bonus(k) { if (!S || S.opt[k]) return; S.opt[k] = true; if (S.optHave.includes(k)) { prize('★ ' + t('tu_bonus_' + k)); Sfx.power && Sfx.power(); } }
  const who2e = w => w === 'gu' ? S.sa : w === 'sa' ? S.spar : w === 'ays' ? P() : w === 'aqm' ? S.aqm : w === 'jup' ? S.jup : null;   // fix3: gu = teacher npc, sa = sparring partner, ays = the player
  function reward(n, praise) { const p = P(); if (n) addGold(n, p.x, p.z); Sfx.pick(); prize('+' + n + ' 🪙'); if (praise) bubble(who2e(praise[0]), praise[1], 2.6, praise[0]); }
  function slowmo() { G.slow = Math.max(G.slow || 0, .65); G.zk = Math.max(G.zk || 0, .16); flash(.25); const p = P(); ringFx(p.x, p.z, 2.8, 0xbfe8ff); burst(p.x, 1.3, p.z, 0xbfe8ff, 2.2); Sfx.power && Sfx.power(); }
  const alive = R => S === R && !R.over && G.mis === R.mis;
  const goto = (e, x, z, rot, sp) => { if (e && !e.dead) { S.walkers = S.walkers.filter(w => w.e !== e); S.walkers.push({ e, x, z, rot, sp }); } };
  async function step(R, o) {
    if (!alive(R)) return false; if (o.need && !o.need()) { R.skipped.push(o.id); return false; }
    R.k++; R.cur = null; const p = P(); if (p) p.hp = p.maxHp;
    if (o.say) { await say(o.say); if (!alive(R)) return false; }
    if (o.init) { await o.init(); if (!alive(R)) return false; }
    if (o.bub) bubble(who2e(o.bub[0]), o.bub[1], 3, o.bub[0]);
    G.mis.aim = () => S.sa;   // between drills the arrow shows the teacher, never the sparring partner
    if (o.demo) { obj('🎯 ' + t('tu_n')); card('👀 ' + t('tu2_watch')); focus([]); bubble(S.sa, 'tu2_watch', 2.2, 'gu'); try { await o.demo(); } catch (err) { console.warn(err); } if (!alive(R)) return false; prize(t('tu2_you')); bubble(S.sa, 'tu2_you', 1.8, 'gu'); }
    if (o.go) o.go();
    obj('🎯 ' + t('tu_n')); card(t(o.tip, o.tipV), o.prog ? o.prog() : ''); focus(o.btn ? o.btn() : []); R.lastProg = null; R.cur = o; G.mis.aim = o.aim || (() => S.sa);
    if (o.seg) { card(''); await o.seg(); if (!alive(R)) return false; }
    await until(() => !alive(R) || G.mis.force || R.next || o.ok());
    R.next = false; R.cur = null; if (!alive(R)) return false;
    if (o.done) try { o.done(); } catch (err) { console.warn(err); }
    cardOk(); bigOk(); focus([]); G.mis.aim = () => S.sa; reward(o.gold ?? 15, o.praise); R.log.push(o.id + '@' + G.time.toFixed(1));
    await wait(1.1); return alive(R); }
  // ---------------- rings (mounted ride) ----------------
  function rings(R, pts) { R.rings = pts.map(([x, z], i) => { const g = ringMesh(); g.position.set(x, 0, z); world.add(g); return { g, x, z, i, done: false, miss: false }; }); R.ringsN = 0;
    S.ringTick = dt => { const p = P(); const cur = R.rings.find(r => !r.done); for (const r of R.rings) { if (r.done) continue; const on = r === cur; r.g.tor.material.opacity = on ? .95 : .45; r.g.glow.material.opacity = on ? .3 + Math.sin(G.time * 6) * .15 : .08; r.g.tor.rotation.y = Math.sin(G.time * 1.5 + r.i) * .15;
        if (hyp(p.x - r.x, p.z - r.z) < 1.9) { r.done = true; R.ringsN++; Sfx.pick(); burst(r.x, 2, r.z, 0xffd060, 2.2); ringFx(r.x, r.z, 2.2, 0xffd060); r.g.tor.material.color.set(0x7fe08a); r.g.glow.material.opacity = 0; addGold(5, r.x, r.z); }
        else if (!r.miss && p.z < r.z - 2.6) { r.miss = true; R.ringMiss = true; bubble(S.sa, 'tu_b_miss', 2.4, 'sa'); } } }; }
  function riderTick(dt) { const r = S.rider, e = r.e; if (e.dead) return; if (e.z < r.tz) { const v = Math.min(10.5, (r.tz - e.z) * 1.6 + 1.5); e.z = Math.min(r.tz, e.z + v * dt); e.spd = v; e.rot = 0; e.play('Idle_Combat'); if (Math.random() < .3) burst(e.x + rnd(-.4, .4), .2, e.z - .8, 0xc8a070, 1.2, true); } else { e.spd = 0; r.arrived = true; } }
  // ---------------- the mission ----------------
  async function run() {
    if (S) cleanup();
    const R = S = { props: [], npcs: [], bubs: [], arrows: [], walkers: [], partners: [], ev: [], acts: [], strikes: [], opt: {}, optHave: ['pd'], k: 0, total: 0, mis: G.mis, shown: new Set(), pow0: { ...(G.powers || {}) }, noVar0: G.noVar, skipped: [], log: [], dodges: 0, rolls: 0, blocks: 0, combo: 0, pd0: 0 };
    await field(R, 'start'); if (!alive(R)) return; G.chGold = 0; G.stats.deaths = 0; R.pd0 = G.stats.pd || 0;
    // stations: two straw dummies, a shield dummy, the sparring partner, the archery instructor
    const lightHit = s => { const p = P(); if (s !== p || actK() !== 'atk' || p.act === R.lastAct) return; R.lastAct = p.act; R.lh = (R.lh || 0) + 1; const gap = G.time - (R.lastL ?? -9); R.chain = gap < 1.7 ? (R.chain || 0) + 1 : 1; R.lastL = G.time; R.combo = Math.max(R.combo, R.chain); };
    R.d1 = prop(-1.15, -12, dummyMesh(false), { onHit: lightHit }); R.d2 = prop(1.15, -12, dummyMesh(false), { onHit: lightHit });
    R.sd = prop(0, -17, dummyMesh(true), { r: .7, gate: (s) => s === P() && actK() === 'hvy', gateKey: 'tu_shieldblk', onGate: () => { if (R.cur && R.cur.id === 'heavy') { R.sdTry = (R.sdTry || 0) + 1; bubble(S.sa, 'tu_b_hold', 2.4, 'gu'); } }, onHit: () => { breakProp(R.sd); R.hvy = true; } });
    R.sd2 = prop(3.6, -17, dummyMesh(true), { r: .7 });   // the teacher's demo dummy
    S.spar = R.spar = partner(0, -26, 'sa', { type: 'sarbinaz', windup: 1.5, cd: 2.4 }); S.aqm = R.aqm = npc('qiz', -3.4, -31.5, .6); R.aqm.play('Idle');
    window.__TUT_R = R;
    const F = TU_FEAT;
    // fix3 (author's direction): the PLAYER is a young trainee maiden (Aysulıw); Gúlayım is the teacher (S.sa) — she shows every move first,
    // Sárbinaz is the sparring partner (R.spar). 8 steps: move, combo, strong, dodge, block+parry, lock-on, bow, duel. Generous timing + a fallback after repeated misses.
    const walkTo = async (e, x, z, rot, sp = 4, tmax = 5) => { goto(e, x, z, rot, sp); const t0 = G.time; await until(() => !alive(R) || !S.walkers.some(w => w.e === e) || G.time - t0 > tmax); };
    const swing = (e, k = 1, ts = 1.1) => { if (e && !e.dead) e.play(ATK[k % 4], { once: true, force: true, ts }); };
    const hold = (e, on) => { if (!e || e.dead) return; e.custom = on ? (x => { x.state = 'chase'; x.play('Idle_Combat'); x.clearTele && x.clearTele(); return true; }) : idleAI; };
    const T1 = S.sa, SP = R.spar;
    const strikeAt = async (tg, after) => { hold(SP, true); SP.face(tg.x - SP.x, tg.z - SP.z, 1); swing(SP, 1, .7); await wait(.42); if (alive(R)) await after(); await wait(.7); hold(SP, false); };
    const easy = (n, k) => { if (n >= k && !R.easyT) { R.easyT = G.time; bubble(T1, 'tu2_easy', 2.4, 'gu'); return true; } return !!R.easyT; };
    // wave4 (author's direction): the 3-button scheme — ⚔ attack (tap / hold / far = bow), ➤ dodge (+ parry during a wind-up), 🔺 amulet.
    // 8 steps: move, sword arc, hold = spin, dodge the red circle, parry + counter, bow volley, amulet, duel. Gúlayım shows each move first.
    const W4 = () => window.__W4 || null;
    const tele = (x, z, r, d) => { try { return telegraph(x, z, r, d, 0xff3322); } catch (e) { return null; } };
    const ST = [
      { id: 'move', tip: 'tu2_move', btn: () => [joyId()], aim: () => ({ x: 0, z: -8.5 }), init: () => { R.mk = marker(0, -8.5); },
        demo: async () => { await walkTo(T1, .9, -8.3, 0, 4.4); ringFx(.9, -8.3, 1.6, 0xffd060); await wait(.5); await walkTo(T1, 3.8, -6.6, -.6, 4.4); },
        ok: () => P().z < -7, done: () => R.mk && R.mk.remove(), praise: ['gu', 'tu2_p'], gold: 10 },
      { id: 'light', tip: 'tu4_atk', btn: () => ['bA'], aim: () => R.d1, init: () => { R.mk = marker(0, -10.8, 0xffd060, 1.1); },
        demo: async () => { await walkTo(T1, R.d2.x + .6, R.d2.z + 1.15, Math.PI, 4.4); T1.rot = Math.PI; for (let i = 0; i < 3; i++) { swing(T1, i, 1.3); await wait(.2); R.d2.wob = .5; tuSparks(R.d2.x, 1.3, R.d2.z, 0xffe6a8, 6, 4); Sfx.hit(); num(R.d2, String(i + 1), 'c'); await wait(.25); } await wait(.3); await walkTo(T1, 4.6, -10.2, -.8, 4.4); },
        prog: () => Math.min(3, R.combo) + '/3', ok: () => R.combo >= 3 || (R.lh || 0) >= 7, done: () => { R.mk && R.mk.remove(); for (const e of [R.d1, R.d2]) e.team = 'npc'; }, praise: ['gu', 'tu_p_light'] },
      { id: 'heavy', tip: 'tu4_spin', btn: () => ['bA'], init: () => { reveal('bA'); R.mk = marker(0, -15.8, 0xffd060, 1.1); },
        demo: async () => { await walkTo(T1, R.sd2.x, R.sd2.z + 1.25, Math.PI, 4.4); T1.rot = Math.PI; T1.play('2H_Melee_Attack_Spin', { once: true, force: true, ts: .8 }); await wait(.55); ringFx(T1.x, T1.z, 2.6, 0xfff0c0); breakProp(R.sd2); G.shake = .35; Sfx.big(); await wait(.6); await walkTo(T1, 5.4, -14.2, -.8, 4.4); },
        aim: () => R.sd.dead ? null : R.sd, ok: () => R.hvy || easy(R.sdTry || 0, 7), done: () => { R.mk && R.mk.remove(); if (!R.sd.dead) breakProp(R.sd); R.easyT = 0; }, praise: ['gu', 'tu_p_heavy'] },
      { id: 'dodge', tip: 'tu4_dodge', btn: () => ['bD'], init: () => { reveal('bD'); R.dz = 0; R.dzF = 0; R.dzT = G.time + 1.2; R.dzC = null; },
        demo: async () => { await walkTo(T1, 3.4, -19, Math.PI, 4.4); T1.rot = Math.PI; tele(T1.x, T1.z, 2.2, 1.3); await wait(.9); S.walkers.push({ e: T1, x: T1.x + 3, z: T1.z - .4, rot: Math.PI, sp: 10 }); burst(T1.x, .3, T1.z, 0xc8a070, 1.4, true); Sfx.dodge && Sfx.dodge(); await wait(.5); num(T1, '✓', 'c'); await wait(.4); await walkTo(T1, 5.4, -14.2, -.8, 4.4); },
        // a red circle opens under her feet; when it closes she must be out of it (or rolling through it)
        tick: () => { const p = P(); if (!p) return; if (!R.dzC && G.time > R.dzT) { R.dzC = { x: p.x, z: p.z, t: G.time + 1.5, dg: G.stats.dodge || 0 }; tele(p.x, p.z, 2.2, 1.5); }
          if (R.dzC && G.time >= R.dzC.t) { const c = R.dzC, out = hyp(p.x - c.x, p.z - c.z) > 2.45, rolled = (G.stats.dodge || 0) > c.dg; R.dzC = null; R.dzT = G.time + 1.3;
            ringFx(c.x, c.z, 2.2, out ? 0x7fe08a : 0xff5533); burst(c.x, .3, c.z, 0xc8a070, 1.6, true); if (out || (rolled && p.iframe > 0)) { R.dz++; num(p, '✓', 'c'); } else { R.dzF++; bubble(T1, 'tu_b_hit', 2, 'gu'); G.shake = .2; } } },
        prog: () => R.dz + '/2', ok: () => R.dz >= 2 || easy(R.dzF || 0, 4), done: () => { R.dzC = null; R.easyT = 0; }, praise: ['gu', 'tu4_p_dodge'] },
      { id: 'parry', say: [['sa', 'tu3_spar'], ['ays', 'tu3_ok']], tip: 'tu4_parry', tipV: { n: t('n_sa') }, btn: () => ['bD'], aim: () => SP, init: () => { reveal('bD'); R.par0 = parried(); },
        demo: async () => { await walkTo(T1, 0, -23.7, Math.PI, 4.4); T1.rot = Math.PI; bubble(T1, 'tu4_demo_parry', 2.6, 'gu');
          await strikeAt(T1, async () => { T1.play('Block', { once: true, force: true }); await wait(.12); tuSparks(T1.x, 1.4, T1.z - .5, 0xbfe8ff, 12, 7); flash(.25); Sfx.power && Sfx.power(); num(T1, '✨', 'c'); await wait(.25); swing(T1, 3, 1.4); await wait(.2); num(SP, '⚔', 'c'); Sfx.hit(); });
          await walkTo(T1, -4.4, -22.4, .6, 4.4); },
        go: () => { SP.d = { ...SP.d, windup: 1.6, cd: 2.5 }; engage(SP, true); S.onStrike = (r) => { if (r.hurt) { R.pfail = (R.pfail || 0) + 1; bubble(SP, 'tu_b_hit', 2, 'sa'); } }; },
        tick: () => { const n = parried() - R.par0; if (n > (R.pn || 0)) { R.pn = n; slowmo(); } },
        prog: () => Math.min(2, parried() - R.par0) + '/2', ok: () => parried() - R.par0 >= 2 || easy(R.pfail || 0, 4),
        done: () => { S.onStrike = null; engage(SP, false); SP.d = { ...SP.d, windup: 1.5, cd: 2.4 }; R.easyT = 0; }, praise: ['sa', 'tu4_p_parry'], gold: 25 },
      { id: 'bow', tip: 'tu4_bow', btn: () => ['bA'], init: () => { toCrowd(SP, 6.8, -23, -1.6); R.vT = -9; R.bh = new Set(); const mkT = (x, z) => { const e = prop(x, z, targetMesh(false), { r: .7, gate: s => s === P() && G.time - R.vT < 3, gateKey: 'tu4_bow', onHit: () => { R.bh.add(e); } }); return e; }; R.t1 = mkT(-3, -45); R.t2 = mkT(3, -46); },
        demo: async () => { const a = R.aqm; if (!a || a.dead) return; bubble(a, 'tu2_watch', 2, 'aqm'); a.rot = Math.PI; a.play('1H_Ranged_Shoot', { once: true, force: true }); await wait(.45); arrowFx(a.x, a.z - .4, -3, -45, 1.55, 1.5); arrowFx(a.x, a.z - .4, 3, -46, 1.55, 1.5); await wait(1.2); },
        tick: () => { const p = P(); if (p && p.act && p.act.w4v) R.vT = G.time; }, aim: () => [R.t1, R.t2].find(e => e && !e.dead && !R.bh.has(e)) || null,
        prog: () => R.bh.size + '/2', ok: () => R.bh.size >= 2, done: () => { dropProp(R.t1); dropProp(R.t2); }, praise: ['aqm', 'tu4_p_bow'], gold: 20 },
      { id: 'amu', tip: 'tu4_amu', btn: () => ['bP'], init: () => { reveal('bP'); R.am0 = G.stats.amulet || 0; G.ulti = 100; const p = P(); const z = Math.min(-27, p.z - 4.5); R.am = [prop(-1.6, z, dummyMesh(false)), prop(1.6, z - .6, dummyMesh(false)), prop(0, z - 2, dummyMesh(false))]; },
        demo: async () => { await walkTo(T1, 4.8, -22, Math.PI, 4.4); T1.rot = Math.PI; T1.play('Cheer', { once: true, force: true }); await wait(.4); flash(.3); ringFx(T1.x, T1.z, 4, 0xffc040); burst(T1.x, 1.6, T1.z, 0xffb040, 2.4); Sfx.power && Sfx.power(); await wait(.8); },
        tick: () => { if ((G.stats.amulet || 0) <= R.am0 && G.ulti < 100) G.ulti = 100; }, aim: () => R.am && R.am[2],
        ok: () => (G.stats.amulet || 0) > R.am0, done: () => { for (const e of R.am || []) dropProp(e); }, praise: ['gu', 'tu4_p_amu'], gold: 25 },
    ];
    // bench #8: four steps (attack, parry / dodge, amulet, duel); no demo and one line of talk before the first step, so her first hit lands within ~12 s. ?tut8=1 plays the long 8-step version.
    const TUT4 = !/[?&]tut8=1/.test(location.search);
    if (TUT4) { const K = ['light', 'parry', 'amu']; for (let i = ST.length - 1; i >= 0; i--) if (!K.includes(ST[i].id)) ST.splice(i, 1);
      const li = ST.find(o => o.id === 'light'); if (li) { li.demo = null; const b0 = li.btn; li.btn = () => [joyId(), ...b0()]; }
      const am = ST.find(o => o.id === 'amu'); if (am) { const i0 = am.init; am.init = () => { try { toCrowd(SP, 6.8, -23, -1.6); } catch (e) { } i0(); }; } }
    R.total = ST.filter(o => !o.need || o.need()).length + 1;
    setMusic('calm'); await ban(3); if (!alive(R)) return; mstart();
    await say(TUT4 ? [['gu', 'tu3_d1']] : [['gu', 'tu3_d1'], ['ays', 'tu3_d2'], ['gu', 'tu3_d3']]); if (!alive(R)) return;
    for (const o of ST) { await step(R, o); if (!alive(R)) return; }
    // ---- final: friendly duel with Sárbinaz (everything combined; she yields) ----
    R.k++; reveal('bA', 'bD', 'bP'); focus([]);
    obj('⚔ ' + t('tu_t_duel')); card(t('tu_t_duel')); const p2 = P(); p2.hp = p2.maxHp; R.duelCard = G.time;
    for (const e of S.props) if (!e.dead) e.team = 'npc';
    if (R.spar && !R.spar.dead) { R.spar.dead = true; R.spar.gone = true; try { R.spar.remove(); } catch (e) { R.spar.o.visible = false; } }
    const DX = 0, DZ = -60, DR = 7.5;
    for (const [e, x] of [[S.sa, 0], [R.jup, 3.8], [R.aqm, -3.8]]) if (e && !e.dead) { S.walkers = S.walkers.filter(w => w.e !== e); e.team = 'npc'; e.custom = idleAI; e.home = { x, z: DZ + DR + 2 }; e.x = x; e.z = DZ + DR + 2.2; unplate(e); }
    const A = arena({ type: 'sarbinaz', x: DX, z: DZ, R: DR, name: 'n_sa', title: 'tu_duel_t', hp: 1100, dmg: .3, poise: 150, crowd: [['qiz', 8]] });
    A.foe.d = { ...A.foe.d, windup: 1.0, cd: 1.9, rec: .85, string: 2, block: .2 }; S.spar = A.foe;
    for (const c of A.ring.crowd) c.rot = Math.atan2(DX - c.x, DZ - c.z);
    const res = await duel({ arena: A, x: DX, z: DZ, R: DR, name: 'n_sa', title: 'tu_duel_t', nonLethal: .3, after: 'stay', intro: [['gu', 'tu3_duel1'], ['sa', 'tu_d_sa3'], ['ays', 'tu_d_gu3'], ['sa', 'tu_d_sa4']] });
    if (!alive(R)) return; G.tick = tick; R.duelCard = 0; R.duelClean = !!(res && res.clean); cardOk(); reward(40, null); card(''); obj('');
    await say([['sa', 'tu_d_sa6'], ['gu', 'tu3_win']]); if (!alive(R)) return;
    // ---- story hook: the alarm horn, a rider over the bridge, smoke over Sarkop ----
    for (const c of A.ring.crowd) c.play('Cheer', { force: true }); await wait(1.4); if (!alive(R)) return;
    // STORY (author): no alarm and no smoke here — Gúlayım trains at Qıran mountain and knows nothing; the battle of Sarkop is already lost. A wounded, dust-covered messenger gallops in and tells her.
    setMusic('off'); try { Sfx.hoof && Sfx.hoof(); } catch (e) { }
    const pz = P().z, rd = npc('son', 1.4, -104, 0); try { toggleMount(rd, true); } catch (e) { } S.rider = { e: rd, tz: pz - 3.4 }; S.mes = rd; G.mis.aim = () => rd;
    // short cinematic: the camera lifts and looks past the bridge — the rider and smoke columns over the far bank
    const cv = { k: 0, on: true }, V1 = new THREE.Vector3(), V2 = new THREE.Vector3(), V3 = new THREE.Vector3();
    tuCam((cam, dt) => { cv.k = Math.min(1, Math.max(0, cv.k + (cv.on ? 1 : -1) * Math.min(dt, .05) * .7)); if (cv.k <= 0 && !cv.on) { tuCam(null); return; } const s = cv.k * cv.k * (3 - 2 * cv.k), p = P(); if (!p) return;
      V1.set(p.x + 3.4, 3.2, p.z + 5.2); V3.set(p.x, .8, p.z - .9); V2.set((p.x + rd.x) / 2, 2.4, Math.min(rd.z, p.z - 8) - 10); cam.position.lerp(V1, s); cam.lookAt(V3.lerp(V2, s)); });
    const cine = on => { for (const id of ['btns', 'joy', 'tuskip']) { const el = $(id); if (el) el.style.visibility = on ? 'hidden' : ''; } }; cine(true);
    R.camOff = () => { cv.on = false; cine(false); };
    for (const c of [...A.ring.crowd, S.sa, R.jup, R.aqm]) if (c && !c.dead) { c.rot = Math.atan2(rd.x - c.x, -90 - c.z); c.play('Idle', { force: true }); }
    const tR = G.time; await until(() => !alive(R) || G.mis.force || S.rider.arrived || G.time - tR > 9); if (!alive(R)) return;
    bubble(rd, 'tu_b_ms', 2, 'ms'); await wait(1.1); if (!alive(R)) return;
    await say([['ms', 'w4_ms1'], ['gu', 'w4_ms_gu1'], ['ms', 'w4_ms2'], ['ms', 'w4_ms3'], ['gu', 'w4_ms_gu2']]); if (!alive(R)) return;
    R.camOff(); G.mis.aim = null;
    for (const c of [...A.ring.crowd, S.sa, R.jup, R.aqm]) if (c && !c.dead) c.play('Idle', { force: true }); setMusic('calm');
    G.mis.flag = R.duelClean; G.mis.flag2 = R.optHave.every(k => R.opt[k]); R.log.push('end@' + G.time.toFixed(1) + ' clean=' + R.duelClean + ' opt=' + JSON.stringify(R.opt));
    await H.bannerShow(t('tu_n'), t('tu_done'), t('w4_tale'), 2.6); if (!alive(R)) return;   /* next: the messenger's tale = prologue 0-1 / 0-2 played as Allayar */
    markDone(); cleanup(); return win(); }
  // (re)build the training field: 'start' = the opening, 'after' = back from the sniper-bow range (ride, duel and the hook follow)
  async function field(R, phase) { const { DAY } = H.moods, st = phase === 'start';
    await H.fadeTo(true); await H.chapterStart({ ...DAY, emberA: 0, fog: [60, 170] }, build, ['sarbinaz', 'son', 'gulayim']); if (!alive(R)) return;
    G.curCh = 0; G.noVar = true; G.powers = st ? {} : { 8: true }; G.freeze = false;
    const z0 = st ? 6 : -34, p = makePlayer('qiz', 0, z0); p.d = { ...p.d, team: 'ally', follow: false, dmg: [20, 30], speed: 7.4, name: 'n_ays' }; p.speed = 7.4; p.maxHp = p.hp = 500; H.setHero('ays'); H.setDeath(); H.setCP(0, z0); G.noDeath = true; setBoss(null); H.objective('');
    if (!st && G.sk[8]) { G.sk[8].on = true; G.sk[8].max = 3; refreshSkills(); }
    Object.assign(R, { props: [], npcs: [], partners: [], walkers: [], strikes: [], ev: [] }); for (const b of R.bubs) b.el.remove(); R.bubs = []; for (const a of R.arrows || []) world.remove(a.g); R.arrows = [];
    wrapPlayer(p); hudOn(); btnTick(); populate();
    if (!st) { S.sa.x = -5.5; S.sa.z = -40; S.sa.rot = 2.4; for (const [k, x, z, ty] of [['spar', 6.4, -30.5, 'sarbinaz'], ['jup', 7.6, -30.5, 'qiz'], ['aqm', -2.6, -35.5, 'qiz']]) { const e = npc(ty, x, z, -1.7); e.play('Idle'); S[k] = R[k] = e; } R.jup = TU_FEAT.lock.has() ? R.jup : null; }
    G.tick = tick; G.mis.fx = fx; live(); }
  // bow: the sniper-bow steps if the archery module is present, else the existing arrow-rain skill (button 2)
  function bowSteps(R, on) {
    const LV = (() => { try { return tuArchLv && tuArchLv['TU-S']; } catch (e) { return null; } })();
    if (LV || window.__TUT_FAKEARCH) return [{ id: 'sniper', icon: '🏹', tip: 'tu_t_bow1', btn: () => [], seg: async () => { const res = LV ? await tuRunArch('TU-S', H).catch(e => { console.error('[tut archery]', e); return { ok: true }; }) : (await wait(.5), { ok: true, all: true });
        if (!alive(R)) return; R.archRes = res || {}; if (res && res.all) bonus('bull'); await field(R, 'after'); }, ok: () => true, praise: ['aqm', 'tu_p_bow3'], gold: 30 }];
    if (!on) return [{ id: 'rain', icon: '🏹', tip: 'tu_t_rain', btn: () => ['b2'], aim: () => (R.tgs || []).find(e => !e.dead),
      init: () => { if (G.sk[2]) { G.sk[2].on = true; G.sk[2].cd = 0; G.sk[2].max = 3; } refreshSkills(); reveal('b2'); }, prog: () => Math.min(2, (R.tgHit && R.tgHit.size) || 0) + '/2', ok: () => R.tgHit && R.tgHit.size >= 2, praise: ['aqm', 'tu_p_rain'], gold: 20 }];
    const A = ARCH(), bb = () => [F_bowBtn()]; const F_bowBtn = () => TU_FEAT.bow.btn();
    const hitsOn = (e) => () => (e && e.tuHits) || 0;
    const mk = (x, z, big, o = {}) => prop(x, z, targetMesh(big), { onHit: (s, op) => { const e = o.ref(); e.tuHits = (e.tuHits || 0) + 1; if (op && (op.bull || op.head || op.crit)) e.tuBull = true; } , r: big ? .9 : .7 });
    return [
      { id: 'bow1', icon: '🏹', tip: 'tu_t_bow1', btn: bb, init: () => { reveal(F_bowBtn()); try { A.enable && A.enable(true); } catch (e) { } let e1; e1 = R.b1 = mk(0, -45, false, { ref: () => e1 }); }, aim: () => R.b1, ok: () => hitsOn(R.b1)() > 0, done: () => dropProp(R.b1), praise: ['aqm', 'tu_p_bow1'] },
      { id: 'bow2', icon: '🏹', tip: 'tu_t_bow2', btn: bb, init: () => { let e2; e2 = R.b2 = mk(0, -50, false, { ref: () => e2 }); e2.mover = (e, dt) => { e.px = Math.sin(G.time * 1.1) * 5.5; }; }, aim: () => R.b2, ok: () => hitsOn(R.b2)() > 0, done: () => dropProp(R.b2), praise: ['aqm', 'tu_p_bow2'] },
      { id: 'bow3', icon: '🏹', tip: 'tu_t_bow3', btn: bb, init: () => { let e3; e3 = R.b3 = mk(1.5, -72, true, { ref: () => e3 }); }, aim: () => R.b3, ok: () => hitsOn(R.b3)() > 0, done: () => { if (R.b3.tuBull) bonus('bull'); dropProp(R.b3); try { A.enable && A.enable(false); } catch (e) { } }, praise: ['aqm', 'tu_p_bow3'], gold: 25 },
    ]; }
  function markDone() { try { localStorage.setItem('qq_tut', '1'); } catch (e) { } }
  function cleanup() { if (!S) return; const R = S; R.over = true; try { hudOff(); restoreBtns(); } catch (e) { }
    G.powers = R.pow0 || {}; G.noVar = R.noVar0; if (R.camOff) try { R.camOff(); tuCam(null); } catch (e) { } R.amb = null; R.cur = null; R.ringTick = null; try { for (const a of R.arrows) world.remove(a.g); } catch (e) { } R.arrows = []; if (G.tick === tick) G.tick = null; if (G.mis && G.mis.fx === fx) G.mis.fx = null;
    try { refreshSkills(); } catch (e) { } }
  function skipAll() { if (!S || S.over) return; markDone(); try { H.saveStars('0-0', 0); } catch (e) { } cleanup(); G.paused = true; runMission('0-1'); }
  window.__TUT = { S: () => S, next: () => { if (S) S.next = true; }, skip: () => skipAll(), feat: () => Object.fromEntries(Object.entries(TU_FEAT).map(([k, f]) => [k, !!f.has()])) };
  return { run, cleanup };
})();
RUN['0-0'] = () => TUT.run();
// ======================================================================
// FIX3 (author's 2nd phone play-test, Nov 20): ride sections without any combat, the 2-3 caravan reworked (FX.convoyCart, 4 announced ambushes),
// boss fights strictly one-on-one, 3-3 bridge reworked (freed captives run across the bridge, the objective is done when they are freed),
// enemy budget per mission (sp()/rein() stop at F3_CAP).
// ======================================================================
import * as F3X from './fx.js?v=1795218616';
import { ground as f3Ground, wall as f3Wall } from './engine.js?v=1795218616';
import * as f3SC from './scenery.js?v=1795218616';
const f3cl = (v, a, b) => Math.max(a, Math.min(b, v));
// ---------- big side alert: where the attack comes from ----------
let f3SideEl = null, f3SideT = 0;
function sideAlert(side, txt, dur = 4.5) {
  if (!f3SideEl) { const s = document.createElement('style'); s.textContent = '@keyframes f3p{0%{opacity:.75;scale:1}100%{opacity:1;scale:1.08}}#f3side{position:absolute;z-index:7;pointer-events:none;display:none;font:900 19px/1.1 system-ui,sans-serif;color:#fff;text-shadow:0 2px 4px #000;padding:9px 16px;border-radius:14px;background:rgba(170,30,15,.8);border:2px solid #ffd27a;white-space:nowrap;animation:f3p .5s ease-in-out infinite alternate}#f3side b{font-size:30px;vertical-align:middle;margin:0 6px}';
    document.head.appendChild(s); f3SideEl = document.createElement('div'); f3SideEl.id = 'f3side'; ($('hud') || document.body).appendChild(f3SideEl); }
  const el = f3SideEl, P0 = { left: ['10px', '', '42%', '', ''], right: ['', '10px', '42%', '', ''], back: ['50%', '', '', '96px', 'translateX(-50%)'], front: ['50%', '', '96px', '', 'translateX(-50%)'] }[side] || ['50%', '', '96px', '', 'translateX(-50%)'];
  el.style.left = P0[0]; el.style.right = P0[1]; el.style.top = P0[2]; el.style.bottom = P0[3]; el.style.transform = P0[4];
  const ar = { left: '◀', right: '▶', back: '▼', front: '▲' }[side] || '!';
  el.innerHTML = side === 'right' ? txt + '<b>' + ar + '</b>' : '<b>' + ar + '</b>' + txt; el.style.display = 'block'; clearTimeout(f3SideT); f3SideT = setTimeout(() => { el.style.display = 'none'; }, dur * 1000); }
function sideOff() { if (f3SideEl) f3SideEl.style.display = 'none'; clearTimeout(f3SideT); }

// ---------- boss fights: one-on-one. Anyone else on the enemy side leaves the field, summoned adds never arrive ----------
function leaveAI(e, dt) { const P = G.player; e.farT = -1e9; e.lt = (e.lt || 0) + dt; const sx = Math.sign(e.x || 1) || 1; e.x += sx * 4.5 * dt; e.z += (P && e.z > P.z ? 2.5 : -2.5) * dt; e.face(sx, 0, dt * 6); e.play('Running_A');
  if (e.lt > 2.6 || Math.abs(e.x) > G.W - .6) { burst(e.x, .6, e.z, 0xc8a070, 1.6, true); e.dead = true; e.gone = true; try { e.remove(); } catch (er) { e.o.visible = false; } } return true; }
let f3L = 0;
function soloTick() { const now = performance.now() / 1000, dt = Math.min(.1, now - f3L); f3L = now; if (!G.paused && !G.flying) for (const e of G.ents) if (e.f3left && !e.dead) leaveAI(e, dt * (G.ts || 1));   // npc units get no AI call from the engine: drive them here
  const M = G.mis, b = G.boss; if (M && M.soloB && (!b || b.dead || b !== M.soloB) && !M.soloOff) { M.soloOff = true; try { $('obj').textContent = '✓ ' + t(M.m.n); } catch (e) { } }   /* QA: "Duel: …" no longer stays after the boss falls */
  if (!M || !M.m || !M.m.boss || !b || b.dead || G.paused || G.flying || !M.started) return;
  if (M.soloB !== b) { M.soloB = b; M.soloOff = false; try { $('obj').textContent = '⚔ ' + t('duelO', { n: t(b.d.name) }); } catch (e) { } }
  /* soldiers: the engine's boss-duel watcher ring (combat agent) makes everyone else stand back and watch — nothing to do here */ }
(function f3loop() { requestAnimationFrame(f3loop); try { soloTick(); } catch (e) { } })();

// ---------- RIDE sections: pure riding — catch up with riders (no fighting: ride up beside one and he drops his captive), golden rings, rocks to steer round ----------
function f3Ring(x, z) { const g = new THREE.Group(); const tor = new THREE.Mesh(new THREE.TorusGeometry(2.1, .14, 8, 32), new THREE.MeshBasicMaterial({ color: 0xffd060, transparent: true, opacity: .9 })); tor.position.y = 2.7; g.add(tor);
  const glow = new THREE.Mesh(new THREE.TorusGeometry(2.1, .36, 8, 32), new THREE.MeshBasicMaterial({ color: 0xffb030, transparent: true, opacity: .25, blending: THREE.AdditiveBlending, depthWrite: false })); glow.position.y = 2.7; g.add(glow);
  const wm = new THREE.MeshStandardMaterial({ color: 0x6b4524, roughness: .9 }); for (const s of [-1, 1]) { const po = new THREE.Mesh(new THREE.CylinderGeometry(.09, .11, 4.8, 6), wm); po.position.set(s * 2.25, 2.4, 0); po.castShadow = true; g.add(po); }
  g.position.set(x, 0, z); world.add(g); return { g, tor, glow, x, z, done: false }; }
function fleeTick(e, dt, g) { const P = G.player; e.farT = -1e9; e.state = 'chase';
  if (e.caught) { e.lt = (e.lt || 0) + dt; const sx = e.sx; e.x += sx * 6 * dt; e.z -= 2.5 * dt; e.rot = Math.atan2(sx, -.5); e.spd = 6.5; e.play('Idle_Combat');
    if (e.lt > 1.6 || Math.abs(e.x) > G.W - .4) { burst(e.x, .8, e.z, 0xc8a070, 2, true); e.dead = true; e.gone = true; try { e.remove(); } catch (er) { e.o.visible = false; } } return true; }
  if (G.freeze || !G.mis.started || !e.go) { e.spd = 0; e.play('Idle'); return true; }
  const ahead = P ? P.z - e.z : 10; const v = e.v0 * (ahead > 22 ? .7 : ahead < 7 ? 1.08 : 1) * FAST();
  e.z -= v * dt; e.x = f3cl(e.x + Math.sin(G.time * .75 + e.seed) * dt * 2.4, -G.W + 1.6, G.W - 1.6); e.rot = Math.PI; e.spd = v; e.play('Idle_Combat');
  if (Math.random() < .25) burst(e.x + rnd(-.4, .4), .2, e.z + .9, 0xc8a070, 1, true);
  if (P && !P.dead && hyp(P.x - e.x, P.z - e.z) < 4.3) { e.ct = (e.ct || 0) + dt; if (e.ct > .2) { e.caught = true; e.sx = e.x > P.x ? 1 : -1; Sfx.pick(); burst(e.x, 1.6, e.z, 0xffe0a0, 2.2); ringFx(e.x, e.z, 2.6, 0xffd060); hintRaw(t('f3_caught'));
      g.freed = true; g.el.style.display = 'none'; for (const c of g.ps) if (!c.dead) { c.saved = true; c.st = 'safe'; c.y = 0; c.x = f3cl(e.x - e.sx * 1.6, -G.W + 1, G.W - 1); c.z = e.z + 1; c.rot = 0; c.play('Cheer', { force: true }); } addGold(20, e.x, e.z); } } else e.ct = 0;
  if (e.z < -199 - f3D) { e.escaped = true; e.dead = true; e.gone = true; try { e.remove(); } catch (er) { e.o.visible = false; } hintRaw(t('f3_esc')); } return true; }
// o = { riders: [[x, z, v]], rings: [[x, z]], rocks: [[x, z, s]], T: seconds (timer star), hint }
let f3D = 0;   // wave4: extra ride length (the 200 m level gave 15-25 s rides; the author wants 60-90 s)
async function rideRun(o) { const R = { rings: [], riders: [] }; f3D = Math.max(0, (o.len || 200) - 200);
  await H.fadeTo(true);
  await H.chapterStart(o.mood, () => { f3Ground(14, -215 - f3D, 'ground1'); f3Wall(-30, 30, 13, 2.2, 1.2, false); f3Wall(-30, 30, -210 - f3D, 4, 1.6); fire(-10.4, -60, 1); fire(10.4, -140, 1); f3SC.ride(G.curCh);
    for (let z = -206; z > -206 - f3D; z -= 13) for (const sd of [-1, 1]) { if (o.shore && sd > 0) continue; try { place(world, 'boulder_01', sd * (G.W + 2.5 + rnd(0, 5)), z + rnd(-4, 4), rnd(1.1, 2.4)); } catch (e) { } }
    if (o.build) o.build(); }, ['gulayim']);
  const p = H.heroSetup('gulayim', 0, 3, G.curCh || 1); for (let i = 0; i < 4; i++) spawn('qiz', (i % 2 ? 1 : -1) * (2.2 + (i >> 1) * 1.8), 7 + (i >> 1) * 2.2);
  H.setHero('gu'); toggleMount(p, true); for (const m of G.ents) if (m.type === 'qiz') toggleMount(m, true);
  p.horseHp = p.horseMax = 1e9; const sp0 = p.speed; p.speed = sp0 * .62; G.mis.safe = { x: 0, z: 5 }; G.mis.noResHud = false;
  R.rings = (o.rings || []).map(([x, z]) => f3Ring(x, z));
  for (const [x, z, s] of o.rocks || []) { try { place(world, 'boulder_01', x, z, s); } catch (e) { } G.colC.push({ x, z, r: s * .8 }); }
  R.riders = (o.riders || []).map(([x, z, v, wt]) => { const f = spawn('askar', x, z, 'npc', true); f.spawnT = 0; f.o.scale.setScalar(f.vs || f.d.scale || 1); toggleMount(f, true); f.rot = Math.PI; f.d = { ...f.d, name: '' }; f.seed = rnd(0, 9); f.v0 = v; f.wait = !!wt; f.farT = -1e9;
    const g = people([['asir', x, z + .8]], { kind: 'ride', guards: [f], auto: true, T: 999, label: 'r_drag' }); f.g3 = g; return f; });   // team npc: driven from G.tick below
  const mk = marker(0, -193 - f3D, 0x66ff88, 2.2); live(); setMusic('calm'); await ban(3); mstart(); for (const f of R.riders) if (!f.wait) f.go = true;
  setMusic('battle'); H.hint('', 7, t(o.hint || 'f3_h_ride'));
  const tm = $('timer'); let T0 = o.T || 0, late = false; if (T0) tm.style.display = 'block';
  const ringNext = () => R.rings.find(r => !r.done && r.z < G.player.z + 1.5);
  G.mis.aim = () => { const P = G.player; const f = R.riders.filter(f => !f.caught && !f.dead).sort((a, b) => hyp(a.x - P.x, a.z - P.z) - hyp(b.x - P.x, b.z - P.z))[0]; if (f) return f; const r = ringNext(); if (r) return { x: r.x, z: r.z }; return { x: 0, z: -193 - f3D }; };
  let lp = ''; const prog = () => { const n = R.riders.length, k = R.riders.filter(f => f.caught).length, rn = R.rings.filter(r => r.done).length; const s = '🐎 ' + t(o.obj) + (n ? '   ⛓ ' + k + '/' + n : '') + (R.rings.length ? '   ◯ ' + rn + '/' + R.rings.length : ''); if (s !== lp) { lp = s; $('obj').textContent = s; } };
  G.tick = dt => { const P = G.player; if (!P) return; prog(); if (!R.cpd && (R.riders.filter(f => f.caught).length >= 2 || (R.rings.length && R.rings.filter(r => r.done).length >= Math.ceil(R.rings.length / 2)))) { R.cpd = 1; cp(); }   /* bench #14: mid-ride checkpoint after the 2nd objective */ for (const f of R.riders) if (!f.dead) { if (!f.go && f.wait && P.z - f.z < 30) f.go = true; fleeTick(f, dt, f.g3); if (o.xMax !== undefined && !f.caught && f.x > o.xMax) f.x = o.xMax; }
    for (const r of R.rings) { if (r.done) continue; const on = r === ringNext(); r.tor.material.opacity = on ? .95 : .5; r.glow.material.opacity = on ? .3 + Math.sin(G.time * 6) * .15 : .06;
      if (hyp(P.x - r.x, P.z - r.z) < 2.3) { r.done = true; Sfx.pick(); burst(r.x, 2.6, r.z, 0xffd060, 2.2); ringFx(r.x, r.z, 2.4, 0xffd060); r.tor.material.color.set(0x7fe08a); r.glow.material.opacity = 0; addGold(5, r.x, r.z); } }
    if (T0 > 0) { T0 -= dt * FAST(); tm.textContent = '⏳ ' + Math.max(0, Math.ceil(T0)); if (T0 <= 0) { late = true; hintRaw(t('f3_late')); tm.style.display = 'none'; } } };
  await until(() => (G.player.z < -189 - f3D && R.riders.every(f => f.caught || f.escaped)) || G.mis.force); mk.remove();
  G.tick = null; G.mis.aim = null; tm.style.display = 'none'; G.mis.flag = !!(o.T ? !late : R.riders.every(f => f.caught)); G.mis.flag2 = R.rings.every(r => r.done);
  setMusic('off'); await wait(.6); for (const m of G.ents) if (m.mounted) toggleMount(m, false); p.speed = sp0;
  const ok = R.riders.every(f => f.caught); await H.bannerShow('', R.riders.length ? t(ok ? 'rideWin' : 'rideMiss') : t('f3_ride_end'), '', 2.2); if (ok || !R.riders.length) addGold(80, p.x, p.z); return ok; }
const RL = [[-5, -34], [5, -58], [-4, -84], [4.5, -110], [-5, -136], [3, -162]];
const RK = [[2.5, -46, 1.6], [-6.5, -72, 1.8], [6.8, -96, 1.7], [-1.5, -122, 1.6], [7, -150, 1.8], [-6, -175, 1.6]];
const f3Zig = (z0, z1, step, xs) => { const L = []; let k = 0; for (let z = z0; z > z1; z -= step, k++) L.push([xs[k % xs.length], z]); return L; };
RUN['2-1'] = async () => { const { HOT } = H.moods; await H.chapterIntro(2, 'nar6', 'ruins'); G.curCh = 1;
  // 440 m steppe chase (~65 s): three riders at once, then two more who bolt when she comes near
  await rideRun({ mood: HOT, obj: 'f3o_2_1', len: 440, riders: [[-3, -22, 5.7], [4, -32, 5.6], [-1, -42, 5.5], [3.5, -170, 6.0, 1], [-4, -275, 6.1, 1]],
    rings: f3Zig(-34, -415, 32, [-5, 5, -4, 4.5, -5, 3]), rocks: f3Zig(-46, -420, 27, [2.5, -6.5, 6.8, -1.5, 7, -6]).map(([x, z], i) => [x, z, 1.6 + (i % 3) * .1]) }); return win(); };
RUN['4-1'] = async () => { const { DAY } = H.moods; await H.chapterIntro(4, 'nar8', 'ruins'); G.curCh = 3;
  // 460 m along the shore (~70 s): the sea closes the right side of the road, driftwood and crates instead of rocks, two pairs of riders driving captives to the boats at the far end
  const SX = 5.2; await rideRun({ mood: DAY, obj: 'f3o_4_1', len: 460, shore: true, xMax: SX,
    build: () => { try { w4Water((SX + 34) / 2 + 1.2, -225, 34 - SX, 480); } catch (e) { } G.colB.push({ x1: SX + 1.6, x2: 40, z1: -480, z2: 14 });
      for (let z = -30; z > -440; z -= 41) { try { w4Crate(SX - .4 + rnd(-.5, .3), z + rnd(-5, 5)); } catch (e) { } }
      for (const [x, z, r] of [[SX + 4.5, -438, .5], [SX + 5, -449, -.3]]) { try { decor('R_arava', x, z, r); } catch (e) { } } },
    riders: [[-6, -24, 5.8], [1, -30, 5.6], [-3, -205, 6.1, 1], [2.5, -212, 6.0, 1]],
    rings: f3Zig(-40, -430, 36, [-7, 1.5, -4, 3, -8, 0]), rocks: f3Zig(-52, -430, 31, [-2, -8.5, 2.5, -5.5, 0.5, -9]).map(([x, z], i) => [x, z, 1.3 + (i % 2) * .3]) }); return win(); };
RUN['7-1'] = async () => { const { DUSK } = H.moods; await H.chapterIntro(7, 'nar11', 'ruins'); G.curCh = 6;
  // 420 m gallop to the enemy camp (~60 s, no fighting on horseback), then everybody dismounts and the chapter's big battle is fought on foot: 150 soldiers in three waves and their captain
  await rideRun({ mood: DUSK, obj: 'f3o_7_1', hint: 'f3_h_ride7', T: 90, len: 420, rings: f3Zig(-28, -400, 27, [-4.5, 4.5, -5, 4, -4, 5, -3, 2]), rocks: f3Zig(-40, -400, 29, [2.5, -6.5, 6.8, -1.5, 7, -6]).map(([x, z]) => [x, z, 1.7]) });
  const fl = G.mis.flag, fl2 = G.mis.flag2; await H.bannerShow('', '⚔ ' + t('w4_dismount'), '', 1.8);
  G.mis.w4foot = true; const r = campRun({ id: '7-1', c: 7, n: 'mn_7_1', camp: { k: 'yurt', n: 150 }, keep: () => { G.mis.flag = fl; G.mis.flag2 = fl2; } }); return r; };

// ---------- 2-3 the caravan to the well: carts roll forward at walking pace, stop only while attackers are close; 4 announced ambushes, each finite ----------
RUN['2-3'] = async () => { const { HOT } = H.moods;
  const p = await gu(2, HOT, H.B[2], [], -13, 1, 3); trailMesh(12, -184);
  const Z0 = -6, LEN = 164, at = s => { const z = Z0 - s; return { x: TR(z), z }; };
  const cv = { s: 0, v: 0, sp: 3.1, pool: 1000, max: 1000, everFailed: false, hitT: 0, x: TR(Z0), z: Z0, carts: [], mem: [], amb: null }; G.mis.cv = cv; G.mis.esc = null;
  for (const [coat, back] of [['bay', 0], ['dun', 8.5]]) { const c = F3X.convoyCart({ coat, scale: 2.1, driver: true, load: true, path: s => at(s - back), speed: 0 }); if (!c) continue; c.auto = false; c.back = back;   // driven from G.tick with game time (fx.js ticks on render only)
    c.cols = [{ x: 0, z: 0, r: 1.5 }, { x: 0, z: 0, r: 1.1 }]; for (const q of c.cols) G.colC.push(q); cv.carts.push(c); }
  const hurt = e => { e.damage = (amt) => { if (G.mis.force) return 0; amt = Math.max(1, Math.round(Math.min(amt, 28) * .4 * ([.6, 1, 1.3][SET.diff] ?? 1))); cv.pool = Math.max(1, cv.pool - amt); cv.hitT = .5; if (cv.pool < cv.max * .25) cv.everFailed = true; num(e, '-' + amt, 'p'); e.flash = .12; if (e.curName !== 'Hit_A') e.play('Hit_A', { once: true, force: true }); return amt; }; e.hp = e.maxHp = 1e9; };
  WALK.slice(0, 6).forEach(([ty, gait], i) => { const side = i % 2 ? 1 : -1, back = 3 + (i >> 1) * 3.2, lat = side * (2.4 + (i % 3) * .5); const q = at(-back); const e = spawn(ty, q.x + lat, q.z, 'ally'); e.d = { ...e.d, follow: false, name: '' }; hurt(e); e.gait = gait; e.back = back; e.lat = lat; e.seed = rnd(0, 9); e.rot = Math.PI;
    e.custom = (e, dt) => { const q = at(cv.s - e.back), tx = q.x + e.lat + Math.sin(G.time * .31 + e.seed) * .35, tz = q.z + Math.sin(G.time * .23 + e.seed * 2) * .4; const dx = tx - e.x, dz = tz - e.z, l = hyp(dx, dz); e.farT = -1e9;
      if (l > (e.mv ? .2 : .7)) { e.mv = 1; const v = Math.min(4.2 * e.gait, l * 2.2); e.x += dx / l * v * dt; e.z += dz / l * v * dt; e.face(dx, dz, dt * 7); e.play(v > 3 ? 'Running_A' : 'Walking_A', { ts: Math.max(.55, v / 1.7) }); }
      else { e.mv = 0; e.play(cv.amb ? (e.seed > 4.5 ? 'Sit_Floor_Idle' : 'Idle') : 'Idle'); if (cv.v > .3) e.face(0, -1, dt * 4); } return true; }; cv.mem.push(e); });
  p.x = cv.x + 4; p.z = Z0 - 4; H.setCP(p.x, p.z); for (const e of G.ents) if (e.type === 'qiz') { e.x = cv.x + (e.x > 0 ? 4.5 : -4); }
  // ambushes: [s on the route, side, wave (dx, dz relative to the lead cart), bark]
  const AMB = [
    { s: 20, side: 'left', key: 'f3_amb_l', w: [['askar', -11, -5], ['askar', -11, 0], ['askar', -11, 4], ['askar', -10.5, -9]] },
    { s: 56, side: 'right', key: 'f3_amb_r', w: [['archer', 10.8, -8], ['archer', 10.8, -2], ['askar', 11, -5], ['askar', 11, 2], ['archer', 10.8, 5]] },
    { s: 96, side: 'back', key: 'f3_amb_b', w: [['wolf', -4, 20], ['wolf', 4, 21], ['wolf', -1, 23], ['wolf', 2, 24]] },
    { s: 134, side: 'front', key: 'f3_amb_f', w: [['heavy', 0, -15], ['askar', -4, -14], ['askar', 4, -14], ['askar', -2, -18], ['askar', 2, -18]], cap: true } ];
  chest(-9.6, -96, 80);
  setMusic('calm'); await ban(3); mstart(); await say([['sa', 'cv_d1'], ['gu', 'cv_d2']]); setMusic('calm'); H.hint('', 6, t('f3_cv_go'));
  let lp = ''; const prog = () => { const s = cv.well ? '🛡 ' + t('w4_well') + ' — ' + t('w4_wave', { n: cv.well, m: 2 }) : cv.amb ? '⚔ ' + t('f3_cv_stop') : '🛒 ' + t('f3o_2_3') + '  ·  ' + t('f3_cv_m', { n: Math.max(0, Math.round(LEN - cv.s)) }); if (s !== lp) { lp = s; H.objective(''); $('obj').textContent = s; } };
  G.mis.aim = () => { if (cv.amb) { const e = near(cv.amb.filter(e => !e.dead)); if (e) return e; } const P = G.player; return hyp(P.x - cv.x, P.z - cv.z) > 14 ? { x: cv.x + 3, z: cv.z } : null; };
  let ai = 0;
  G.tick = dt => { const P = G.player; if (!P) return;
    if (!cv.amb && ai < AMB.length && cv.s >= AMB[ai].s) { const A = AMB[ai++], z0 = cv.z, x0 = cv.x; const es = rein(A.w.map(([ty, dx, dz]) => [ty, f3cl(x0 + dx, -G.W - .5, G.W + .5), z0 + dz]), 'sa', null); cv.amb = es; cv.ambN = ai;
      for (const e of es) { e.f3amb = true; burst(e.x, .6, e.z, 0xd8b070, 2.4); }
      es.slice(0, 2).forEach(e => { if (e.type !== 'archer') e.custom = raidAI(cv.mem); });
      if (A.cap && es[0]) { const c = es[0]; c.maxHp = c.hp = Math.round(c.maxHp * 1.6); try { markHunt(c, 'mb_cap'); } catch (er) { } }
      sideAlert(A.side, t(A.key), 4.5); Sfx.horn(); setMusic('battle'); bark('sa', 'bk_amb'); }
    if (cv.amb && cv.amb.every(e => e.dead)) { cv.amb = null; sideOff(); setMusic('calm'); H.hint('', 4, t('f3_cv_on')); cp(); }
    const lead = at(cv.s), block = !!cv.amb || enemies().some(e => e.custom !== sleepAI && hyp(e.x - lead.x, e.z - lead.z) < 9);
    const want = block || cv.s >= LEN ? 0 : cv.sp * FAST(); cv.v += (want - cv.v) * Math.min(1, dt * 1.6); if (cv.v < .03 && !want) cv.v = 0;
    for (const c of cv.carts) { c.speed = cv.v; c.update(dt); const q = at(c.s - c.back), q2 = at(c.s - c.back + 1), fx = q2.x - q.x, fz = q2.z - q.z, l = hyp(fx, fz) || 1; c.cols[0].x = q.x; c.cols[0].z = q.z; c.cols[1].x = q.x + fx / l * 3; c.cols[1].z = q.z + fz / l * 3; }
    if (cv.carts[0]) cv.s = cv.carts[0].s; else cv.s += cv.v * dt; const q = at(cv.s); cv.x = q.x; cv.z = q.z;
    if ((cv.sndT = (cv.sndT || 0) - dt) <= 0) { cv.sndT = .5; try { Sfx.loop && Sfx.loop('cart', cv.v > .15, { x: cv.x, z: cv.z }); } catch (er) { } }   /* audio: cart loop while it rolls */
    if (cv.hitT > 0) cv.hitT -= dt; else if (!cv.amb && cv.pool < cv.max) cv.pool = Math.min(cv.max, cv.pool + cv.max * .004 * dt); hpBar(cv); prog(); };
  await until(() => (cv.s >= LEN && ai >= AMB.length && !cv.amb) || G.mis.force); if (G.mis.force) for (const e of enemies()) e.die();
  // wave4 / missions audit: the plan's "battle for the well" — once the caravan rests at the well, raiders storm it from both sides at once, twice
  if (!G.mis.force) { const x0 = cv.x, z0 = cv.z; await H.bannerShow('', '🛡 ' + t('w4_well'), t('w4_well2'), 2.2);
    for (let w = 0; w < 2 && !G.mis.force; w++) { const L = []; for (let i = 0; i < 3 + w; i++) { L.push([i % 3 === 2 ? 'archer' : 'askar', -11, z0 - 5 + i * 3]); L.push([i % 3 === 1 ? 'archer' : 'askar', 11, z0 - 4 + i * 3]); }
      const es = rein(L.map(([ty, dx, z]) => [ty, f3cl(x0 + dx, -G.W - .5, G.W + .5), z]), 'sa', w ? null : 'bk_amb'); for (const e of es) { e.f3amb = true; e.state = 'chase'; e.farT = 0; burst(e.x, .6, e.z, 0xd8b070, 2.4); } es.filter(e => e.type !== 'archer').slice(0, 3).forEach(e => { e.custom = raidAI(cv.mem); });
      cv.well = w + 1; sideAlert(w ? 'right' : 'left', t('w4_well_w', { n: w + 1, m: 2 }), 4.5); setMusic('battle'); try { Sfx.loop && Sfx.loop('cart', false); Sfx.stinger && Sfx.stinger('wave'); } catch (er) { } G.mis.aim = aimOf(es);
      await until(() => es.every(e => e.dead) || G.mis.force); sideOff(); cp(); await wait(1.2); } if (G.mis.force) for (const e of enemies()) e.die(); }
  G.tick = null; G.mis.aim = null; sideOff(); try { Sfx.loop && Sfx.loop('cart', false); } catch (er) { } for (const c of cv.carts) c.speed = 0; for (const e of cv.mem) e.custom = e2 => { e2.play('Cheer'); return true; };
  G.mis.flag = !cv.everFailed; setMusic('off'); await wait(.8); await say([['gu', 'cv_d3']]); hpBar(null); await H.victory(); return win(); };

// ---------- 3-3 the bridge: cross, beat the guards — the freed captives RUN back over the bridge (saved at once); then boats land raiders on both banks ----------
function bridgeRun(c, sd) { const W = [{ x: sd * 2, z: -87 }, { x: sd * 1.6, z: -69 }, { x: sd * (G.W - 2 - Math.random() * 1.5), z: -30 + rnd(-2, 2) }]; let i = 0;
  return (e, dt) => { e.farT = -1e9; const w = W[i]; if (!w) { if ((e.ct = (e.ct ?? 0) - dt) <= 0) { e.ct = rnd(1.5, 3); e.play(Math.random() < .5 ? 'Cheer' : 'Idle', { force: true }); } return true; }
    const dx = w.x - e.x, dz = w.z - e.z, l = hyp(dx, dz); if (l < .6) { i++; if (!W[i]) { e.st = 'safe'; e.rot = Math.PI; } return true; }
    const v = (e.type === 'elder' ? 3.8 : 4.8) * FAST(); e.x += dx / l * Math.min(v * dt, l); e.z += dz / l * Math.min(v * dt, l); e.face(dx, dz, dt * 8); e.play('Running_A', { ts: v / 2.6 }); return true; }; }
RUN['3-3'] = async () => { const { DAY } = H.moods;
  const p = await gu(3, DAY, H.B[3], [], -30, 2); G.mis.safe = { x: 0, z: -28 };
  const gG = post([['askar', -2.6, -92, 's'], ['askar', 2.4, -92.6, 's'], ['askar', 5, -96, 'p', 2], ['archer', -5, -99]], { fire: [0, -94], label: 'mb_cap', wake: 12 });
  const cr = people([['asir', -1.4, -99], ['mother', 0, -99.6], ['child', 1.4, -99], ['elder', -.7, -101], ['asir', .9, -101.2]], { kind: 'bound', T: 120, guards: gG, near: 24, label: 'r_bound', face: 0 });
  const cm = post([['archer', 9.4, -55], ['archer', 9.6, -60.5], ['archer', 9.4, -66]], { y: 1.3, label: 'v3c_arch', wake: 0, face: -Math.PI / 2, noHunt: true });
  const boss = cm.es[1]; boss.maxHp = boss.hp = 600; boss.vs *= 1.3; boss.o.scale.setScalar(boss.vs); boss.d = { ...boss.d, name: 'v3c_arch' };
  chest(-9.5, -44, 90);
  setMusic('calm'); await ban(3); mstart(); await say([['gu', 'v3d_33']]); obj(t('f3o_3_3'));
  const mk = marker(0, -88, 0xffd060, 1.8); G.mis.aim = () => (p.z > -86 ? { x: 0, z: -88 } : near(gG.es)); await until(() => p.z < -84 || gG.awake || G.mis.force); mk.remove(); wake(gG); setMusic('battle');
  await clear(gG); await until(() => cr.freed || cr.done || G.mis.force);
  for (const c of cr.ps) if (!c.dead && !c.lostP) { c.saved = true; c.st = 'run'; c.custom = bridgeRun(c, c.x >= 0 ? 1 : -1); } resHud(); cp();
  await wait(1.2); obj('🛡 ' + t('f3_33b')); bark('gu', 'v3b_boat'); sideAlert('back', t('f3_33b'), 4);
  const A = rein([['askar', -9, -91], ['askar', 9, -92], ['wolf', -7, -96], ['askar', 7, -97]]); for (const e of A) burst(e.x, .5, e.z, 0x88aacc, 2.5);
  await until(() => A.filter(e => !e.dead).length <= 1 || G.mis.force);
  const B = rein([['askar', -9.5, -62], ['heavy', 9.5, -63], ['askar', 9.5, -66.5], ['askar', -9.5, -58]]); for (const e of B) burst(e.x, .5, e.z, 0x88aacc, 2.5); wake(cm); bark('gu', 'v3b_arch'); sideAlert('back', t('f3_amb_b'), 3.5);
  G.mis.aim = null; await until(() => enemies().filter(e => e.custom !== sleepAI).length === 0 || G.mis.force); if (G.mis.force) for (const e of enemies()) e.die();
  setMusic('off'); await wait(1); await H.victory(); return win(); };
// ---------- intro fly-over points: the real posted groups / bosses of the running mission (map.js flyFor) ----------
export const INTRO_M = {};
export function flyPoints() { const gs = ((G.mis && G.mis.groups) || []).filter(g => !g.o || !g.o.nofly); if (!gs.length) return null; gs.sort((a, b) => b.z - a.z);
  let pick = gs; if (gs.length > 5) { const keep = new Set(gs.filter(g => g.boss)); keep.add(gs[0]); keep.add(gs[gs.length - 1]); for (let i = 1; keep.size < 5 && i < gs.length - 1; i += Math.max(1, Math.round(gs.length / 4))) keep.add(gs[i]); pick = gs.filter(g => keep.has(g)); }
  return pick.map(g => { const b = g.boss; return { x: b ? b.x : g.x, z: b ? b.z : g.z, g, label: t(g.label), boss: !!b, name: b ? t(g.bossName || b.d.name || g.label) : '', img: g.img || null, chap: !!g.chapBoss, big: b && b.d.heavy }; }); }
export const flyStart = on => { G.flying = !!on; };

// ---------- ARCHERY "SNIPER" MISSIONS (archery agent; the mode itself lives in js/archery.js) ----------
// 3-S Dáryanıń arǵı betindegi lager (after 3-2), 5-S Darbent diywalı (after 5-1, Sárbinaz), 6-S Qashal dárwazası aldında (after 6-1, before the gate siege).
// Stars: win · no alarm (flag) · mission bonus (flag2: 3-S the camp captain too, 5-S no maiden lost, 6-S the western wall too and no beacon).
import { runArchery } from './archery.js?v=1795218616';
for (const [id, after, o] of [['3-S', '3-2', { n: 'ar_n_3', o: 'ar_o_3', fl: 'ar_s_noal', fl2: 'ar_s_cap' }], ['5-S', '5-1', { n: 'ar_n_5', o: 'ar_o_5', fl: 'ar_s_noal', fl2: 's_allq' }], ['6-S', '6-1', { n: 'ar_n_6', o: 'ar_o_6', fl: 'ar_s_noal', fl2: 'ar_s_west' }]])
  if (midx(id) < 0 && midx(after) >= 0) { MLIST.splice(midx(after) + 1, 0, { id, c: +id[0], ty: 'archer', s: ['win', 'flag', 'flag2'], ...o }); RUN[id] = () => archMission(id); }
async function archMission(id) { const run = G.mis.run; mstart(); let r = null; try { r = await runArchery(id, H); } catch (e) { console.error('[archery]', e); }
  if (!G.mis || G.mis.run !== run) return; G.freeze = false; if (!r || !r.ok) return fail();
  G.mis.flag = !!r.noAlarm; G.mis.flag2 = !!r.all; setMusic('off'); await H.victory(); return win(); }
