import { G, $, T, THREE, loadAssets, start, setMood, clearLevel, ground, yurt, house, wall, debris, crate, banner, fire, ravine, gate, marker, makePlayer, refreshSkills, spawn, enemies, hitCircle, telegraph, A, woodMat, decor, water, ghostRider, ensureReal, hintRaw, toggleMount, SAVE, saveGame, UPG, addGold, hudGold, ADS, SET, saveSet, shoot, ringFx, burst, num, flash, setBoss, wait, until, qte, world, breakable, potionAI, soulToAmulet } from './engine.js?v=1795769147';
import { t, setLang, lang, L, has } from './i18n.js?v=1795769147';
import { place } from './env.js?v=1795769147';
import * as SC from './scenery.js?v=1795769147';
import { Sfx, initAudio, setMusic, duck, setVol, playTitle, VOL, setVolume, playVoice, waitVoice, preloadVoice, bindMedia, unbindMedia } from './audio.js?v=1795769147';
import { initMap, flyFor, endStars, credits, saveStars } from './map.js?v=1795769147';
import { initMissions, runMission } from './missions.js?v=1795769147';
const rnd = (a, b) => a + Math.random() * (b - a), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const qs = new URLSearchParams(location.search);
T.son.follow = true;
const NIGHT = { bg: 0xd08a5a, fog: [40, 110], hemi: [0xffd2a8, 0x6a4630, 1.9], sun: [0xffb878, 4.2], sunDir: [-.8, .5, -.5], exp: 1.15, fireI: 20, ember: 0xffa040, emberA: .8, dawn: true };
const DAY = { bg: 0xc9d8e0, fog: [50, 130], hemi: [0xf2ecd8, 0x6a5232, 1.9], sun: [0xffe6b8, 4.6], sunDir: [.6, 1, .45], exp: 1.05, fireI: 10, ember: 0x5a5550, emberA: .45, ash: true };
const PORT = { gu: 'p_gu', al: 'p_al', su: 'p_su', mo: 'p_mo', sa: 'p_sa', qa: 'p_qa', ba: 'p_ba', ot: 'p_ot', qd: 'p_qd', ja: 'p_ja', qu: 'p_qu', qg: 'p_qg', ay: 'p_ay', ays: 'md_aysuliw', aqm: 'md_aqmaral', jup: 'md_jupar', ms: null };   /* STORY: no messenger portrait yet (keyart showed Gúlayım while the messenger spoke) -> plain frame */

// ---------- UI helpers ----------
const objective = (k, v) => { const o = $('obj'), s = k ? t(k, v) : ''; if (o.textContent !== s) o.textContent = s; };
let hintTo; function hint(k, dur = 5, raw) { { const m = { h_move: 'joy', h_attack: 'bA', h_dodge: 'bD', h_skill: 'b1', h_ulti: 'b2' }[k]; document.querySelectorAll('.tutor').forEach(e => e.classList.remove('tutor')); if (m && $(m)) { $(m).classList.add('tutor'); setTimeout(() => $(m) && $(m).classList.remove('tutor'), dur * 1000); } } const h = $('hint'), s = (raw || t(k)).replace(TOUCH ? /\s*\([^)]*WASD\)/ : /$^/, ''); if (h.textContent !== s || !h.classList.contains('show')) h.textContent = s;  /* same text already up: only extend it */ h.classList.add('show'); clearTimeout(hintTo); hintTo = setTimeout(() => h.classList.remove('show'), dur * 1000); }
function bannerShow(a, b, c, dur = 3) { const fly = flyFor(a); if (fly) return fly.then(() => bannerShow(a, b, c, dur)); $('hint').classList.remove('show'); $('ban1').textContent = a || ''; $('ban2').textContent = b || ''; $('ban3').textContent = c || ''; const e = $('ban'); e.classList.add('show'); const hold = !!(G.mis && !G.mis.started && G.player); if (hold) G.freeze = true; return new Promise(r => setTimeout(() => { e.classList.remove('show'); if (hold) G.freeze = false; r(); }, dur * 1000)); }  /* start banner: nobody moves (the player cannot run past the first gate / wake a camp early) */
function fadeTo(on) { const f = $('fade'); f.dataset.l = t('loading'); f.classList.toggle('in', on); return new Promise(r => setTimeout(r, 550)); }
function setHero(k) { $('pport').style.backgroundImage = `url(./assets/img/${PORT[k]}.jpg)`; $('pname').textContent = t('n_' + k); }
function dialog(lines) {
  return new Promise(res => {
    const was = G.paused; G.paused = true; let i = 0; const d = $('dlg'); d.classList.add('on'); $('dtap').textContent = t('tap');
    const show = () => { const [who, key] = lines[i]; $('dport').style.backgroundImage = PORT[who] ? `url(./assets/img/${PORT[who]}.jpg)` : 'none'; $('dname').textContent = t('n_' + who); $('dline').textContent = t(key); };
    let lock = performance.now() + 350;
    const next = () => { if (performance.now() < lock) return; lock = performance.now() + 250; Sfx.ui(); if (++i >= lines.length) { d.classList.remove('on'); d.onpointerdown = null; G.onEnter = null; G.paused = was; res(); } else show(); };
    d.onpointerdown = e => { e.preventDefault(); next(); }; G.onEnter = next; show();
  });
}
// NO VIDEOS (author, Nov 26): every story slot is a still picture (slow pan) + the narration line as on-screen text in the chosen language + the narrator's voice
// (assets/audio/<narKey>.mp3, plays whenever the file exists). The slot ends when the voice is over, or after a reading time when a line has no recording.
// Skip (button / Enter / tap): ends it; it only counts once the slot really runs (a double tap from the lore card must not kill it). `key` is kept for call sites only.
const STILL = new Set(['nar1', 'nar2', 'nark1', 'nar3m', 'nar4', 'nar5', 'nar6', 'nar7', 'nar8', 'nar9', 'nar10', 'nar11', 'nar12']);
function cutscene(key, narKey, still) {
  return new Promise(async res => {
    const fast = qs.get('fast'); if (!fast) await waitVoice(25);
    if (narKey && STILL.has(narKey)) still = 'st_' + narKey;   /* frames from the author-approved clips (docs/approved_video_frames) */
    const c = $('cut'), st = c.querySelector('.still'), txt = narKey ? t(narKey) : ''; duck(true); c.classList.add('on'); $('fade').classList.remove('in');
    $('cnar').textContent = txt; $('cnar').style.display = txt ? 'block' : 'none'; $('cskip').textContent = t('skip');
    st.style.backgroundImage = `url(./assets/img/${still || 'keyart'}.jpg)`; st.classList.remove('kb'); void st.offsetWidth; st.classList.add('kb');
    const readS = Math.min(16, Math.max(5, txt.length * .062));   /* reading time for a line without a recording */
    let voice = null, done = false, to = 0, t0 = performance.now();
    const fin = () => { if (done) return; done = true; clearTimeout(to); if (voice && voice.playing) voice.stop(); c.classList.remove('on'); st.classList.remove('kb'); duck(false); G.onEnter = null; res(); };
    if (fast) to = setTimeout(fin, 300);
    else if (narKey) { preloadVoice(narKey); to = setTimeout(fin, (readS + 22) * 1000);   /* safety: never hang on a file that does not load */
      setTimeout(() => { if (done) return; const vt = performance.now(); voice = playVoice(narKey); voice.done.then(() => { if (done) return; const spoke = (performance.now() - vt) / 1000; clearTimeout(to); to = setTimeout(fin, spoke > 2 ? 900 : Math.max(0, readS * 1000 - (performance.now() - t0))); }); }, 700); }
    else to = setTimeout(fin, 4500);
    const skip = () => { if (performance.now() - t0 < 900) return; fin(); };
    $('cskip').onclick = skip; G.onEnter = skip;
  });
}
const reach = (x, z, r) => until(() => (G.mis && G.mis.force) || (G.player && (r >= 4 ? G.player.z < z + r : Math.hypot(G.player.x - x, G.player.z - z) < r)));
async function goTo(z) { const m = marker(0, z - 3, 0xffd060, 2.2); await until(() => (G.player && G.player.z < z) || (G.mis && G.mis.force)); m.remove(); } // direction arrow: missions.js dirTick
async function victory() { Sfx.win ? Sfx.win() : Sfx.power(); flash(.4); await bannerShow('', t('victory'), '', 2.6); }
function potionSoldier(x, z) { const e = spawn('askar', x, z); e.custom = potionAI; e.potion = true; return e; }
async function wave(list) { const es = list.map(([ty, x, z]) => ty === 'potion' ? potionSoldier(x, z) : spawn(ty, x, z)); await until(() => es.every(e => e.dead)); return es; }
let checkpoint = { x: 0, z: 2 };
function setDeath() {
  G.onPlayerDeath = () => { G.stats.deaths++; setTimeout(() => { $('dh').textContent = t('fallen'); $('dretry').textContent = t('retry'); $('drevive').textContent = t('adRevive'); $('drevive').onclick = async () => { if (!(await ADS.rewarded())) return; const p = G.player; $('dead').classList.remove('on'); p.dead = false; p.hp = p.maxHp; p.act = null; p.iframe = 3; p.play('Idle', { force: true }); G.stats.deaths--; G.paused = false; }; $('dead').classList.add('on'); G.paused = true; }, 900); };
  $('dretry').onclick = () => { const p = G.player; $('dead').classList.remove('on'); p.dead = false; p.hp = p.maxHp; p.x = checkpoint.x; p.z = checkpoint.z; p.act = null; p.y = 0; p.leaping = false; p.iframe = 2; p.play('Idle', { force: true }); if (G.boss && !G.boss.invuln && !G.boss.dead) { let df = 0; try { df = window.__W4 ? __W4.defi((G.mis && G.mis.m && G.mis.m.c) || 0) : 0; } catch (e) { } G.boss.hp = Math.min(G.boss.maxHp, G.boss.hp + G.boss.maxHp * Math.min(.5, .04 + .045 * df) * [0, 1, 2][SET.diff]); }   /* balance 2c: a retry gives the boss 4 % back at >= 85 % of the chapter cap, up to 50 % when far under-upgraded (author: under-upgraded should lose) */ G.paused = false; };
}
function street(z0, z1, burnt, fireEvery) {
  let i = 0; for (let z = z0; z > z1; z -= rnd(7.5, 9.5), i++) for (const s of [-1, 1]) { const x = s * (G.W + rnd(5.5, 7.5)); const b = burnt && Math.random() < .8; if (Math.random() < .55) yurt(x, z + rnd(-1, 1), b, false); else house(x + s * .5, z + rnd(-1, 1), rnd(4.5, 6), rnd(4, 6), rnd(2.8, 3.8), b); if ((i + (s > 0 ? 1 : 0)) % fireEvery === 0) fire(s * (G.W + 1.2), z - 3, rnd(1.1, 1.7)); if (Math.random() < .5) debris(s * (G.W - rnd(.5, 2)), z - 4.5, 3); }
  for (const s of [-1, 1]) for (let z = z0 + 6; z > z1; z -= 24) wall(s * (G.W + 13), s * (G.W + 9), z - 12, 4, 26, false);
}

