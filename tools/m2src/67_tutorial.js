// ---------- TUTORIAL 0-0 "Shınıǵıw maydanı" (training field, before the war) ----------
// Gúlayım trains the forty maidens on the river field by Miywali. One mechanic per step, advance only on success, coins + praise per step.
// Steps that need a combat feature (roll, block, parry, jump, lock-on, sniper bow) are feature-detected at run time (TU_FEAT) and skipped if missing.
// Owns: MLIST entry '0-0' (unshifted here), RUN['0-0'], window.__TUT (test/debug hook). Stars: win | flag (final duel without a hit) | flag2 (all optional challenges).
import { yurt as tuYurt, banner as tuBanner, ground as tuGround, wall as tuWall, water as tuWater, sparks as tuSparks, camOverride as tuCam } from './engine.js?v=1795173000';
import * as tuSCN from './scenery.js?v=1795173000';
import { runArchery as tuRunArch, LEVELS as tuArchLv } from './archery.js?v=1795173000';
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
