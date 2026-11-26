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
export function runMission(id) { G.noAmulet = false;   /* set again by 1-1 until the mother scene */
  const i = midx(id), m = MLIST[i]; if (!m) return runMission('0-1');
  try { resCleanup(); } catch (e) { }
  G.mis = { id, m, c: m.c, t0: G.time, d0: 0, flag: false, flag2: false, run: (G.misRun = (G.misRun || 0) + 1) }; G.flying = false; try { hpBar(null); if (stEl) stEl.style.opacity = 0; storm.sv = storm.to = null; $('timer').style.display = 'none'; } catch (e) { }
  try { localStorage.setItem('qq_last', id); } catch (e) { }
  return (id === '0-0' ? Promise.resolve() : w4Ensure()).then(() => RUN[id]());
}
// bench #1 lazy load: characters that the title and the tutorial do not need are fetched before the first other mission, with a progress line (sizes in KB)
const W4DEF = { allayar: 1069, surtaysha: 1075, wolf: 622, wolfman: 594, mother: 568, archer: 616, mage: 622 }; let w4EnsP = null;
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
  G.mis.winning = true; if (G.mis.beforeWin) { const f = G.mis.beforeWin; G.mis.beforeWin = null; await f(); }
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