function skirmish(x, z) { const a = spawn('son', x - 1, z, 'ally'), b = spawn('askar', x + 1, z); a.bg = b.bg = true; a.mate = b; b.mate = a; a.hp = a.maxHp = 1e6; b.hp = b.maxHp = b.maxHp * 4; return [a, b]; }
// ---------- PROLOG ----------
function buildProlog() {
  ground(14, -132, 'ground2'); wall(-30, 30, 13, 3, 1.6); street(2, -84, false, 2);
  yurt(-7, -18); crate(6, -20); crate(7.2, -21.2); crate(-4, -36); debris(8, -40, 4, true); yurt(7.5, -50); crate(-8, -56); crate(-7, -57.5); banner(-9.5, -44); banner(9.5, -44);
  for (const s of [-1, 1]) { wall(s * 22, s * 10.5, -86, 4.5, 1.4); house(s * 17, -100, 6, 8, 4.2); house(s * 17.5, -113, 7, 7, 3.6); fire(s * 9.5, -92, 1.8); fire(s * 10, -112, 2.0); banner(s * 7, -88, 0x2a4a8a); }
  decor('R_horse', -9.8, -14, 1.2); decor('R_horse', 10.2, -38, -1.9); decor('R_arava', 9.6, -8, .4); decor('R_arava', -9.4, -58, 2.6); decor('R_horse', -10, -76, .9);
  wall(-30, 30, -122, 5, 1.6); fire(0, -119, 2.4); fire(-3, 6, 1.2); fire(9, -8, 1.3); fire(-9.5, -30, 1.5); fire(9.5, -62, 1.6); fire(-9, -70, 1.4);
}
async function prolog() {
  await fadeTo(true); await lore('lore0'); clearLevel(); setMood(NIGHT); G.emberDown = false; buildProlog(); setMusic('off'); G.stats.deaths = 0;
  const p = makePlayer('allayar', 0, 3); G.sk[1].on = true; G.sk[2].on = true; G.sk[3].on = true; refreshSkills(); setHero('al'); setDeath(); checkpoint = { x: 0, z: 3 }; objective('');
  $('hud').classList.add('on'); G.paused = true;
  await cutscene('v1', 'nar1'); G.paused = false; setMusic('battle'); bannerShow(t('ch0'), t('ch0n'), '', 3);
  spawn('son', -2.8, 1); spawn('son', 2.8, 1); skirmish(-9, -8); skirmish(9, -24); skirmish(-9.5, -44); skirmish(9, -66);
  await wait(1.2); await dialog([['al', 'd_al1']]);
  objective('o_move'); hint('h_move', 7); const g1 = gate(-42); const mk = marker(0, -13);
  await reach(0, -13, 4); mk.remove(); objective('o_defend'); hint('h_attack', 7);
  await wave([['askar', -5, -25], ['askar', 5, -26], ['askar', 0, -29], ['askar', -8, -31]]);
  hint('h_skill', 7);
  await wave([['askar', -6, -30], ['askar', 6, -30], ['wolf', 0, -35], ['wolf', -9, -27], ['wolf', 9, -27], ['askar', 2, -37]]);
  g1.open(); checkpoint = { x: 0, z: -34 }; p.hp = Math.min(p.maxHp, p.hp + 250); objective('o_square'); const g2 = gate(-78);
  await goTo(-52); objective('o_camel'); hint('h_dodge', 9); setMusic('boss');
  const cam = spawn('camel', 0, -64); setBoss(cam); spawn('askar', -6, -66); spawn('askar', 6, -66); spawn('archer', -9, -72); spawn('archer', 9, -72);
  await until(() => cam.dead && enemies().length === 0); setBoss(null); setMusic('battle'); g2.open(); checkpoint = { x: 0, z: -72 }; p.hp = p.maxHp;
  objective('o_square'); const mk2 = marker(0, -94); await reach(0, -94, 4.5); mk2.remove();
  const su = spawn('surtaysha', 0, -103); su.rot = 0; setBoss(su); G.noDeath = true; setMusic('boss'); Sfx.horn();
  await wait(.8); await dialog([['su', 'd_su1'], ['al', 'd_al2']]); objective('o_duel');
  let tm = 0; await until(() => { tm += 1 / 60; return tm > 20 || p.hp < p.maxHp * .3; });
  await dialog([['su', 'd_su2']]); objective('o_resist');
  for (const e of G.ents) if (e.team === 'ally' && e !== p) e.die(); G.tele.forEach(o => o.dead = true);
  G.freeze = true; p.x = clamp(p.x, -2.5, 2.5); p.z = clamp(p.z, -100.5, -97); su.x = p.x; su.z = p.z - 3.4; su.rot = 0;  /* the clinch happens mid-arena, never against the wall */ p.rot = Math.PI; p.act = null; p.y = 0; p.play('Block', { force: true }); su.play('2H_Melee_Idle', { force: true });
  await qte(qs.get('fast') ? 1 : 6.5, 36, 5.5);
  flash(.9); Sfx.big(); G.shake = 1; p.play('Death_A', { once: true, force: true }); await wait(1.3);
  G.freeze = false; await dialog([['al', 'd_al3']]);
  await fadeTo(true); setBoss(null); $('hud').classList.remove('on'); setMusic('off'); G.paused = true;
  await cutscene('v2', 'nar2'); await lore('lore_sur'); try { localStorage.setItem('qq_prog', 'm1'); } catch (e) { }
  return mission1();
}

