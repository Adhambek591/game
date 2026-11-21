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
  const obj0 = $('obj').textContent; G.freeze = false; setBoss(e); setMusic('boss'); H.objective(''); $('obj').textContent = '⚔ ' + t('duelO', { n: t(o.name) });
  let last = P.hp, hit = false, d0 = G.stats.deaths; const t0 = G.time, prev = G.tick;
  G.mis.aim = () => e.dead ? null : e;
  G.tick = dt => { if (prev) prev(dt); if (P.hp < last - .5 || G.stats.deaths > d0) hit = true; last = P.hp;
    for (const u of [P, e]) { if (!u || u.dead) continue; const dx = u.x - o.x, dz = u.z - o.z, l = hyp(dx, dz); if (l > R - .4) { u.x = o.x + dx / l * (R - .4); u.z = o.z + dz / l * (R - .4); } }
    for (const c of ring.crowd) { if (c.dead) continue; if (c.flee) { c.x += Math.sin(c.rot + Math.PI) * 4.5 * dt; c.z += Math.cos(c.rot + Math.PI) * 4.5 * dt; c.play('Running_A'); if (hyp(c.x - o.x, c.z - o.z) > R + 22) { c.o.visible = false; c.dead = c.gone = true; } continue; }
      if ((c.cT = (c.cT ?? rnd(0, 2)) - dt) <= 0) { c.cT = rnd(1.4, 3.4); c.play(CHEER[(Math.random() * 3) | 0], { force: true }); } c.rot = Math.atan2((e.dead ? o.x : (e.x + P.x) / 2) - c.x, (e.dead ? o.z : (e.z + P.z) / 2) - c.z); }
    for (const c of ring.keep) { if (c.dead || c.team !== 'npc' || c.wasEnemy) continue; if ((c.cT = (c.cT ?? rnd(0, 2)) - dt) <= 0) { c.cT = rnd(1.5, 3.5); c.play(Math.random() < .45 ? 'Cheer' : 'Idle', { force: true }); } c.rot = Math.atan2(P.x - c.x, P.z - c.z); } };
  await until(() => e.dead || e.yield || G.mis.force);
  if (G.mis.force && !e.dead && !o.nonLethal) e.die(); setBoss(null); G.mis.aim = null; try { if (M.winning) H.objective(''); else $('obj').textContent = obj0 || t(G.mis.m.o); } catch (er) { }   /* QA: the duel line no longer stays; a final duel (beforeWin) clears it instead of re-showing the mission text */
  if (e.yield) { e.team = 'npc'; e.custom = null; e.play('Sit_Floor_Idle', { force: true }); } else if (!e.dead) e.die();
  const clean = !hit; if (!clean) M.duelClean = false; else if (M.duelClean === undefined) M.duelClean = true;
  Sfx.big(); flash(.3); hintRaw(t(clean ? 'duelClean' : 'duelWon'));
  for (const c of ring.keep) if (!c.wasEnemy && !c.dead) c.play('Cheer', { force: true });
  await wait(1.4); const es = duelEnd(ring, o.after); G.tick = (G.tick === prev || !ring.crowd.some(c => c.flee && !c.dead)) ? prev : G.tick;
  if (o.after !== 'fight' && ring.crowd.some(c => c.flee)) { const tk = G.tick; await wait(3); if (G.tick === tk) G.tick = prev; }
  else G.tick = prev;
  setMusic(es.length ? 'battle' : 'calm'); cp(); return { clean, time: G.time - t0, foe: e, es }; }