// ---------- 1-BOB ----------
function buildMission() {
  ground(14, -160, 'ground1'); ground(-168, -205, 'ground1'); const rv = ravine(-160, -168); wall(-30, 30, 13, 3, 1.6);
  street(2, -150, true, 3); street(-172, -200, true, 4);
  debris(-6, -8, 5, true); debris(7, -14, 5, true); yurt(-7.5, -40, true); debris(6, -47, 5, true); crate(-3, -52); debris(-8, -68, 4, true); yurt(8, -74, true); debris(0, -86, 4);
  decor('R_arava', -9.5, -22, .6, true); decor('R_arava', 9.8, -60, 2.4, true); decor('R_horse', 9.6, -92, -1.6); decor('R_horse', 10.4, -106, -1.4);
  // otxona
  house(11.5, -100, 7, 9, 3.6, true); fire(11, -100, 2.2, 3.6); fire(13, -97, 1.6, 3.6); fire(-9, -96, 1.3);
  // qo'rg'on xarobasi
  for (const s of [-1, 1]) { wall(s * 13, s * 5, -122, 4.6, 1.4); banner(s * 4, -121, 0x1a1a1a); fire(s * 9.5, -128, 1.5); fire(s * 9.5, -144, 1.5); }
  
  // singan ko'prik
  for (const z of [-159, -169]) for (let x = -1.6; x <= 1.6; x += .8) { const m = new THREE.Mesh(new THREE.BoxGeometry(.7, .15, 2.4), (A.props.B_house ? woodMat() : new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 1 }))); m.position.set(x, .08, z + (z > -165 ? -.6 : .6)); m.rotation.y = rnd(-.15, .15); m.castShadow = m.receiveShadow = true; world.add(m); }
  fire(-6, -4, 1.1); fire(8, -26, 1.2); fire(-9, -56, 1.3); fire(5, -64, 1.0);
  return rv;
}
function qashqirAI(e, dt) {
  const P = G.player; if (!P || P.dead) return false; e.leapCd = (e.leapCd ?? 5) - dt; e.phase = e.phase || 1;
  const go = () => { e.leap = { t: 0, wind: e.phase >= 3 ? .55 : .9, x: P.x, z: P.z, x0: e.x, z0: e.z }; e.clearTele(); e.tele = telegraph(P.x, P.z, 3.3, e.leap.wind + .35); e.state = 'chase'; e.play('Jump_Full_Long', { once: true, force: true, ts: 1.1 }); };
  if (e.leap) { const Lp = e.leap; Lp.t += dt; if (Lp.t < Lp.wind) { e.face(Lp.x - e.x, Lp.z - e.z, dt * 8); return true; } const u = clamp((Lp.t - Lp.wind) / .35, 0, 1); e.x = Lp.x0 + (Lp.x - Lp.x0) * u; e.z = Lp.z0 + (Lp.z - Lp.z0) * u; e.y = Math.sin(u * Math.PI) * 3; if (u >= 1) { e.y = 0; e.tele = null; hitCircle(Lp.x, Lp.z, 3.3, () => rnd(55, 70), 'enemy', e); ringFx(Lp.x, Lp.z, 3.6, 0xaa44ff); Sfx.big(); G.shake = .6; e.leap = null; if (--e.chain > 0) go(); else { e.leapCd = e.phase >= 3 ? 4.5 : 6.5; e.state = 'recover'; e.tm = .7; } } return true; }
  if (e.howl > 0) { e.howl -= dt; return true; }
  if (e.phase < 2 && e.hp < e.maxHp * .5) { e.phase = 2; e.howl = 1.4; e.clearTele(); e.state = 'chase'; e.play('Cheer', { once: true, force: true }); Sfx.howl(); e.spdMul = 1.25; e.dmgMul = 1.15; for (const m of e.mats) m.color.set(0x7a3a8a); burst(e.x, 2, e.z, 0x8822cc, 5); return true; }  /* phase 2: no wolf adds — Gulayim fights Qashqir alone */
  if (e.phase < 3 && e.hp < e.maxHp * .2) { e.phase = 3; e.howl = 1.1; e.clearTele(); e.state = 'chase'; e.play('Cheer', { once: true, force: true }); Sfx.howl(); e.leapCd = 0; burst(e.x, 2, e.z, 0xcc2244, 5); return true; }
  if (e.leapCd <= 0 && e.state === 'chase') { e.chain = e.phase >= 3 ? 3 : 1; go(); return true; }
  return false;
}
async function mission1(from) {
  await fadeTo(true); await ensureReal(['qashqir', 'sarbinaz']); clearLevel(); setMood(DAY); G.emberDown = true; buildMission(); setMusic('off'); G.freeze = false; G.stats.deaths = 0;
  const p = makePlayer('gulayim', 0, 3); for (let i = 0; i < 5 + SAVE.up.squad; i++) spawn('qiz', (i % 2 ? 1 : -1) * (1.5 + (i >> 1) * 1.6), 5 + (i >> 1) * 1.2); G.sk[1].on = true; refreshSkills(); setHero('gu'); setDeath(); checkpoint = { x: 0, z: 3 }; objective(''); setBoss(null);
  $('hud').classList.add('on'); G.paused = true; const star = { kids: 0, stable: false, boss: false };
  // bolalar
  const kids = [[-9.5, -12], [9.5, -34], [-9.5, -62]].map(([x, z]) => ({ e: spawn('child', x, z, 'npc'), m: marker(x, z, 0x66ff88, 1), x, z, found: false })); kids.forEach(k => { k.e.rot = 0; k.e.play('Sit_Floor_Idle'); });
  let door = null, doorHp = 0, doorT = 0, lastAct = null, bk = null;
  G.tick = dt => {
    for (const k of kids) if (!k.found && Math.hypot(p.x - k.x, p.z - k.z) < 2.4) { k.found = true; star.kids++; k.m.remove(); k.e.play('Cheer'); Sfx.pick(); hint('', 3, t('childFound') + ' ' + star.kids + '/3'); }
    if (door) { doorT -= dt; $('timer').textContent = Math.max(0, Math.ceil(doorT)); doorHp = bk ? bk.hp : 0; }
  };
  G.dbg = () => ({ doorHp, doorT, door: !!door });
  if (!from) { await lore('lore1'); await cutscene('v3', 'nar3m'); }
  $('fade').classList.remove('in'); G.paused = false; setMusic('calm'); bannerShow(t('ch1'), t('ch1n'), '', 3);
  const skip = z => { p.x = 0; p.z = z; G.cam.z = z; checkpoint = { x: 0, z }; G.sk[2].on = G.sk[3].on = G.sk[4].on = true; refreshSkills(); };
  if (!from) {
    objective('o_mother'); hint('h_move', 6); const g0 = gate(-30); const mo = spawn('mother', 2, -23, 'npc'); mo.rot = 0; const mm = marker(2, -23, 0xffd060, 1.6);
    await reach(2, -23, 3.6); mm.remove(); mo.face(p.x - mo.x, p.z - mo.z); p.act = null; p.play('Idle');
    await dialog([['mo', 'd_mo1'], ['gu', 'd_gu1'], ['mo', 'd_mo2'], ['mo', 'd_mo3'], ['gu', 'd_gu2']]); Sfx.power(); flash(.3);
    g0.open(); checkpoint = { x: 0, z: -26 }; objective('o_guards'); const g1 = gate(-60); setMusic('battle');
    await goTo(-36); hint('h_attack', 5);
    await wave([['askar', -5, -46], ['askar', 5, -47], ['askar', 0, -50], ['archer', -8, -54], ['archer', 8, -54]]);
    G.sk[2].on = G.sk[3].on = true; refreshSkills(); hint('h_skill', 8);
    await wave([['askar', -6, -48], ['askar', 6, -48], ['askar', 0, -54], ['wolf', -9, -44], ['wolf', 9, -44], ['archer', 0, -57]]);
    g1.open(); checkpoint = { x: 0, z: -52 }; p.hp = Math.min(p.maxHp, p.hp + 200); objective('o_go'); setMusic('calm'); const ms = marker(0, -68);
    await reach(0, -68, 4); ms.remove(); const sa = spawn('sarbinaz', 5, -60, 'ally'); sa.rot = Math.PI;
    await wait(.7); await dialog([['sa', 'd_sa1'], ['gu', 'd_gu3']]);
    G.sk[4].on = true; G.ulti = 100; refreshSkills(); hint('h_ulti', 9); objective('o_horde'); const g2 = gate(-86); setMusic('battle');
    await wave([['askar', -6, -74], ['askar', 6, -74], ['askar', -3, -79], ['askar', 3, -79], ['askar', 0, -82], ['wolf', -9, -70], ['wolf', 9, -70], ['wolf', 0, -62], ['archer', -8, -83], ['archer', 8, -83], ['askar', -8, -62], ['askar', 8, -62]]);
    g2.open(); checkpoint = { x: 0, z: -78 }; p.hp = p.maxHp;
  } else skip(from === 'boss' ? -118 : -88);
  if (from !== 'boss') {
    objective('o_stable'); const g3 = gate(-112); await goTo(-90);
    await wave([['mage', 4, -104], ['askar', 0, -100], ['askar', -4, -103], ['askar', 6, -96], ['wolf', -8, -98]]);
    door = new THREE.Mesh(new THREE.BoxGeometry(.35, 2.6, 2.2), new THREE.MeshStandardMaterial({ color: 0x5a3a1c, roughness: 1 })); door.position.set(7.8, 1.3, -100); door.castShadow = true; world.add(door); bk = breakable({ mesh: door, x: 7.8, z: -100, hp: 420, dmg: { slam: 120, any: 60 }, barY: 3.4, rad: 1.4, showNum: true, dust: 0x6a4a2a, spark: 0xffcc88, chunks: 16 }); const dm = marker(6.4, -100, 0xff8844, 1.5);
    doorHp = 420; doorT = 45; objective('o_door'); $('timer').style.display = 'block'; Sfx.horn();
    await until(() => bk.dead || doorT <= 0); star.stable = bk.dead; $('timer').style.display = 'none'; if (!bk.dead) bk.shatter(); dm.remove(); const dp = door.position; door = null; burst(dp.x, 1.5, dp.z, 0xffcc88, 4);
    [[5.6, -99], [5.2, -101], [4.4, -100]].forEach(([x, z], i) => { const c = spawn(i ? 'child' : 'mother', x, z, 'npc'); c.rot = -Math.PI / 2; c.play('Cheer'); });
    Sfx.pick(); await bannerShow('', t(star.stable ? 'saved' : 'savedLate'), '', 2.4); g3.open(); checkpoint = { x: 0, z: -106 }; p.hp = p.maxHp;
  }
  objective('o_boss'); const g4 = gate(-150); setMusic('calm'); await goTo(-126);
  const q = spawn('qashqir', 0, -140); q.rot = 0; q.custom = qashqirAI; q.spawnT = 0; q.o.scale.setScalar(T.qashqir.scale); G.freeze = true; p.act = null; p.play('Idle'); await wait(.6);
  await dialog([['qa', 'd_qa1'], ['gu', 'd_gu4']]); G.freeze = false; setBoss(q); setMusic('boss'); Sfx.howl(); checkpoint = { x: 0, z: -128 }; const d0 = G.stats.deaths;
  await until(() => q.dead); soulToAmulet(q); star.boss = G.stats.deaths === d0; for (const e of enemies()) e.die(); setMusic('off'); await wait(1.2); await victory();
  await fadeTo(true); G.paused = true; await cutscene('v4', 'nar4'); G.paused = false; setBoss(null);
  G.sk[5].on = true; refreshSkills(); Sfx.power(); flash(.5); setMusic('calm'); await bannerShow(t('newpower'), t('wolf'), t('wolfDesc'), 3.6);
  g4.open(); checkpoint = { x: 0, z: -146 }; p.hp = p.maxHp; objective('o_gap'); hint('o_gap', 9); G.ravineAhead = true; const mf = marker(0, -180, 0xbfe3ff, 2);
  await until(() => p.z < -169 && !p.leaping); G.ravineAhead = false; objective('o_trail'); await reach(0, -180, 4.5); mf.remove();
  await fadeTo(true); G.paused = true; $('hud').classList.remove('on'); await cutscene(null, 'nar5', 'ruins'); await chapterEnd(1, [star.kids >= 3, star.stable, star.boss], chapter2);
}


// ================= CHAPTERS 2–7 + EPILOGUE =================
const POWER = { 2: 6, 3: 7, 4: 8, 5: 9, 6: 0 };
function unlockPowers(upto) { G.powers = G.powers || {}; for (let c = 2; c <= upto; c++) if (POWER[c] !== undefined) G.powers[POWER[c]] = true; }
function heroSetup(type, x, z, chap) { const p = makePlayer(type, x, z); unlockPowers(chap); for (const k of [1, 2, 3, 4, 5]) G.sk[k].on = true; for (const k in G.powers) G.sk[k].on = true; refreshSkills(); G.ulti = 60; setDeath(); checkpoint = { x, z }; return p; }
function saveProg(n) { try { const v = +localStorage.getItem('qq_ch') || 1; if (n > v) localStorage.setItem('qq_ch', n); localStorage.setItem('qq_prog', 'done'); } catch (e) { } }
async function chapterIntro(n, nar, still) { await fadeTo(true); G.paused = true; $('hud').classList.remove('on'); await lore('lore' + n); await cutscene('c' + n, nar, still || 'keyart'); }
function lore(k) { return new Promise(r => { const el = $('lore'); if (!el || !has(k)) return r(); el.querySelector('h3').textContent = t('lorehead'); el.querySelector('p').textContent = t(k); el.querySelector('button').textContent = t('loreok'); el.classList.add('on'); const v = playVoice(k);   /* lore voice: assets/audio/<key>.mp3 when the file exists (lore_sur, lore0..lore7); a missing file just ends silently */ const done = () => { el.classList.remove('on'); G.onEnter = null; if (v && v.playing) v.stop(); r(); }; el.querySelector('button').onclick = done; G.onEnter = done; }); }
async function chapterStart(mood, build, need = []) { await ensureReal(need); clearLevel(); G.chGold = 0; setMood(mood); G.emberDown = mood === DAY || mood === HOT; build(); setMusic('off'); G.freeze = false; G.stats.deaths = 0; setBoss(null); objective(''); }
async function bossFight(type, x, z, intro, ai, onPhase) { if (/aydarho|qashqir|qumdev/.test(type)) setTimeout(() => Sfx.roar && Sfx.roar(), 400); else setTimeout(() => Sfx.horn(), 300); const pre = G.mis && G.mis.preBoss && !G.mis.preBoss.dead && G.mis.preBoss.type === type ? G.mis.preBoss : null; const b = pre || spawn(type, x, z); if (pre) { b.asleep = false; b.custom = null; G.mis.preBoss = null; } b.rot = 0; b.spawnT = 0; b.o.scale.setScalar(b.vs || T[type].scale); if (ai) b.custom = ai; if (G.onBoss) { G.onBoss(b); G.onBoss = null; } G.freeze = true; const p = G.player; p.act = null; p.play('Idle'); await wait(.5); if (intro) await dialog(intro); G.freeze = false; setBoss(b); setMusic('boss'); Sfx.howl(); const d0 = G.stats.deaths; await until(() => b.dead || (G.mis && G.mis.force)); if (!b.dead) b.die(); if (G.hero === 'gulayim') soulToAmulet(b); for (const e of enemies()) if (!e.grp || e.grp.awake) e.die(); setMusic('off'); await wait(1.2); await victory(); return G.stats.deaths === d0; }
async function gainPower(k, nameKey, descKey) { G.powers = G.powers || {}; G.powers[k] = true; G.sk[k].on = true; refreshSkills(); Sfx.power(); flash(.5); await bannerShow(t('newpower'), t(nameKey), t(descKey), 3.6); if (has('use' + k)) await dialog([['sa', 'use' + k]]); }
async function chapterEnd(n, stars, next) {
  saveProg(n + 1); await fadeTo(true); G.paused = true; $('hud').classList.remove('on');
  const k = stars.filter(Boolean).length; $('eh').textContent = t('ch' + n) + ' — ' + t('done'); endStars(n, k, stars.length); $('etb').textContent = ''; $('stl').innerHTML = '';
  $('ereplay').textContent = next ? t('nextch') : t('replay'); const g0 = G.chGold || 0; $('eadx2').style.display = (g0 > 0 && (window.QQ_ADS || window.ysdk)) ? '' : 'none';   /* no inline block: css/ui2 + body.w4noads decide */ $('eadx2').textContent = t('adX2') + ' (+' + g0 + ' 🪙)'; $('eadx2').onclick = async () => { if (await ADS.rewarded()) { addGold(g0); $('eadx2').style.display = 'none'; } }; $('eshop').textContent = t('shopT'); $('eshop').onclick = () => openShop(); $('end').classList.add('on'); $('fade').classList.remove('in');
  $('ereplay').onclick = () => { $('end').classList.remove('on'); (next || prolog)(); };
  // chapter finished: the map is the next step (opens by itself; Map button = primary)
  const MP = window.__M; if (MP) { const em = $('emap'); if (em) em.style.display = 'none'; $('ereplay').textContent = t('m_btn') + ' ▸'; const go = () => { clearTimeout(chapterEnd.autoT); if ($('end').classList.contains('on')) MP.openMap('end'); }; $('ereplay').onclick = go; clearTimeout(chapterEnd.autoT); chapterEnd.autoT = setTimeout(go, 4200); }
}
// generic boss brain: telegraphed slams, combos, summons, charges, ranged volleys
function openUp(b, sec, key) { b.openT = sec; flash(.25); burst(b.x, 2.5, b.z, 0xffe080, 5); ringFx(b.x, b.z, 4, 0xffe080); Sfx.power(); if (key) hintRaw(t(key)); }
const RES = () => [.6, .35, .2][SET.diff] ?? .35;
function weakWhile(b, cond, hintKey) { b.weakHint = hintKey; b.weak = () => (cond() ? 1.8 : RES()); const tick = b.custom; b.custom = (e, dt) => { if (e.openT > 0) { e.openT -= dt; if (Math.random() < .3) burst(e.x, rnd(1, 3), e.z, 0xffd060, .8); } return tick ? tick(e, dt) : false; }; }
function bossBrain(o) {
  return (e, dt) => {
    const P = G.player; if (!P || P.dead) return false; e.bt = (e.bt ?? 2) - dt; e.phase = e.phase || 1;
    if (e.busy > 0) { e.busy -= dt; if (e.chg) { const c = e.chg; c.t += dt; if (c.t > c.wind) { e.x += c.dx * 18 * dt; e.z += c.dz * 18 * dt; if (!c.hit && Math.hypot(P.x - e.x, P.z - e.z) < 2.4) { c.hit = true; P.damage(rnd(o.dmg * .9, o.dmg * 1.2), e, { kb: 10 }); } } if (e.busy <= 0) e.chg = null; } return true; }
    for (const [hp, fn] of o.phases || []) if (e.phase === hp[0] && e.hp < e.maxHp * hp[1]) { e.phase++; e.busy = 1.3; e.play('Cheer', { once: true, force: true }); Sfx.howl(); burst(e.x, 2.5, e.z, o.col || 0xaa2222, 5); fn && fn(e); return true; }
    if (e.bt <= 0 && e.state === 'chase') {
      const pick = o.moves[Math.floor(Math.random() * o.moves.length)]; e.bt = o.every * (e.phase >= 3 ? .65 : e.phase === 2 ? .82 : 1);
      if (pick === 'summon' && o.summon && G.duel === e) { e.bt = .3; return false; }  // one-on-one: no adds while the hero duels the boss
      if (pick === 'summon' && o.summon) { e.busy = 1.1; e.play('Spellcast_Shoot', { once: true, force: true }); for (const [ty, n] of o.summon) for (let i = 0; i < n; i++) { const a = rnd(0, 6.28); spawn(ty, clamp(e.x + Math.cos(a) * 5, -G.W, G.W), e.z + Math.sin(a) * 5); } return true; }
      if (pick === 'charge') { const dx = P.x - e.x, dz = P.z - e.z, l = Math.hypot(dx, dz) || 1; e.face(dx, dz); e.chg = { dx: dx / l, dz: dz / l, t: 0, wind: .8, hit: false }; e.busy = 1.6; e.play('Running_A', { force: true, ts: 1.6 }); telegraph(e.x + dx / l * 9, e.z + dz / l * 9, 2.2, .8, 0xff6600); return true; }
      if (pick === 'quake') { e.busy = 1.6; e.play('E_Slam', { once: true, force: true, dur: 1.3 }); const pts = []; for (let i = 0; i < 6; i++) { const x = clamp(P.x + rnd(-6, 6), -G.W, G.W), z = P.z + rnd(-6, 6); pts.push([x, z]); telegraph(x, z, 2.6, 1.1, o.col || 0xff3300); } G.waits.push({ t: 1.1, r: () => { for (const [x, z] of pts) { ringFx(x, z, 2.6, o.col || 0xff6633); burst(x, .5, z, 0xb08a60, 2.5, true); if (Math.hypot(P.x - x, P.z - z) < 2.8) P.damage(o.dmg * .8, e, { kb: 5 }); } G.shake = .5; Sfx.big(); } }); return true; }
      if (pick === 'volley') { e.busy = 1.2; e.play('Spellcast_Shoot', { once: true, force: true }); for (let i = -2; i <= 2; i++) { const a = Math.atan2(P.x - e.x, P.z - e.z) + i * .22; const m = new THREE.Mesh(new THREE.SphereGeometry(.4, 10, 8), new THREE.MeshBasicMaterial({ color: o.col || 0xff2255 })); m.position.set(e.x, 1.6, e.z); world.add(m); G.proj.push({ m, x: e.x, z: e.z, vx: Math.sin(a) * 10, vz: Math.cos(a) * 10, dmg: o.dmg * .5, team: 'enemy', life: 3, src: e, r: .55 }); } Sfx.orb(); return true; }
    }
    return false;
  };
}
// ---------- environments ----------
const HOT = { bg: 0xd8c4a0, fog: [55, 140], hemi: [0xffe8c8, 0x7a5a34, 1.5], sun: [0xffd8a0, 3.8], sunDir: [.5, .9, .5], exp: 1.0, fireI: 8, ember: 0xd8c8a8, emberA: .35, ash: true };
const DUSK = { bg: 0xc86a48, fog: [36, 105], hemi: [0xffb088, 0x5a2e24, 1.8], sun: [0xff8a50, 4.2], sunDir: [-.7, .4, .4], exp: 1.12, fireI: 26, ember: 0xff5030, emberA: .9, dawn: true };
function steppe(z0, z1, n, opt = {}) { for (let z = z0; z > z1; z -= rnd(9, 15)) for (const s of [-1, 1]) { const x = s * (G.W + rnd(4, 12)); const k = Math.random(); if (opt.yurts && k < .25) yurt(x, z, opt.burnt && Math.random() < .7, false); else if (opt.carts && k < .38) decor('R_arava', x, z, rnd(0, 6.28), opt.burnt); else if (opt.horses && k < .48) decor('R_horse', x, z, rnd(0, 6.28)); else if (k < .6) debris(s * (G.W + rnd(1, 3)), z, 3); } }
function buildCh2() { wall(-30, 30, -186, 4, 1.6); ground(14, -190, 'ground1'); wall(-30, 30, 13, 2.2, 1.2, false); steppe(0, -185, 0, { carts: true, yurts: true, burnt: true });
  fire(-6, -40, 1.0); fire(7, -96, 1.1);  SC.ch2(); }
function buildCh3() { wall(-30, 30, -176, 4, 1.6); ground(14, -180, 'ground1'); wall(-30, 30, 13, 2.2, 1.2, false); water(-G.W - 14, -80, 22, 220); steppe(0, -175, 0, { carts: true, horses: true });
  for (let z = -20; z > -170; z -= 14) { yurt(G.W + 6, z, false, false); } for (const z of [-62, -64, -66, -118, -120]) crate(rnd(-6, 6), z); banner(-6, -110, 0x1a1a1a); banner(6, -110, 0x1a1a1a); fire(-4, -58, 1.3); fire(5, -112, 1.4);  SC.ch3(); }
function buildCh4() { ground(14, -165, 'ground1'); wall(-30, 30, 13, 2.2, 1.2, false); water(0, -205, 100, 80, 0x1f4c5c); for (let x = -36; x < 36; x += rnd(1.5, 3)) place(world, Math.random() < .5 ? 'boulder_01' : 'namaqualand_stones_01', x, -165 + rnd(-.6, .6), rnd(.8, 1.6)); steppe(0, -150, 0, { carts: true });
  fire(-6, -60, 1.2); fire(6, -100, 1.2);  SC.ch4(); }
function buildCh5() { wall(-30, 30, -186, 4, 1.6); ground(14, -190, 'ground2'); wall(-30, 30, 13, 2.2, 1.2, false); for (let z = 10; z > -190; z -= 3.5) for (const s of [-1, 1]) place(world, 'boulder_01', s * (G.W + rnd(1.5, 4)), z, rnd(3, 6)); fire(-5, -70, 1.2); fire(5, -130, 1.3);  SC.ch5(); }
function buildCh6() { ground(14, -190, 'ground1'); wall(-30, 30, 13, 3, 1.6); street(0, -110, false, 3); wall(-30, -3.5, -120, 5, 1.6); wall(3.5, 30, -120, 5, 1.6); for (const s of [-1, 1]) { house(s * 16, -140, 7, 8, 4); house(s * 16.5, -158, 7, 7, 4); banner(s * 5, -124, 0x1a1a1a); } fire(-8, -150, 1.6); fire(8, -165, 1.6); wall(-30, 30, -182, 6, 1.6);  SC.ch6(); }
function buildCh7() { wall(-30, 30, -186, 4, 1.6); ground(14, -190, 'ground2'); wall(-30, 30, 13, 3, 1.6); steppe(0, -110, 0, { yurts: true, burnt: true }); for (const s of [-1, 1]) for (let z = -120; z > -175; z -= 14) { yurt(s * (G.W + 5), z, false, false); banner(s * (G.W - 1), z + 4, 0x3a0606); } fire(0, -100, 2); fire(-8, -140, 1.6); fire(8, -160, 1.6);  SC.ch7(); }
function totem(x, z) { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.CylinderGeometry(.5, .7, 4.5, 8), new THREE.MeshStandardMaterial({ color: 0x2a0a0a, emissive: 0x500000, roughness: .8 })); m.position.y = 2.25; g.add(m); const sk = new THREE.Mesh(new THREE.SphereGeometry(.55, 12, 10), new THREE.MeshStandardMaterial({ color: 0xd8cbb0, emissive: 0x330000 })); sk.position.y = 4.8; g.add(sk); g.position.set(x, 0, z); world.add(g); const L = new THREE.PointLight(0xff2010, 18, 9); L.position.set(x, 4, z); world.add(L);
  return breakable({ mesh: g, x, z, hp: 3, only: 'slam', hint: 'h_totem', barY: 5.7, rad: 1, w: 1.3, d: 1.3, light: L, spark: 0xff5533, dust: 0x502020, chunks: 16 }); }
// wooden city gate (chapter 6): only Earth Slam breaks it
function gateDoor(x, z) { const g = new THREE.Group(); const wm = woodMat() || new THREE.MeshStandardMaterial({ color: 0x5a3a1c, roughness: 1 }), iron = new THREE.MeshStandardMaterial({ color: 0x2a2622, metalness: .7, roughness: .5 });
  for (const sd of [-1, 1]) { const leaf = new THREE.Mesh(new THREE.BoxGeometry(3.45, 5, .45), wm); leaf.position.set(sd * 1.75, 2.5, 0); leaf.castShadow = true; g.add(leaf); for (const y of [1, 2.5, 4]) { const band = new THREE.Mesh(new THREE.BoxGeometry(3.3, .18, .52), iron); band.position.set(sd * 1.75, y, 0); g.add(band); } for (let k = -1; k <= 1; k++) { const st = new THREE.Mesh(new THREE.SphereGeometry(.09, 6, 4), iron); st.position.set(sd * 1.75 + k, 1.75, .27); g.add(st); } }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(7.4, .5, .7), wm); beam.position.set(0, 5.2, 0); g.add(beam); g.position.set(x, 0, z); world.add(g);
  return breakable({ mesh: g, x, z, hp: 6, only: 'slam', hint: 'h_gate', barY: 4.4, rad: 3.6, w: 7, d: 1, chunks: 26, dust: 0x8a6a4a }); }
async function captives(list) { const es = list.map(([x, z]) => { const c = spawn('asir', x, z, 'npc'); c.rot = Math.PI; c.play('Sit_Floor_Idle'); return c; }); return es; }
async function freeCaptives(es) { for (const c of es) { c.play('Cheer', { force: true }); burst(c.x, 1.5, c.z, 0xffe0a0, 1.5); } Sfx.pick(); setTimeout(() => { for (const c of es) { if (c.dead || c.gone) continue; c.team = 'ally'; c.d = Object.assign({}, c.d, { team: 'ally', follow: true }); c.hp = c.maxHp = 420; c.state = 'chase'; c.fo = undefined; c.play('Idle', { force: true }); } }, 1600); }


// ---------- Horseback segments ----------
function fleeAI(e, dt) { const P = G.player; if (e.escaped) return true; e.state = 'chase'; const sp = e.fleeSp * (e.mounted ? 1 : .45); e.z -= sp * dt; e.x = clamp(e.x + Math.sin(G.time * .9 + e.seed) * dt * 2.5, -G.W + 1, G.W - 1); e.rot = Math.PI; if (!e.mounted) e.play('Running_A');
  if (e.type === 'archer' && P && !P.dead) { e.sh = (e.sh ?? rnd(1, 2.5)) - dt; if (e.sh <= 0 && Math.hypot(P.x - e.x, P.z - e.z) < 22) { e.sh = rnd(1.8, 2.8); shoot(e, P, 14, false); } }
  if (e.z < G.rideEnd) { e.escaped = true; e.dead = true; e.remove(); G.rideEsc = (G.rideEsc || 0) + 1; hintRaw(t('escaped')); } return true; }
async function rideLevel(hero, mood, objKey, foes, mode) {
  await chapterStart(mood, () => { ground(14, -215, 'ground1'); wall(-30, 30, 13, 2.2, 1.2, false); wall(-30, 30, -210, 4, 1.6); steppe(0, -205, 0, { carts: true }); fire(-7, -60, 1); fire(8, -140, 1); SC.ride(G.curCh); }, [hero === 'sarbinaz' ? 'sarbinaz' : hero]);
  const p = heroSetup(hero, 0, 3, G.curCh || 1); for (let i = 0; i < 4 + SAVE.up.squad; i++) spawn('qiz', (i % 2 ? 1 : -1) * (2 + (i >> 1) * 1.8), 6 + (i >> 1) * 2);
  setHero(hero === 'sarbinaz' ? 'sa' : 'gu'); $('hud').classList.add('on'); $('fade').classList.remove('in');
  toggleMount(p, true); for (const m of G.ents) if (m.type === 'qiz') toggleMount(m, true);
  G.rideEnd = -200; G.rideEsc = 0; const es = [];
  for (const [ty, x, z] of foes) { const f = spawn(ty, x, z); f.spawnT = 0; f.o.scale.setScalar(f.vs); toggleMount(f, true); if (mode === 'flee') { f.custom = fleeAI; f.fleeSp = rnd(8, 9.5); f.seed = rnd(0, 9); } es.push(f); }
  if (G.mis && G.mis.onRide) { try { G.mis.onRide(es, p); } catch (e) { console.warn(e); } }
  G.paused = false; setMusic('battle'); await bannerShow(t('rideT'), t(objKey), '', 2.6); objective(objKey); hint('', 5, t(mode === 'flee' ? 'h_chase' : 'h_charge'));
  await until(() => es.every(f => f.dead));
  const ok = !G.rideEsc; setMusic('off'); await wait(.6); for (const m of G.ents) if (m.mounted) toggleMount(m, false); await bannerShow('', t(ok ? 'rideWin' : 'rideMiss'), '', 2.2); if (ok) addGold(80, p.x, p.z); return ok; }
// ---------- Shop / ads ----------
function openShop() { if (window.__META && window.__META.openCamp && window.__W4 && window.__W4.paneHTML) { window.__META.openCamp('army'); return Promise.resolve(); }   /* one upgrade screen: Camp → host & arms */
  return new Promise(res => { const el = $('shop'); const wasP = G.paused; G.paused = true; $('shh').textContent = t('shopT'); $('shclose').textContent = t('shopClose');
  const draw = () => { $('shg').textContent = '🪙 ' + SAVE.gold; $('shl').innerHTML = ''; for (const k of ['sword', 'life', 'maid', 'squad', 'horse']) { const lv = SAVE.up[k], U = UPG[k], c = U.cost(lv), row = document.createElement('div'); row.className = 'row'; row.innerHTML = `<span>${t('u_' + k)} — ${lv}/${U.max}<small>${t('u_' + k + 'd')}</small></span>`; const b = document.createElement('button'); b.textContent = lv >= U.max ? 'MAX' : '🪙 ' + c; b.disabled = lv >= U.max || SAVE.gold < c; b.onclick = () => { if (SAVE.gold < c) return; SAVE.gold -= c; SAVE.up[k]++; saveGame(); Sfx.power(); hudGold(); draw(); }; row.appendChild(b); $('shl').appendChild(row); }
    const ad = $('shad'); const left = 3 - (SAVE.adToday || 0); ad.textContent = t('adGold') + (left > 0 ? '' : ' ✓'); ad.disabled = left <= 0; ad.onclick = async () => { if (await ADS.rewarded()) { SAVE.adToday = (SAVE.adToday || 0) + 1; addGold(100); draw(); } }; };
  draw(); el.classList.add('on'); $('shclose').onclick = () => { el.classList.remove('on'); G.paused = wasP; res(); }; }); }

// ---------- 2-BOB: Asirlar izi ----------
async function chapter2() {
  await chapterIntro(2, 'nar6', 'ruins'); G.curCh = 1; const r2 = await rideLevel('gulayim', HOT, 'o_ride2', [['askar', -4, -16], ['askar', 4, -20], ['archer', 0, -26], ['askar', -6, -32], ['archer', 6, -36], ['askar', 0, -42]], 'flee'); await fadeTo(true); await chapterStart(HOT, buildCh2, ['qumdev']); const p = heroSetup('gulayim', 0, 3, 1); for (let i = 0; i < 5 + SAVE.up.squad; i++) spawn('qiz', (i % 2 ? 1 : -1) * (1.5 + (i >> 1) * 1.6), 5 + (i >> 1) * 1.2); setHero('gu');
  $('hud').classList.add('on'); $('fade').classList.remove('in'); G.paused = false; setMusic('calm'); await bannerShow(t('ch2'), t('ch2n'), '', 3); await dialog([['sa','x2a'],['gu','x2b']]); const st = [false, false, false];
  objective('o_trail2'); const g0 = gate(-40); const mb = marker(6, -30); const ba = spawn('bayimbet', 6, -30, 'npc'); ba.rot = 0;
  await reach(6, -30, 3.4); mb.remove(); ba.face(p.x - ba.x, p.z - ba.z); p.face(ba.x - p.x, ba.z - p.z); p.act = null; p.play('Idle'); await dialog([['ba', 'd_ba1'], ['gu', 'd_gu5'], ['ba', 'd_ba2'], ['gu', 'd_gu6']]); st[0] = true; g0.open();
  objective('o_ambush'); setMusic('battle'); const g1 = gate(-90); await goTo(-52);
  await wave([['potion', 0, -68], ['askar', -6, -64], ['askar', 6, -64], ['wolf', 0, -70], ['archer', -8, -74], ['archer', 8, -74], ['shaman', 0, -78]]);
  await wave([['potion', -4, -66], ['wolf', -7, -60], ['wolf', 7, -60], ['askar', -3, -72], ['askar', 3, -72], ['wolf', 0, -80]]); g1.open(); checkpoint = { x: 0, z: -84 }; p.hp = p.maxHp; setMusic('calm');
  objective('o_salt'); const g2 = gate(-150); await goTo(-110); hint('', 4, t('h_sand'));
  G.onBoss = b => { weakWhile(b, () => b.openT > 0, 'w_qd'); b.onLeap = () => openUp(b, 7, 'w_open'); };
  const d0 = G.stats.deaths; st[1] = await bossFight('qumdev', 0, -132, [['qd', 'd_qd1'], ['gu', 'd_gu7']], bossBrain({ dmg: 44, every: 3.2, moves: ['quake', 'quake', 'summon', 'charge'], summon: [['wolf', 2]], col: 0xd8b070, phases: [[[1, .55], e => { e.spdMul = 1.2; }], [[2, .25], e => { e.dmgMul = 1.25; }]] })); st[2] = G.stats.deaths === d0;
  await gainPower(6, 'pw6', 'pw6d'); g2.open(); objective('o_go'); await goTo(-168);
  await chapterEnd(2, st, chapter3);
}
// ---------- 3-BOB: Qul karvoni ----------
async function chapter3() {
  await chapterIntro(3, 'nar7', 'ruins'); await chapterStart(DAY, buildCh3, ['jallod','otbasqan']); const p = heroSetup('gulayim', 0, 3, 2); for (let i = 0; i < 5 + SAVE.up.squad; i++) spawn('qiz', (i % 2 ? 1 : -1) * (1.5 + (i >> 1) * 1.6), 5 + (i >> 1) * 1.2); setHero('gu');
  $('hud').classList.add('on'); $('fade').classList.remove('in'); G.paused = false; setMusic('calm'); await bannerShow(t('ch3'), t('ch3n'), '', 3); await dialog([['sa','x3a'],['gu','x3b']]); const st = [false, false, false];
  objective('o_camp'); setMusic('battle'); const g0 = gate(-70); await goTo(-22);
  await wave([['potion', 3, -40], ['askar', -6, -36], ['askar', 6, -36], ['askar', 0, -42], ['archer', -8, -48], ['archer', 8, -48]]);
  const c1 = await captives([[-5, -62], [-3, -63], [3, -63], [5, -62]]); await wave([['wolf', -6, -50], ['wolf', 6, -50], ['shaman', 0, -58], ['askar', 0, -54]]); await freeCaptives(c1); st[0] = true; g0.open(); checkpoint = { x: 0, z: -66 };
  objective('o_otbasqan'); const g1 = gate(-125); await goTo(-86); hint('', 5, t('h_chain'));
  G.onBoss = b => { weakWhile(b, () => b.openT > 0, 'w_ja'); b.onSlam = () => { openUp(b, 6, 'w_open'); b.stagger = 1.5; }; };
  st[1] = await bossFight('jallod', 0, -108, [['ja', 'd_ja1'], ['gu', 'd_gu8']], bossBrain({ dmg: 40, every: 2.8, moves: ['charge', 'quake', 'summon', 'charge'], summon: [['askar', 2]], col: 0xaa3322, phases: [[[1, .5], e => { e.spdMul = 1.25; }]] }));
  await gainPower(7, 'pw7', 'pw7d'); const ob = spawn('otbasqan', 0, -118, 'ally'); ob.rot = 0; await dialog([['ot', 'd_ot1'], ['gu', 'd_gu9'], ['ot', 'd_ot2']]); g1.open(); checkpoint = { x: 0, z: -120 };
  objective('o_free'); const c2 = await captives([[-5, -150], [-2, -152], [2, -152], [5, -150], [0, -155]]); const d0 = G.stats.deaths;
  await wave([['potion', 0, -146], ['askar', -6, -138], ['askar', 6, -138], ['wolf', -3, -144], ['wolf', 3, -144], ['archer', 0, -160], ['shaman', -7, -158]]); await freeCaptives(c2); st[2] = G.stats.deaths === d0;
  await goTo(-163); await chapterEnd(3, st, chapter4);
}
// ---------- 4-BOB: Dengiz sohili ----------
function dragonAI(e, dt) { const P = G.player; if (!P || P.dead) return true; e.r = 5; if (e.ashore > 0) { e.ashore -= dt; e.y = -1.6; if (e.ashore <= 0) { e.z = -170.5; burst(e.x, 1, e.z, 0x88ccff, 5); } return true; } e.t2 = (e.t2 || 0) + dt; e.y = Math.sin(e.t2 * 1.2) * .5 - 1.3 + (e.sub ? -7 : 0); e.face(P.x - e.x, P.z - e.z, dt * 3); e.bt = (e.bt ?? 2.5) - dt; e.invuln = !!e.sub;
  if (e.sub) { e.subT -= dt; if (e.subT <= 0) { e.sub = false; e.x = rnd(-7, 7); e.z = -170.5; burst(e.x, 1, e.z, 0x88ccff, 6); Sfx.big(); } return true; }
  if (e.bt <= 0) { e.bt = e.hp < e.maxHp * .4 ? 2.0 : 2.8; const k = Math.random();
    if (k < .45) { for (let i = 0; i < 9; i++) { const x = clamp(P.x + rnd(-8, 8), -G.W, G.W), z = P.z + rnd(-6, 6); telegraph(x, z, 1.8, 1.2, 0xaa0022); G.waits.push({ t: 1.2, r: () => { burst(x, 1, z, 0xcc1133, 2); if (Math.hypot(P.x - x, P.z - z) < 2 && !(P.shield > 0)) P.damage(22, e, { kb: 2 }); } }); } hint('', 3, t('h_dodge')); }
    else if (k < .8) { for (let i = -3; i <= 3; i++) { const a = Math.atan2(P.x - e.x, P.z - e.z) + i * .14; const m = new THREE.Mesh(new THREE.SphereGeometry(.5, 10, 8), new THREE.MeshBasicMaterial({ color: 0x55ddff })); m.position.set(e.x, 2, e.z); world.add(m); G.proj.push({ m, x: e.x, z: e.z, vx: Math.sin(a) * 12, vz: Math.cos(a) * 12, dmg: 22, team: 'enemy', life: 4, src: e, r: .6 }); } Sfx.orb(); }
    else { e.sub = true; e.subT = 3; } }  /* dive: no wolf adds — the dragon is fought alone */
  return true; }
async function chapter4() {
  await chapterIntro(4, 'nar8', 'ruins'); G.curCh = 3; await rideLevel('gulayim', DAY, 'o_ride4', [['askar', -4, -18], ['archer', 4, -24], ['askar', 0, -30], ['archer', -6, -38], ['askar', 6, -44], ['archer', 0, -50], ['askar', -3, -56]], 'flee'); await fadeTo(true); await chapterStart(DAY, buildCh4, ['aydarho','otbasqan']); const p = heroSetup('gulayim', 0, 3, 3); spawn('otbasqan', 2.6, 5); for (let i = 0; i < 4 + SAVE.up.squad; i++) spawn('qiz', (i % 2 ? 1 : -1) * (1.5 + (i >> 1) * 1.6), 5 + (i >> 1) * 1.2); setHero('gu');
  $('hud').classList.add('on'); $('fade').classList.remove('in'); G.paused = false; setMusic('calm'); await bannerShow(t('ch4'), t('ch4n'), '', 3); await dialog([['ot','x4a'],['gu','x4b']]); const st = [false, false, false];
  objective('o_ships'); setMusic('battle'); const g0 = gate(-110); await goTo(-26);
  await wave([['potion', 0, -44], ['askar', -6, -40], ['askar', 6, -40], ['archer', -8, -50], ['archer', 8, -50], ['shaman', 0, -54]]);
  await wave([['potion', -2, -74], ['wolf', -6, -70], ['wolf', 6, -70], ['askar', 0, -76], ['askar', -4, -82], ['askar', 4, -82], ['archer', 0, -90]]); st[0] = true; g0.open(); checkpoint = { x: 0, z: -104 };
  objective('o_dragon'); await goTo(-118); const d0 = G.stats.deaths;
  const gD = gate(-163); G.onBoss = b => { b.maxHp = b.hp = 4500; b.weakHint = 'w_ay'; b.weak = () => (b.ashore > 0 ? 1.6 : RES()); b.onChain = () => { if (b.sub) return; b.ashore = 6; b.z = -165.5; openUp(b, 6, 'w_open'); }; };
  st[1] = await bossFight('aydarho', 0, -170.5, [['ay', 'd_ay1'], ['gu', 'd_gu10']], dragonAI); st[2] = G.stats.deaths === d0;
  await gainPower(8, 'pw8', 'pw8d'); await chapterEnd(4, st, chapter5);
}
// ---------- 5-BOB: Darbent tog'i (Sarbinaz) ----------
async function chapter5() {
  await chapterIntro(5, 'nar9', 'ruins'); await chapterStart(DUSK, buildCh5, ['qunqar','sarbinaz']); const p = heroSetup('sarbinaz', 0, 3, 4); p.maxHp = p.hp = 700; p.d = { ...T.sarbinaz, dmg: [24, 34] }; for (let i = 0; i < 5 + SAVE.up.squad; i++) spawn('qiz', (i % 2 ? 1 : -1) * (1.5 + (i >> 1) * 1.6), 5 + (i >> 1) * 1.2); setHero('sa');
  $('hud').classList.add('on'); $('fade').classList.remove('in'); G.paused = false; setMusic('calm'); await bannerShow(t('ch5'), t('ch5n'), '', 3); await dialog([['sa','x5a']]); const st = [false, false, false];
  objective('o_pass'); setMusic('battle'); const g0 = gate(-100); await goTo(-20);
  await wave([['potion', 0, -37], ['askar', -5, -34], ['askar', 5, -34], ['wolf', 0, -40], ['archer', -7, -46], ['archer', 7, -46]]);
  await wave([['potion', 3, -64], ['wolf', -6, -60], ['wolf', 6, -60], ['shaman', 0, -70], ['askar', -4, -66], ['askar', 4, -66], ['wolf', 0, -76]]); st[0] = true; g0.open(); checkpoint = { x: 0, z: -96 };
  objective('o_qunqar'); await goTo(-112); const d0 = G.stats.deaths;
  G.onBoss = b => weakWhile(b, () => G.player.shield > 0, 'w_qu');
  st[1] = await bossFight('qunqar', 0, -136, [['qu', 'd_qu1'], ['sa', 'd_sa2']], bossBrain({ dmg: 52, every: 2.9, moves: ['quake', 'charge', 'charge', 'summon'], summon: [['wolf', 2], ['askar', 1]], col: 0xff4422, phases: [[[1, .6], e => { e.spdMul = 1.15; }], [[2, .3], e => { e.dmgMul = 1.3; e.spdMul = 1.3; }]] })); st[2] = G.stats.deaths === d0;
  await gainPower(9, 'pw9', 'pw9d'); await chapterEnd(5, st, chapter6);
}
// ---------- 6-BOB: Qashal shahri ----------
async function chapter6() {
  await chapterIntro(6, 'nar10', 'ruins'); await chapterStart(DAY, buildCh6, ['qargashiq','sarbinaz']); const p = heroSetup('gulayim', 0, 3, 5); spawn('sarbinaz', 2.6, 5); for (let i = 0; i < 4 + SAVE.up.squad; i++) spawn('qiz', (i % 2 ? 1 : -1) * (1.5 + (i >> 1) * 1.6), 5 + (i >> 1) * 1.2); setHero('gu');
  $('hud').classList.add('on'); $('fade').classList.remove('in'); G.paused = false; setMusic('calm'); await bannerShow(t('ch6'), t('ch6n'), '', 3); await dialog([['sa','x6a'],['gu','x6b']]); const st = [false, false, false];
  objective('o_city'); setMusic('battle'); const g0 = gate(-60); await goTo(-20);
  await wave([['potion', 3, -38], ['askar', -6, -34], ['askar', 6, -34], ['askar', 0, -40], ['archer', -8, -46], ['archer', 8, -46], ['shaman', 0, -50]]); g0.open();
  const g1 = gate(-118); await wave([['potion', 0, -80], ['wolf', -6, -70], ['wolf', 6, -70], ['askar', -3, -84], ['askar', 3, -84], ['archer', -8, -96], ['archer', 8, -96], ['shaman', 0, -100]]); st[0] = true;
  objective('o_gate'); const gt = gateDoor(0, -120); hint('', 6, t('h_gate'));
  await until(() => gt.dead); g1.open(); checkpoint = { x: 0, z: -126 }; const c = await captives([[-8, -132], [-6, -134], [6, -134], [8, -132]]); await freeCaptives(c);
  objective('o_king'); await goTo(-138); const d0 = G.stats.deaths;
  G.onBoss = b => weakWhile(b, () => G.player.giant > 0, 'w_qg');
  st[1] = await bossFight('qargashiq', 0, -160, [['qg', 'd_qg1'], ['gu', 'd_gu11']], bossBrain({ dmg: 56, every: 2.6, moves: ['charge', 'quake', 'summon', 'charge', 'volley'], summon: [['askar', 2], ['archer', 1]], col: 0x221111, phases: [[[1, .5], e => { for (let i = 0; i < 2; i++) { const s = i ? 1 : -1; ghostEnemyRider(e.x + s * 6, e.z + 10); } }], [[2, .2], e => { e.dmgMul = 1.3; }]] })); st[2] = G.stats.deaths === d0;
  await gainPower(0, 'pw0', 'pw0d'); await chapterEnd(6, st, chapter7);
}
function ghostEnemyRider(x, z) { const P = G.player; if (!P) return; const dx = P.x - x, dz = P.z - z, l = Math.hypot(dx, dz) || 1; telegraph(x + dx / l * 10, z + dz / l * 10, 2, 1, 0x330000); G.waits.push({ t: 1, r: () => { const r = { x, z, t: 0 }; const tick = dt => { r.t += dt; r.x += dx / l * 20 * dt; r.z += dz / l * 20 * dt; burst(r.x, .8, r.z, 0x220000, 1.6, true); if (Math.hypot(P.x - r.x, P.z - r.z) < 2) { P.damage(40, null, {}); r.t = 9; } return r.t < 1.3; }; G.untils.push({ fn: () => !tick(1 / 60), r: () => { } }); } }); }
// ---------- 7-BOB: Qonxo'r (final) ----------
async function chapter7() {
  await chapterIntro(7, 'nar11', 'ruins'); G.curCh = 6; await rideLevel('gulayim', DUSK, 'o_ride7', [['askar', -5, -40], ['askar', 5, -42], ['askar', 0, -46], ['archer', -7, -52], ['archer', 7, -52], ['askar', -3, -58], ['askar', 3, -60], ['askar', 0, -66]], 'fight'); await fadeTo(true); await chapterStart(DUSK, buildCh7, ['surtaysha','qashqir','sarbinaz','otbasqan']); const p = heroSetup('gulayim', 0, 3, 6); spawn('sarbinaz', -2.6, 5); spawn('otbasqan', 2.6, 5); for (let i = 0; i < 3 + SAVE.up.squad; i++) spawn('qiz', (i % 2 ? 1 : -1) * (1.5 + (i >> 1) * 1.6), 5 + (i >> 1) * 1.2); setHero('gu');
  $('hud').classList.add('on'); $('fade').classList.remove('in'); G.paused = false; setMusic('calm'); await bannerShow(t('ch7'), t('ch7n'), '', 3); await dialog([['gu','x7a'],['sa','x7b'],['ot','x7c']]); const st = [false, false, false];
  objective('o_horde'); setMusic('battle'); const g0 = gate(-110); await goTo(-20);
  await wave([['potion', 0, -38], ['askar', -6, -34], ['askar', 6, -34], ['wolf', -3, -40], ['wolf', 3, -40], ['archer', -8, -48], ['archer', 8, -48], ['shaman', 0, -52]]);
  await wave([['potion', -2, -76], ['potion', 2, -76], ['wolf', -6, -70], ['wolf', 6, -70], ['qashqir', 0, -86], ['askar', -4, -80], ['askar', 4, -80]]); st[0] = true; g0.open(); checkpoint = { x: 0, z: -112 };
  objective('o_final'); await goTo(-122);
  const s = spawn('surtaysha', 0, -150); s.rot = 0; s.spawnT = 0; s.o.scale.setScalar(s.vs || T.surtaysha.scale); s.invuln = true; s.helm = 3; s.maxHp = s.hp = 9000; G.freeze = true; p.act = null; p.play('Idle'); await wait(.5);
  await dialog([['su', 'd_su5'], ['gu', 'd_gu12'], ['su', 'd_su6']]); G.freeze = false; setBoss(s); setMusic('boss'); const d0 = G.stats.deaths;
  // phase 1: helmet — only chains break it
  objective('o_helm'); hint('', 6, t('h_helm')); s.onChain = () => { if (s.helm > 0) { s.helm--; burst(s.x, 4, s.z, 0xffd060, 3); num(s, t('helm') + ' ' + (3 - s.helm) + '/3', 'c'); Sfx.big(); } };
  const brain = bossBrain({ dmg: 50, every: 2.6, moves: ['quake', 'volley', 'charge', 'summon'], summon: [['wolf', 2]], col: 0xaa0010 }); s.custom = brain;
  await until(() => s.helm <= 0); s.invuln = false; flash(.5); await bannerShow('', t('helmOff'), '', 2);
  // phase 2: totems heal him — break them with ground slam
  objective('o_totem'); hint('', 6, t('h_totem')); const tt = [totem(-8, -140), totem(8, -140), totem(-8, -162), totem(8, -162)];
  G.tick = dt => { if (s.dead) return; if (tt.some(o => !o.dead)) { s.hp = Math.min(s.maxHp, s.hp + dt * 40 * ([.35, 1, 1.2][SET.diff] ?? 1)); } };
  await until(() => tt.every(o => o.dead) && s.hp < s.maxHp * .35); G.tick = null;
  // phase 3: chained wrestle (QTE)
  G.freeze = true; s.invuln = true; await dialog([['su', 'd_su7'], ['gu', 'd_gu13']]); objective('o_wrestle'); await qte(9, 14, 9); G.freeze = false; s.invuln = false; s.damage(s.hp + 10, p, { crit: true }); soulToAmulet(s); st[1] = true; st[2] = G.stats.deaths === d0;
  await wait(1.4); setMusic('off'); await victory(); await epilogue(st);
}
async function epilogue(st) { saveProg(8); await fadeTo(true); G.paused = true; $('hud').classList.remove('on'); await cutscene('e1', 'nar12', 'keyart'); await cutscene('e2', 'nar13', 'ruins'); await credits();
  $('eh').textContent = t('end'); endStars(7, st.filter(Boolean).length, st.length); $('etb').textContent = t('theEnd'); $('stl').innerHTML = ''; $('ereplay').textContent = t('replay'); $('end').classList.add('on'); $('fade').classList.remove('in'); $('ereplay').onclick = () => { $('end').classList.remove('on'); runMission('0-1'); }; }
const CHAP = { 1: () => mission1(), 2: chapter2, 3: chapter3, 4: chapter4, 5: chapter5, 6: chapter6, 7: chapter7 };

// ---------- Title ----------
function texts() { if ($('tshop')) $('tshop').textContent = t('shopT') + '  🪙 ' + SAVE.gold; $('tname').textContent = t('title'); $('tsub').textContent = t('sub'); $('tplay').textContent = t('play'); $('tcont').textContent = t('cont'); if ($('daily')) $('daily').textContent = '🎁 ' + t('daily', { d: $('daily').dataset.d, g: $('daily').dataset.g }); if ($('tbook')) $('tbook').textContent = '📜 ' + t('book'); if ($('tset')) $('tset').textContent = '⚙ ' + t('setT'); $('loadtxt').textContent = ready ? '' : t('loading'); document.querySelectorAll('#langs button').forEach(b => b.classList.toggle('sel', b.dataset.l === lang)); }
const TOUCH = matchMedia('(pointer: coarse)').matches;
let ready = false, saved = null, prog = null; try { saved = localStorage.getItem('qq_lang'); prog = localStorage.getItem('qq_prog'); } catch (e) { }
const nav = (navigator.language || 'kaa').slice(0, 2); setLang(qs.get('lang') || saved || ({ ru: 'ru', en: 'en', uz: 'uz' }[nav] || 'qq'));
{ const b = document.createElement('button'); b.className = 'btn alt'; b.id = 'tset'; b.onclick = openSet; document.getElementById('tbox').appendChild(b); }

// ---- Kunlik sovg'a ----
try { const day = d => new Date(d).toISOString().slice(0, 10); const today = day(Date.now()); const D = JSON.parse(localStorage.qq_daily || '{}');
  if (D.d !== today) { const st = D.d === day(Date.now() - 864e5) ? Math.min((D.s || 0) + 1, 7) : 1; const g = 50 + st * 50; SAVE.gold += g; saveGame(); localStorage.qq_daily = JSON.stringify({ d: today, s: st });
    const el = document.createElement('div'); el.id = 'daily'; el.dataset.d = st; el.dataset.g = g; document.getElementById('tbox').appendChild(el); }
} catch (e) { }

{ const b = document.createElement('button'); b.className = 'btn alt'; b.id = 'tbook'; document.getElementById('tbox').appendChild(b);
  b.onclick = () => { initAudio(); let mx = 0; try { mx = Math.min(7, +localStorage.getItem('qq_ch') || 0); } catch (e) { } let i = 0; const el = $('lore');
    const show = () => { const nm = i === 0 ? t('ch0') : t('ch' + i) + ' — ' + t('ch' + i + 'n'); el.querySelector('h3').textContent = nm; el.querySelector('p').textContent = t('lore' + i); const last = i >= mx; el.querySelector('button').textContent = last ? t('loreok') : t('nextp'); el.querySelector('button').onclick = () => { if (last) el.classList.remove('on'); else { i++; show(); } }; };
    el.classList.add('on'); show(); }; }
$('title').addEventListener('pointerdown', () => { initAudio(); playTitle(); }, { once: true });
$('title').style.backgroundImage = 'url(./assets/img/keyart.jpg)'; texts();
document.querySelectorAll('#langs button').forEach(b => b.onclick = () => { setLang(b.dataset.l); texts(); });
function begin(fn) { initAudio(); try { const d = document.documentElement; if (/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) && d.requestFullscreen) d.requestFullscreen().then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => { })).catch(() => { }); } catch (e) { } $('title').classList.remove('on'); $('title').style.display = 'none'; fn(); }
$('tplay').onclick = () => begin(() => runMission((() => { try { return localStorage.getItem('qq_tut') || localStorage.getItem('qq_prog') || '0-0' in (JSON.parse(localStorage.getItem('qq_stars') || '{}') || {}); } catch (e) { return true; } })() ? '0-1' : '0-0')); { const b = document.createElement('button'); b.className = 'btn alt'; b.id = 'tshop'; $('tcont').after(b); b.onclick = () => { initAudio(); openShop(); }; } let chSaved = 1; try { chSaved = Math.min(7, +localStorage.getItem('qq_ch') || 1); } catch (e) { }
$('tcont').onclick = () => begin(CHAP[chSaved] || CHAP[1]);
// ---- missions (js/missions.js): story helpers handed over once ----
initMissions({ objective, hint, bannerShow, fadeTo, setHero, dialog, cutscene, reach, goTo, victory, potionSoldier, wave, setDeath, setCP: (x, z) => { checkpoint = { x, z }; }, skirmish, buildProlog, buildMission, qashqirAI, heroSetup, saveProg, chapterIntro, lore, chapterStart, bossFight, gainPower, openUp, RES, weakWhile, bossBrain,
  B: { 2: buildCh2, 3: buildCh3, 4: buildCh4, 5: buildCh5, 6: buildCh6, 7: buildCh7 }, totem, gateDoor, captives, freeCaptives, rideLevel, dragonAI, ghostEnemyRider, epilogue, endStars, saveStars, openShop, soul: soulToAmulet, moods: { NIGHT, DAY, HOT, DUSK } });
initMap({ CHAP, prolog, begin, run: runMission });

// ---- Sozlamalar ----
setVol(SET.mus, SET.snd);
let setWas = null;
function setTexts() { $('sett').textContent = t('setT'); $('sl_q').textContent = t('setQ'); $('sl_d').textContent = t('setD'); $('sl_m').textContent = t('setM'); $('sl_s').textContent = t('setFx'); $('sl_vm').textContent = t('setMa'); $('sl_vo').textContent = t('setVo'); volUI(); $('sl_v').textContent = t('setV'); $('setok').textContent = t('setOk'); $('setmenu').textContent = t('setMenu');
  const L = { q: ['q0', 'q1', 'q2'], diff: ['d0', 'd1', 'd2'], mus: ['off', 'on'], snd: ['off', 'on'], vib: ['off', 'on'] };
  document.querySelectorAll('#set .seg').forEach(g => { const k = g.dataset.k; g.querySelectorAll('button').forEach(b => { b.textContent = t(L[k][+b.dataset.v]); b.classList.toggle('on', +b.dataset.v === SET[k]); }); }); }
let qWas = SET.q;
function openSet() { setTexts(); $('set').classList.add('on'); $('setmenu').style.display = $('title').style.display === 'none' ? '' : 'none'; if (setWas === null) { setWas = G.paused; G.paused = true; } }
function closeSet() { $('set').classList.remove('on'); if (setWas !== null) { G.paused = setWas; setWas = null; } if (SET.q !== qWas) { saveSet(); location.reload(); } }
document.querySelectorAll('#set .seg').forEach(g => g.querySelectorAll('button').forEach(b => b.onclick = () => { SET[g.dataset.k] = +b.dataset.v; saveSet(); setVol(SET.mus, SET.snd); setTexts(); Sfx.ui && Sfx.ui(); }));
// urgent5: volume sliders (master / music / effects / voice), live + saved (audio.js VOL, localStorage qq_vol)
{ const VT = { setMa: ['Ulıwma', 'Umumiy', 'Общая', 'Master'], setFx: ['Effektler', 'Effektlar', 'Эффекты', 'Effects'], setVo: ['Baqsı dawısı', 'Baxshi ovozi', 'Голос рассказчика', 'Voice (narrator)'] };
  ['qq', 'uz', 'ru', 'en'].forEach((lg, i) => { if (L[lg]) for (const k in VT) if (L[lg][k] == null) L[lg][k] = VT[k][i]; }); }
function volUI() { document.querySelectorAll('#set input[data-vk]').forEach(r => { const k = r.dataset.vk, v = VOL[k]; if (document.activeElement !== r) r.value = v; r.style.setProperty('--p', v + '%'); if (r.nextElementSibling) r.nextElementSibling.textContent = v + '%'; }); }
{ let pv = 0; document.querySelectorAll('#set input[data-vk]').forEach(r => { const k = r.dataset.vk;
  r.oninput = () => { initAudio(); setVolume(k, r.value); SET.mus = VOL.music > 0 ? 1 : 0; SET.snd = VOL.sfx > 0 ? 1 : 0; volUI(); const n = performance.now(); if ((k === 'sfx' || k === 'master') && n - pv > 180) { pv = n; Sfx.swing && Sfx.swing(); } };
  r.onchange = () => { saveSet(); if (k === 'sfx' || k === 'master') Sfx.hit && Sfx.hit(); }; }); volUI(); }
// tester request (author, Nov 27): "Start over" — wipes progress, coins, upgrades and tutorial flags; keeps language, volume and settings. Two taps (the first one arms it for 4 s).
{ const RT = { setReset: ["Basınan baslaw", "Boshidan boshlash", "Начать заново", "Start over"], setReset2: ["Isenimińiz kámil me? Jáne basıń", "Ishonchingiz komilmi? Yana bosing", "Точно? Нажмите ещё раз", "Sure? Tap again"] };
  ['qq', 'uz', 'ru', 'en'].forEach((lg, i) => { if (L[lg]) for (const k in RT) if (L[lg][k] == null) L[lg][k] = RT[k][i]; });
  const b = $('setreset'); let armT = 0; const lab = () => { b.textContent = t(armT ? 'setReset2' : 'setReset'); b.classList.toggle('arm', !!armT); };
  const st = setTexts; setTexts = function () { st(); lab(); };
  b.onclick = () => { if (!armT) { armT = setTimeout(() => { armT = 0; lab(); }, 4000); lab(); return; }
    clearTimeout(armT); try { const keep = new Set(['qq_lang', 'qq_vol', 'qq_set']); Object.keys(localStorage).filter(k => /^qq_/.test(k) && !keep.has(k)).forEach(k => localStorage.removeItem(k)); } catch (e) { }
    location.href = location.pathname; }; }
$('bset').onclick = openSet; $('setok').onclick = closeSet; $('setmenu').onclick = () => { saveSet(); location.href = location.pathname; };
document.addEventListener('visibilitychange', () => { if (document.hidden && $('title').style.display === 'none' && !$('set').classList.contains('on') && !G.paused) openSet(); });
addEventListener('keydown', e => { if (e.code === 'Escape') { $('set').classList.contains('on') ? closeSet() : openSet(); } });
window.__T = { prolog, mission1, CHAP, ms: runMission, cut: cutscene, lore, epilogue, spawn, potion: potionSoldier, soul: soulToAmulet, mount: toggleMount, kill: () => enemies().forEach(e => { if (!e.invuln) e.damage(1e6); }) };
loadAssets(f => { $('loadbar').firstChild.style.width = (f * 100) + '%'; }).then(() => {
  ready = true; $('loadbar').style.display = 'none'; $('tplay').style.display = 'block'; if (prog) $('tcont').style.display = 'block'; texts(); setMood(NIGHT); start();
  const s = qs.get('start'); if (s) begin(qs.get('legacy') ? (s === 'prolog' ? prolog : /^ch[1-7]$/.test(s) ? CHAP[+s[2]] : () => mission1(s === 'm1' ? undefined : s)) : /^m?[0-7]-([0-4]|C[1-4]|Q|S)$/.test(s) ? () => runMission(s.replace(/^m/, '')) : s === 'tut' ? () => runMission('0-0') : /^ch[1-7]$/.test(s) ? () => runMission(s[2] + '-1') : s === 'prolog' ? () => runMission('0-1') : () => mission1(s === 'm1' ? undefined : s));
}).catch(e => { $('loadtxt').textContent = 'Error: ' + e.message; console.error(e); });
// prefetch the prologue narration when Start is pressed; fill the title buttons' texts before the load finishes
$('tplay').addEventListener('click', () => { try { if (!qs.get('fast')) preloadVoice('nar1'); } catch (e) { } });   /* prefetch the prologue narration (no videos any more) */
try { texts(); } catch (e) { }
