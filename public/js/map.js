// Qirq qiz — chapter map (title / chapter end) + mission intro fly-over camera
import * as THREE from 'three';
import { G, $, camera, camOverride, world } from './engine.js?v=1795716693';
import { t } from './i18n.js?v=1795716693';
import { Sfx, setMusic, playTitle } from './audio.js?v=1795716693';
import { MLIST, byCh, midx, TYICON, INTRO_M, flyPoints, flyStart } from './missions.js?v=1795716693';

const qs = new URLSearchParams(location.search);
const BOSS = { 0: ['p_ca', 'n_ca'], 1: ['p_qa', 'n_qa'], 2: ['p_qd', 'n_qd'], 3: ['p_ja', 'n_ja'], 4: ['p_ay', 'n_ay'], 5: ['p_qu', 'n_qu'], 6: ['p_qg', 'n_qg'], 7: ['p_su', 'n_su'] };
// node positions on the map (percent of the map area): Sarkop → salt desert → river → sea shore → Darbent → Qashal → horde
// spread evenly (12 % apart, two rows) and matched to the map art; layout() then clamps them under the header / above the chest bar
const NODE = [[8, 68], [22, 30], [32, 68], [44.5, 30], [56, 70], [67.5, 30], [79, 68], [91, 32]];
// region names: candidate spots (percent); the first one that is clear of nodes / camps / HUD is used, otherwise the name is hidden
const PLACE = { m_sar: [[10, 21], [9.5, 25], [14, 47]], m_dar: [[77, 12], [56.5, 12], [66, 13], [74, 48]], m_qas: [[88, 53], [70, 47], [80, 46], [88, 60]] };

// ---------- progress ----------
const ls = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
export function getStars() { try { return JSON.parse(ls('qq_stars', '{}')) || {}; } catch (e) { return {}; } }
export function saveStars(n, k) { const s = getStars(); const old = +s[n] || 0; if (k > old || !(n in s)) { s[n] = Math.max(k, old); try { localStorage.setItem('qq_stars', JSON.stringify(s)); } catch (e) { } } return old; }
function maxCh() { return Math.min(8, +ls('qq_ch', 1) || 1); }
function unlocked(n) { return munlocked(byCh(n)[0].id); }
function done(n) { return byCh(n).every(m => mdone(m.id)) || n in getStars(); }
function current() { const m = curMission(); return m ? m.c : 7; }
// ---- missions: "c-k" keys in qq_stars; a chapter finished before missions existed (qq_ch / old numeric star key) unlocks all of its missions
function legacyCh(c) { const s = getStars(); return (c in s) || (!!ls('qq_prog', null) && maxCh() > c); }
export function mdone(id) { return id in getStars() || (id === '0-0' && (!!ls('qq_prog', null) || !!ls('qq_tut', null))); }
export function munlocked(id) { const i = midx(id); if (i <= 0) return true; const m = MLIST[i], pv = MLIST[i - 1]; return mdone(pv.id) || legacyCh(m.c) || (pv.c !== m.c && !!ls('qq_prog', null) && m.c <= maxCh()); }
function curMission() { return MLIST.find(m => munlocked(m.id) && !mdone(m.id)) || null; }
function chStars(c) { const S = getStars(); let k = 0; for (const m of byCh(c)) k += +S[m.id] || 0; return [k, byCh(c).length * 3]; }

// ---------- CSS ----------
const CSS = `
#map{z-index:56;background:#0a0912;overflow:hidden;font-family:var(--fu)}
#map .pm{position:absolute;inset:0;overflow:hidden;background:#d9bb82 url(./assets/img/ui/map.webp) center/100% 100% no-repeat}
#map .pm:after{content:"";position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 70px 10px rgba(40,18,4,.55);z-index:1}
#map .mh{position:absolute;left:calc(var(--sl) + 10px);right:calc(var(--sr) + 10px);top:calc(var(--st) + 8px);height:44px;display:flex;align-items:center;gap:10px;z-index:4;pointer-events:none}
#map .mh>*{pointer-events:auto}
#map .mh h2{flex:0 1 auto;margin:0 auto;min-width:0;height:40px;padding:0 6px;border-style:solid;border-color:transparent;border-width:0 34px;border-image:url(./assets/img/ui/ribbon.webp) 0 110 fill/0 34px stretch;font:400 clamp(16px,2.4vw,22px)/39px var(--fd);color:var(--gold-l);letter-spacing:.08em;text-shadow:0 2px 2px rgba(40,0,0,.9);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;filter:drop-shadow(0 3px 5px rgba(0,0,0,.6))}
#map .mh button{flex:none;height:44px;padding:0 2px;border-style:solid;border-color:transparent;border-width:0 26px;border-image:url(./assets/img/ui/btn_blue.webp) 0 70 fill/0 26px stretch;background:none;color:#fff4d8;font:400 clamp(14px,1.8vw,17px)/1 var(--fd);letter-spacing:.04em;cursor:pointer;filter:drop-shadow(0 3px 5px rgba(0,0,0,.6))}
#map .mh .tot{flex:none;min-width:86px;height:32px;padding:0 14px 0 34px;border-radius:16px;background:rgba(14,17,42,.9) var(--star1) 6px center/22px no-repeat;box-shadow:0 0 0 1px rgba(232,189,98,.8),0 3px 8px rgba(0,0,0,.5);color:var(--gold-l);font:700 15px/32px var(--fu);text-align:right;text-indent:-9px}
#map .mh .tot:first-letter{font-size:0}
#map .ma{position:absolute;inset:0}
#map svg.bg{position:absolute;inset:0;width:100%;height:100%;filter:drop-shadow(0 1px 1px rgba(255,240,200,.5))}
#map .nd{position:absolute;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;cursor:pointer;z-index:2;width:clamp(96px,13vw,150px)}
#map .nd .ci{position:relative;width:clamp(50px,min(15vh,7.4vw),84px);aspect-ratio:1;border-radius:50%;border:3px solid transparent;background:#1b1420 center/cover;box-shadow:0 0 0 1px #2a1705,0 0 0 3.5px #e8bd62,0 0 0 5px #5a370c,0 6px 12px rgba(30,12,2,.7)}
#map .nd .num{position:absolute;left:-9px;top:-9px;width:24px;height:24px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#e0523a,#6a100e);color:#fff0c0;font:700 13px/22px var(--fu);text-align:center;border:1.5px solid #ffe9ad;box-shadow:0 2px 4px rgba(0,0,0,.6)}
#map .nd .st{margin-top:7px;display:flex;align-items:center;gap:5px;height:16px;padding:0 7px 0 5px;border-radius:8px;background:rgba(14,17,42,.9);box-shadow:0 0 0 1px rgba(232,189,98,.55);font:700 10.5px/16px var(--fu);color:var(--gold-l);letter-spacing:0}
#map .nd .st b{color:#ffcf40;font-weight:400;font-size:11px;margin-right:-3px}
#map .nd .st .pps{display:flex;gap:2.5px;margin:0}
#map .nd .st .pp{width:6px;height:6px;border-radius:50%;background:#3a4070;box-shadow:0 0 0 1px rgba(232,189,98,.5);display:block}
#map .nd .st .pp.d{background:#ffcf40;box-shadow:0 0 0 1px #6a3a00,0 0 4px rgba(255,190,40,.9)}
#map .nd .st .pp.c{background:#fff6d0;animation:mpul2 1.3s infinite}
#map .nd .st .pp.l{opacity:.4}
@keyframes mpul2{50%{box-shadow:0 0 0 2px rgba(255,225,150,.8),0 0 6px 2px rgba(255,190,60,.9)}}
#map .nd .nm{margin-top:3px;max-width:100%;padding:2px 8px 3px;border-radius:7px;background:rgba(241,223,182,.86);box-shadow:0 0 0 1px rgba(90,50,10,.55),0 2px 5px rgba(40,18,4,.35);text-align:center;color:#5a100c;font:400 clamp(11.5px,1.5vw,14px)/1.05 var(--fd);letter-spacing:.03em}
#map .nd .nm small{display:block;font:400 clamp(9.5px,1.15vw,11.5px)/1.1 var(--fu);color:var(--sepia);letter-spacing:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
@media (max-height:460px){#map .nd .ci{width:clamp(44px,13vh,60px)}#map .nd .st{position:relative;z-index:1;margin-top:-8px}html #map .w4camp .ci{width:22px;height:22px;font-size:13px}}
#map .nd.lk .ci{filter:grayscale(1) brightness(.5) sepia(.35)}
#map .nd.lk .ci:after{content:"";position:absolute;left:50%;top:50%;width:54%;height:54%;transform:translate(-50%,-50%);border-radius:50%;background:url(./assets/img/ui/icons.webp) 100% 100%/400% 800%;filter:brightness(1.9) sepia(.2);box-shadow:0 0 0 1px #ffe9ad}
#map .nd.lk .num{filter:grayscale(1) brightness(.7)}
#map .nd.lk .nm,#map .nd.lk .st{opacity:.75}
#map .nd.cur .ci{animation:mpul 1.3s ease-in-out infinite}
@keyframes mpul{50%{box-shadow:0 0 0 1px #2a1705,0 0 0 3.5px #fff0b4,0 0 0 5px #5a370c,0 0 0 9px rgba(255,210,100,.5),0 0 26px 12px rgba(255,170,40,.75)}}
#map .nd.shk{animation:mshk .4s}
@keyframes mshk{25%{transform:translate(-56%,-50%)}75%{transform:translate(-44%,-50%)}}
#map .hero{position:absolute;width:clamp(28px,7.5vh,42px);aspect-ratio:1;border-radius:50%;transform:translate(-50%,-100%);border:2px solid #fff3c8;background:center/cover;box-shadow:0 0 0 1.5px #7a1512,0 4px 8px rgba(0,0,0,.6);z-index:3;animation:mhop 1s ease-in-out infinite;pointer-events:none;transition:left .6s,top .6s}
@keyframes mhop{50%{margin-top:-6px}}
#map .pl{position:absolute;transform:translate(-50%,-50%);color:#4a1a08;font:400 clamp(13px,1.9vw,20px)/1 var(--fd);letter-spacing:.3em;text-transform:uppercase;opacity:.8;pointer-events:none;text-shadow:0 0 4px #f1dfb6,0 0 8px #f1dfb6,0 1px 0 rgba(255,240,200,.8)}
#map .card{position:absolute;left:50%;top:calc(50% + 22px);transform:translate(-50%,-50%) scale(.92);opacity:0;pointer-events:none;transition:opacity .2s,transform .2s;z-index:5;display:grid;grid-template-columns:minmax(120px,150px) 1fr;grid-template-rows:auto auto auto auto 1fr auto;column-gap:14px;align-items:start;width:min(660px,calc(100vw - var(--sl) - var(--sr) - 16px));max-height:calc(100% - 62px);padding:18px 26px 18px 24px}
#map .card.vis{opacity:1;pointer-events:auto;transform:translate(-50%,-50%) scale(1)}
#map .card .tx{display:contents}
#map .card .bp{grid-column:1;grid-row:1;justify-self:center;width:clamp(56px,17vh,84px);aspect-ratio:1;border-radius:50%;background:center/cover;box-shadow:0 0 0 1px #2a1705,0 0 0 3.5px #e8bd62,0 0 0 5px #5a370c,0 5px 10px rgba(0,0,0,.6);margin:4px 0 8px}
#map .card h3{grid-column:1;grid-row:2;margin:0;text-align:center;font:400 clamp(17px,2.3vw,21px)/1.05 var(--fd);color:var(--gold-l);letter-spacing:.05em}
#map .card .cn{grid-column:1;grid-row:3;text-align:center;font:400 12px/1.2 var(--fu);color:var(--parch);margin:2px 0 3px}
#map .card .bs{grid-column:1;grid-row:4;text-align:center;font:700 11px/1.2 var(--fu);color:#ff9a7a;letter-spacing:.04em}
#map .card .bs:empty{display:none}
#map .card .cs{grid-column:1;grid-row:5;align-self:start;justify-self:center;margin-top:5px;height:22px;padding:0 10px 0 8px;border-radius:11px;background:rgba(5,6,16,.6);box-shadow:0 0 0 1px rgba(232,189,98,.5);font:700 13px/22px var(--fu);color:var(--gold-l);letter-spacing:0;white-space:nowrap}
#map .card .cs b{color:#ffcf40;font-weight:400}
#map .card .cs small{display:none}
#map .card .ml{grid-column:2;grid-row:1/7;align-self:stretch;display:flex;flex-direction:column;gap:5px;margin:0;max-height:calc(100vh - 110px);overflow:auto;touch-action:pan-y;padding:2px 30px 2px 2px}
#map .card .mr{display:flex;align-items:center;gap:9px;min-height:46px;padding:4px 10px 4px 7px;border-radius:var(--r-m);background:linear-gradient(180deg,rgba(49,61,134,.4),rgba(10,12,30,.55));box-shadow:inset 0 0 0 1px rgba(232,189,98,.3);cursor:pointer}
#map .card .mr.cur{box-shadow:inset 0 0 0 1.5px #ffe08a,0 0 12px rgba(255,200,80,.4);background:linear-gradient(180deg,rgba(156,31,27,.55),rgba(74,12,14,.6))}
#map .card .mr.bo .mn b{color:#ff8a6a}
#map .card .mr.lk{opacity:.5}
#map .card .mr.shk{animation:mshk2 .4s}
@keyframes mshk2{25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
#map .card .mi{width:32px;height:32px;flex:none;font-size:16px;display:flex;align-items:center;justify-content:center}
#map .card .mi .ic{width:32px;height:32px;margin:0}
#map .card .mn{flex:1;min-width:0;font:700 clamp(12.5px,1.65vw,14.5px)/1.15 var(--fu);color:var(--text);text-align:left}
#map .card .mn b{color:var(--gold);margin-right:5px;font-family:var(--fd);font-weight:400;font-size:1.08em}
#map .card .mn small{display:block;font:400 .82em/1.2 var(--fu);color:var(--mute);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px}
#map .card .ms{flex:none;font-size:15px;letter-spacing:1px;color:#4a5080}
#map .card .ms b{color:#ffcf40;font-weight:400;text-shadow:0 0 6px rgba(255,190,40,.7)}
#map .card .bt{grid-column:1;grid-row:6;display:block;margin-top:8px}
#map .card .bt button.go{display:block;width:100%;height:44px;padding:0 2px;border-style:solid;border-color:transparent;border-width:0 26px;border-image:url(./assets/img/ui/btn_red.webp) 0 70 fill/0 26px stretch;background:none;color:#fff4d8;font:400 17px/1 var(--fd);letter-spacing:.05em;cursor:pointer;white-space:nowrap;filter:drop-shadow(0 3px 4px rgba(0,0,0,.5))}
#map .card .bt button.x{position:absolute;right:2px;top:2px;width:44px;height:44px;padding:0;border:0;background:none;color:var(--gold-l);font:700 17px/1 var(--fu);cursor:pointer}
#map .card .bt button.x:before{content:"";position:absolute;inset:7px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#c9372a,#6a100e);box-shadow:0 0 0 1.5px #ffe9ad,0 2px 5px rgba(0,0,0,.6);z-index:-1}
#map .toast{position:absolute;left:50%;bottom:calc(var(--sb) + 22px);transform:translateX(-50%);padding:7px 18px;border-radius:18px;background:rgba(14,17,42,.94);box-shadow:0 0 0 1px rgba(232,189,98,.7),0 4px 12px rgba(0,0,0,.5);color:var(--gold-l);font:700 13px/1.2 var(--fu);opacity:0;transition:opacity .3s;z-index:6;pointer-events:none;white-space:nowrap}
#map .toast.vis{opacity:1}
#map .toast .ic{width:18px;height:18px;vertical-align:-4px}
/* end screen: styles live in index.html */
/* credits */
#cred{z-index:75;overflow:hidden;cursor:pointer;background:radial-gradient(ellipse at 50% 40%,#1b2350 0%,#10142b 55%,#05050c 100%);font-family:var(--fd)}
#cred .orn{position:absolute;top:0;bottom:0;width:clamp(26px,5vw,60px);opacity:.55;background:repeating-linear-gradient(180deg,transparent 0 18px,rgba(201,149,46,.0) 18px 20px),url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cpath d='M20 2 L38 20 L20 38 L2 20Z' fill='none' stroke='%23c9952e' stroke-width='1.6'/%3E%3Cpath d='M20 10 L30 20 L20 30 L10 20Z' fill='%237a1a10' stroke='%23c9952e' stroke-width='1'/%3E%3Cpath d='M20 0v6M20 34v6' stroke='%23c9952e' stroke-width='1.6'/%3E%3C/svg%3E") center top/100% auto repeat-y}
#cred .orn.l{left:max(8px,env(safe-area-inset-left));border-right:1px solid rgba(201,149,46,.35)}#cred .orn.r{right:max(8px,env(safe-area-inset-right));border-left:1px solid rgba(201,149,46,.35)}
#cred .roll{position:absolute;left:50%;width:min(720px,76vw);transform:translateX(-50%);text-align:center;color:#f3e2bd;top:100%}
#cred .logo{width:min(420px,60vw);max-height:46vh;object-fit:contain;opacity:0;transition:opacity 2.2s;filter:drop-shadow(0 0 24px rgba(255,180,90,.25))}
#cred.go .logo{opacity:1}
#cred .roll p{margin:0 0 .6em;font-size:clamp(14px,2.2vw,20px);line-height:1.45}
#cred .roll .big{font-size:clamp(20px,3.4vw,34px);color:#e8bd62;letter-spacing:.08em;margin-top:1.4em}
#cred .roll .sm{font:400 clamp(12px,1.7vw,15px)/1.4 var(--fu);opacity:.8}
#cred .roll .nm{font-size:clamp(17px,2.8vw,26px);margin:.3em 0}
#cred .roll .gap{height:28vh}
#cred .roll .div{width:240px;height:28px;margin:1.4em auto;background:url(./assets/img/ui/divider.webp) center/contain no-repeat}
#cred .sk{position:absolute;z-index:2;right:calc(max(8px,env(safe-area-inset-right)) + clamp(34px,6vw,70px));bottom:max(10px,env(safe-area-inset-bottom));padding:7px 14px;border-radius:16px;background:rgba(8,10,26,.88);box-shadow:0 0 0 1px rgba(232,189,98,.45);font:700 12px/1 var(--fu);color:#e9dfc8}
#cred:after{content:"";position:absolute;left:0;right:0;bottom:0;height:16vh;background:linear-gradient(0deg,#05050c,transparent);pointer-events:none;z-index:1}#cred:before{content:"";position:absolute;left:0;right:0;top:0;height:12vh;background:linear-gradient(180deg,#0a0c1e,transparent);pointer-events:none;z-index:1}
/* fly-over */
#fly{z-index:22;display:none;cursor:pointer}
#fly.on{display:block}
#fly .lb{position:absolute;left:0;right:0;height:9vh;background:#000;transition:transform .5s}
#fly .lb.t{top:0;transform:translateY(-100%)}#fly .lb.b{bottom:0;transform:translateY(100%)}
#fly.in .lb{transform:none}
#fly .sk{position:absolute;right:max(14px,env(safe-area-inset-right));bottom:calc(9vh + 8px);padding:8px 16px;background:rgba(10,12,30,.6);border:1px solid rgba(232,189,98,.6);border-radius:20px;color:#f1dfb6;font:700 13px/1 var(--fu)}
#fly .lbl{position:absolute;transform:translate(-50%,-100%);padding:4px 10px;border-radius:14px;background:rgba(14,17,42,.88);border:1px solid #e8bd62;color:#f8eed8;font:700 clamp(11px,1.5vw,14px)/1.2 var(--fu);white-space:nowrap;opacity:0;transition:opacity .35s;pointer-events:none;display:flex;align-items:center;gap:6px}
#fly .lbl:after{content:"";position:absolute;left:50%;bottom:-7px;margin-left:-6px;border:6px solid transparent;border-top-color:#e8bd62;border-bottom:0}
#fly .lbl.vis{opacity:1}
#fly .lbl.boss{background:linear-gradient(#9c1f1b,#4a0c0e);border-color:#ffe9ad;font:400 clamp(14px,2vw,18px)/1.1 var(--fd);padding:4px 14px 4px 4px}
#fly .lbl.boss i{width:34px;height:34px;border-radius:50%;background:center/cover;border:1.5px solid #ffd970;flex:none}
#fly .lbl.boss b{color:#ffd970;letter-spacing:.12em;font-size:.8em;display:block}
`;
function css() { if ($('mapcss')) return; const s = document.createElement('style'); s.id = 'mapcss'; s.textContent = CSS; document.head.appendChild(s); }

// ---------- map DOM ----------
function terrainSVG() {
  const P = NODE.map(([x, y]) => [x * 10, y * 5]);
  let d = `M${P[0][0]},${P[0][1]}`; for (let i = 1; i < P.length; i++) { const [x0, y0] = P[i - 1], [x1, y1] = P[i], mx = (x0 + x1) / 2; d += ` C${mx},${y0} ${mx},${y1} ${x1},${y1}`; }
  const mtn = (x, y, s) => `<path d="M${x - 30 * s},${y} L${x - 6 * s},${y - 44 * s} L${x + 4 * s},${y - 30 * s} L${x + 14 * s},${y - 52 * s} L${x + 40 * s},${y} Z" fill="#9a7448" stroke="#5a3a18" stroke-width="1.5" vector-effect="non-scaling-stroke"/><path d="M${x + 14 * s},${y - 52 * s} L${x + 8 * s},${y - 38 * s} L${x + 18 * s},${y - 40 * s} Z M${x - 6 * s},${y - 44 * s} L${x - 11 * s},${y - 34 * s} L${x - 2 * s},${y - 36 * s}Z" fill="#f4ead2"/>`;
  const yurt = (x, y, c = '#a8784a') => `<path d="M${x - 9},${y} L${x - 9},${y - 7} Q${x},${y - 17} ${x + 9},${y - 7} L${x + 9},${y} Z" fill="${c}" stroke="#4a2a10" stroke-width="1" vector-effect="non-scaling-stroke"/>`;
  const tent = (x, y) => `<path d="M${x - 10},${y} L${x},${y - 16} L${x + 10},${y} Z" fill="#7a1a10" stroke="#3a0806" stroke-width="1" vector-effect="non-scaling-stroke"/><path d="M${x},${y - 16} L${x},${y - 24} L${x + 7},${y - 21} L${x},${y - 19}" fill="#2a0a06" stroke="#2a0a06" stroke-width="1" vector-effect="non-scaling-stroke"/>`;
  const dune = (x, y, w) => `<path d="M${x - w},${y} Q${x},${y - w * .35} ${x + w},${y}" fill="none" stroke="#b08850" stroke-width="1.5" vector-effect="non-scaling-stroke"/>`;
  let s = `<svg class="bg" viewBox="0 0 1000 500" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
  <defs><filter id="mpap"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" seed="4"/><feColorMatrix values="0 0 0 0 .35  0 0 0 0 .2  0 0 0 0 .05  0 0 0 .35 0"/></filter>
  <radialGradient id="msea" cx=".5" cy=".6" r=".6"><stop offset="0" stop-color="#4f8a96"/><stop offset=".75" stop-color="#6fa4a8"/><stop offset="1" stop-color="#9fbfae" stop-opacity="0"/></radialGradient>
  <radialGradient id="msalt" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fbf6e6"/><stop offset="1" stop-color="#fbf6e6" stop-opacity="0"/></radialGradient>
  <radialGradient id="mhorde" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#7a1a10" stop-opacity=".45"/><stop offset="1" stop-color="#7a1a10" stop-opacity="0"/></radialGradient></defs>
  <path d="${d}" fill="none" stroke="#4a1a08" stroke-width="3.5" stroke-dasharray="1 8" stroke-linecap="round" vector-effect="non-scaling-stroke" opacity=".8"/>
  <path id="mdone" d="${d}" fill="none" stroke="#b3201a" stroke-width="3.5" stroke-linecap="round" vector-effect="non-scaling-stroke" opacity=".92"/>
  </svg>`;
  return s;
}
let built = false, from = 'title', ctx = null;
function build() {
  css(); if (built) return; built = true;
  const m = document.createElement('div'); m.id = 'map'; m.className = 'layer';
  m.innerHTML = `<div class="pm"><div class="mh"><button class="bk"></button><h2></h2><div class="tot"></div></div><div class="ma">${terrainSVG()}<div class="hero"></div></div><div class="card"><div class="bp"></div><div class="tx"><h3></h3><div class="cn"></div><div class="bs"></div><div class="cs"></div><div class="ml"></div><div class="bt"><button class="go"></button><button class="x">✕</button></div></div></div><div class="toast"></div></div>`;
  document.body.appendChild(m);
  const ma = m.querySelector('.ma'); try { new ResizeObserver(() => relay()).observe(ma); } catch (e) { }
  for (let n = 0; n <= 7; n++) { const [x, y] = NODE[n], b = document.createElement('div'); b.className = 'nd'; b.dataset.n = n; b.style.left = x + '%'; b.style.top = y + '%'; b.innerHTML = `<div class="ci" style="background-image:url(./assets/img/${BOSS[n][0]}.jpg)"><span class="num">${n || '★'}</span></div><div class="st"></div><div class="nm"></div>`; b.onclick = () => tapNode(n, b); ma.appendChild(b); }
  for (const [k, [[x, y]]] of Object.entries(PLACE)) { const p = document.createElement('div'); p.className = 'pl'; p.dataset.k = k; p.style.left = x + '%'; p.style.top = y + '%'; ma.appendChild(p); }
  m.querySelector('.bk').onclick = closeMap; m.querySelector('.card .x').onclick = () => m.querySelector('.card').classList.remove('vis');
  m.addEventListener('pointerdown', e => { const c = m.querySelector('.card'); if (c.classList.contains('vis') && !c.contains(e.target) && !e.target.closest('.nd')) c.classList.remove('vis'); });
}
function refresh() {
  const m = $('map'), S = getStars(), cur = current(); let tot = 0;
  m.querySelector('h2').textContent = t('m_title'); m.querySelector('.bk').textContent = t('m_back');
  m.querySelectorAll('.pl').forEach(p => p.textContent = t(p.dataset.k));
  m.querySelectorAll('.nd').forEach(b => { const n = +b.dataset.n, k = +S[n] || 0, lk = !unlocked(n); tot += k; b.classList.toggle('lk', lk); b.classList.toggle('cur', n === cur && !lk);
    const [ck, cm] = chStars(n), cm1 = curMission(); tot += ck - k;
    b.querySelector('.st').innerHTML = '<span class="pps">' + byCh(n).map(m => `<i class="pp${mdone(m.id) ? ' d' : ''}${cm1 && cm1.id === m.id ? ' c' : ''}${munlocked(m.id) ? '' : ' l'}"></i>`).join('') + '</span><b>★</b>' + ck + '/' + cm;
    b.querySelector('.nm').innerHTML = `${t('ch' + n)}<small>${t('ch' + n + 'n')}</small>`; });
  m.querySelector('.tot').textContent = '★ ' + tot + '/' + MLIST.length * 3;
  { const cmh = curMission(); m.querySelector('.hero').style.backgroundImage = 'url(./assets/img/' + (cmh && /^0-[12]$/.test(cmh.id) ? 'p_al' : 'p_gu') + '.jpg)'; }   /* STORY: the prologue is Allayar's battle; position: layout() */
  progress();
}
// progress line: done fraction of the route (whole segments up to the current chapter + the done share of its missions)
let LP = null;   // node centres in px from layout()
function progress() { const m = $('map'), cur = current(), pth = m.querySelector('#mdone'); try { const cm = curMission(), fr = cur >= 7 && !cm ? 0 : cm ? byCh(cur).indexOf(cm) / byCh(cur).length : 0;
  // non-scaling stroke: the dash pattern is in screen pixels, so measure each road segment in px (the viewBox is stretched)
  let seg; if (LP) seg = LP.slice(1).map((b, i) => { const a = LP[i], mx = (a[0] + b[0]) / 2; let l = 0, q = a; for (let k = 1; k <= 40; k++) { const t = k / 40, u = 1 - t, p = [u * u * u * a[0] + 3 * u * t * mx + t * t * t * b[0], u * u * u * a[1] + 3 * u * u * t * a[1] + 3 * u * t * t * b[1] + t * t * t * b[1]]; l += Math.hypot(p[0] - q[0], p[1] - q[1]); q = p; } return l; });
  else { const L = pth.getTotalLength(); seg = Array(7).fill(L / 7); }
  const Ls = seg.reduce((x, y) => x + y, 0), done = Math.min(Ls, seg.slice(0, cur).reduce((x, y) => x + y, 0) + (seg[cur] || 0) * fr);
  pth.style.strokeDasharray = Ls + 2; pth.style.strokeDashoffset = Ls + 2 - done; } catch (e) { } }

// ---------- layout: nothing clipped by the header / chest bar, nothing overlapping (runs whenever the map is shown or resized) ----------
function layout() {
  const m = $('map'); if (!m || !m.classList.contains('on')) return; const ma = m.querySelector('.ma'), A = ma.getBoundingClientRect(), W = A.width, H = A.height; if (W < 50 || H < 50) return;
  const rel = e => { const r = e.getBoundingClientRect(); return { l: r.left - A.left, t: r.top - A.top, r: r.right - A.left, b: r.bottom - A.top }; };
  const shown = e => e && e.offsetWidth > 0 && e.offsetHeight > 0 && getComputedStyle(e).visibility !== 'hidden' && +getComputedStyle(e).opacity > .05;
  const hit = (a, b, g) => a.l < b.r + g && a.r > b.l - g && a.t < b.b + g && a.b > b.t - g;
  const E = 6;   // screen-edge margin
  const tops = [...m.querySelectorAll('.mh>*')].filter(shown).map(rel), bots = [...m.querySelectorAll('#mt-chestbar')].filter(shown).map(rel), hud = tops.concat(bots);
  // 1) nodes
  const nds = [...ma.querySelectorAll('.nd')], P = [];
  nds.forEach(b => { const n = +b.dataset.n, w = b.offsetWidth, h = b.offsetHeight; let cx = NODE[n][0] / 100 * W, cy = NODE[n][1] / 100 * H;
    cx = Math.max(w / 2 + E, Math.min(W - w / 2 - E, cx)); const l = cx - w / 2, r = cx + w / 2;
    let lo = E + h / 2, hi = H - E - h / 2; for (const o of tops) if (o.r > l && o.l < r) lo = Math.max(lo, o.b + 5 + h / 2); for (const o of bots) if (o.r > l && o.l < r) hi = Math.min(hi, o.t - 5 - h / 2);
    cy = lo > hi ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, cy)); P[n] = [cx, cy, w, h]; });
  for (let pass = 0; pass < 4; pass++) for (let i = 0; i < 7; i++) { const a = P[i], b = P[i + 1], ov = Math.min(a[0] + a[2] / 2, b[0] + b[2] / 2) - Math.max(a[0] - a[2] / 2, b[0] - b[2] / 2) + 4, ovy = Math.min(a[1] + a[3] / 2, b[1] + b[3] / 2) - Math.max(a[1] - a[3] / 2, b[1] - b[3] / 2) + 4;
    if (ov > 0 && ovy > 0) { const d = ov / 2; a[0] = Math.max(a[2] / 2 + E, a[0] - d); b[0] = Math.min(W - b[2] / 2 - E, b[0] + d); } }   // neighbours touching: push apart sideways
  nds.forEach(b => { const p = P[+b.dataset.n]; b.style.left = (p[0] / W * 100).toFixed(2) + '%'; b.style.top = (p[1] / H * 100).toFixed(2) + '%'; });
  // 2) road through the real node centres
  const V = ([x, y]) => [x * 1000 / W, y * 500 / H]; let d = 'M' + V(P[0]).join(','); for (let i = 1; i < 8; i++) { const [x0, y0] = V(P[i - 1]), [x1, y1] = V(P[i]), mx = (x0 + x1) / 2; d += ` C${mx},${y0} ${mx},${y1} ${x1},${y1}`; }
  m.querySelectorAll('svg.bg path').forEach(p => p.setAttribute('d', d)); LP = P.map(p => [p[0], p[1]]); progress();
  const boxes = []; nds.forEach(b => [...b.children].forEach(c => { if (c.offsetWidth > 4) boxes.push(rel(c)); })); [...ma.querySelectorAll('.nd .num')].forEach(c => boxes.push(rel(c)));
  // 3) Gúlayım's token: beside the current node's medallion (never above it, where the header is)
  const cur = current(), hc = ma.querySelector(`.nd[data-n="${cur}"] .ci`), hero = ma.querySelector('.hero');
  if (hc && hero) { const r = rel(hc), hw = hero.offsetWidth || 32; if (!hero.style.left) { hero.style.transition = 'none'; setTimeout(() => hero.style.transition = '', 60); }   /* first placement: no slide in from the corner */ let x = r.r + hw / 2 - 8; if (x + hw / 2 > W - E) x = r.l - hw / 2 + 8; hero.style.left = x + 'px'; hero.style.top = (r.t + (r.b - r.t) / 2 + hw / 2) + 'px'; boxes.push({ l: x - hw / 2, r: x + hw / 2, t: r.t + (r.b - r.t) / 2 - hw / 2 - 6, b: r.t + (r.b - r.t) / 2 + hw / 2 }); }
  const inside = (q, top) => q.l >= E && q.r <= W - E && q.t >= top && q.b <= H - E;
  const topMin = tops.length ? Math.max(...tops.map(o => o.b)) + 3 : E;
  // 4) camp markers: beside the road between their two chapter nodes, clear of nodes, HUD and each other
  const placed = [];
  const B = (a, b, t) => { const mx = (a[0] + b[0]) / 2, u = 1 - t; const x = u * u * u * a[0] + 3 * u * u * t * mx + 3 * u * t * t * mx + t * t * t * b[0], y = u * u * u * a[1] + 3 * u * u * t * a[1] + 3 * u * t * t * b[1] + t * t * t * b[1];
    const dx = 3 * u * u * (mx - a[0]) + 6 * u * t * 0 + 3 * t * t * (b[0] - mx), dy = 6 * u * t * (b[1] - a[1]), L = Math.hypot(dx, dy) || 1; return [x, y, -dy / L, dx / L]; };
  ma.querySelectorAll('.w4camp').forEach(el => { const c = +el.dataset.c, i = +el.dataset.i || 0, k = +el.dataset.k || 1; if (!c || !P[c]) return; el.style.translate = ''; const w = el.offsetWidth, h = el.offsetHeight, f = (i + 1) / (k + 1);
    const box = (x, y) => ({ l: x - w / 2, r: x + w / 2, t: y - h / 2, b: y + h / 2 }), ok = q => inside(q, topMin) && !boxes.some(o => hit(q, o, 3)) && !hud.some(o => hit(q, o, 3)) && !placed.some(o => hit(q, o, 3));
    let best = null, bs = 1e9;
    for (let t = .04; t <= .96; t += .02) { const [x, y, nx, ny] = B(P[c - 1], P[c], t); for (const o of [0, 16, -16, 30, -30, 46, -46, 62, -62]) { const s = Math.abs(t - f) * 120 + Math.abs(o) * .5 + (o === 0 ? 14 : 0); if (s >= bs) continue; const q = box(x + nx * o, y + ny * o); if (ok(q)) { best = q; bs = s; } } }   // 0 offset costs a bit: markers sit beside the road, not on it
    if (!best) { const [x0, y0] = B(P[c - 1], P[c], f); outer: for (let R = 20; R <= 140; R += 12) for (let a = 0; a < 16; a++) { const q = box(x0 + Math.cos(a * Math.PI / 8) * R, y0 + Math.sin(a * Math.PI / 8) * R); if (ok(q)) { best = q; break outer; } } }
    if (!best) { const [x0, y0] = B(P[c - 1], P[c], f); best = box(x0, y0); }
    el.style.left = ((best.l + w / 2) / W * 100).toFixed(2) + '%'; el.style.top = ((best.t + h / 2) / H * 100).toFixed(2) + '%'; placed.push(best); });
  // 5) region names last: first clear candidate, else hidden
  ma.querySelectorAll('.pl').forEach(p => { p.style.visibility = 'hidden'; const w = p.offsetWidth, h = p.offsetHeight; let ok = false;
    for (const [x, y] of PLACE[p.dataset.k] || []) { const cx = x / 100 * W, cy = y / 100 * H, q = { l: cx - w / 2, r: cx + w / 2, t: cy - h / 2, b: cy + h / 2 }; if (inside(q, topMin) && !boxes.some(o => hit(q, o, 4)) && !hud.some(o => hit(q, o, 4)) && !placed.some(o => hit(q, o, 4))) { p.style.left = x + '%'; p.style.top = y + '%'; ok = true; placed.push(q); break; } }
    p.style.visibility = ok ? '' : 'hidden'; });
  m.dataset.lay = '1';
}
window.__MAPL = layout;
let layT = 0, layT2 = 0; const relay = () => { clearTimeout(layT); clearTimeout(layT2); layT = setTimeout(layout, 40); layT2 = setTimeout(layout, 450); };   // second pass: safe-area / app-height vars settle late on phones
addEventListener('resize', relay);   // the app height (--apph) settles a bit after 'resize': watch the map box itself too
function toast(s) { const el = $('map').querySelector('.toast'); el.textContent = s; el.classList.add('vis'); clearTimeout(toast.to); toast.to = setTimeout(() => el.classList.remove('vis'), 2200); }
function tapNode(n, b) {
  Sfx.ui && Sfx.ui();
  if (!unlocked(n)) { b.classList.remove('shk'); void b.offsetWidth; b.classList.add('shk'); toast('🔒 ' + t('m_locked')); return; }
  const c = $('map').querySelector('.card'), k = +getStars()[n] || 0;
  c.querySelector('.bp').style.backgroundImage = `url(./assets/img/${BOSS[n][0]}.jpg)`; c.querySelector('h3').textContent = t('ch' + n); c.querySelector('.cn').textContent = t('ch' + n + 'n');
  c.querySelector('.bs').textContent = n ? t('m_boss') + ': ' + t(BOSS[n][1]) : ''; const [ck, cm] = chStars(n); c.querySelector('.cs').innerHTML = '<b>★</b> ' + ck + '/' + cm + ' <small>' + t('ms_list') + '</small>';
  const S = getStars(), cm1 = curMission(), ml = c.querySelector('.ml'); ml.innerHTML = '';
  for (const m of byCh(n)) { const r = document.createElement('div'), lk = !munlocked(m.id), sk = +S[m.id] || 0; r.className = 'mr' + (lk ? ' lk' : '') + (cm1 && cm1.id === m.id ? ' cur' : '') + (m.boss ? ' bo' : '');
    r.innerHTML = `<span class="mi">${lk ? '🔒' : TYICON[m.ty] || '⚔'}</span><span class="mn"><b>${m.id}</b> ${t(m.n)}<small>${t(m.o)}</small></span><span class="ms">${mdone(m.id) ? '<b>' + '★'.repeat(sk) + '</b>' + '☆'.repeat(3 - sk) : lk ? '' : '▸'}</span>`;
    r.onclick = e => { e.stopPropagation(); Sfx.ui && Sfx.ui(); if (lk) { r.classList.remove('shk'); void r.offsetWidth; r.classList.add('shk'); toast('🔒 ' + t('m_locked2')); return; } startMission(m.id); }; ml.appendChild(r); }
  const go = c.querySelector('.go'); go.textContent = t('m_play'); go.onclick = () => startMission((byCh(n).find(m => munlocked(m.id) && !mdone(m.id)) || byCh(n)[0]).id); c.classList.add('vis');
}
function startMission(id) {
  if (!ctx.run) return; $('map').classList.remove('on'); $('map').querySelector('.card').classList.remove('vis');
  if (from === 'end') { $('end').classList.remove('on'); ctx.run(id); } else ctx.begin(() => ctx.run(id));
}
function startCh(n) {
  const fn = n === 0 ? ctx.prolog : ctx.CHAP[n]; if (!fn) return;
  $('map').classList.remove('on'); $('map').querySelector('.card').classList.remove('vis');
  if (from === 'end') { $('end').classList.remove('on'); fn(); } else ctx.begin(fn);
}
export function openMap(src = 'title') { build(); from = src; refresh(); if (src === 'end') $('end').classList.remove('on'); $('map').classList.add('on'); layout(); try { document.fonts.ready.then(layout); } catch (e) { } }
function closeMap() { $('map').classList.remove('on'); if (from === 'end') $('end').classList.add('on'); }

// ---------- title / end hooks ----------
export function initMap(c) {
  ctx = c; build();
  const tc = $('tcont'); const mb = document.createElement('button'); mb.className = 'btn alt'; mb.id = 'tmap'; mb.style.display = 'none'; tc.after(mb);
  mb.onclick = () => { openMap('title'); }; tc.onclick = () => openMap('title');
  const cb = document.createElement('button'); cb.className = 'btn alt'; cb.id = 'tcred'; cb.style.display = 'none'; $('tbox').appendChild(cb); cb.onclick = () => credits(true);
  const lab = () => { mb.textContent = t('m_btn'); cb.textContent = t('cr_btn'); }; lab(); document.querySelectorAll('#langs button').forEach(b => b.addEventListener('click', lab));
  // show the map button together with the Play button (after assets load)
  const show = () => { if ($('tplay').style.display === 'block') { mb.style.display = 'block'; cb.style.display = 'block'; lab(); if (qs.get('map') && !qs.get('start')) openMap('title'); return true; } };
  if (!show()) { const mo = new MutationObserver(() => { if (show()) mo.disconnect(); }); mo.observe($('tplay'), { attributes: true, attributeFilter: ['style'] }); }
}
// chapter end: save best, animate stars, add Map button
export function endStars(n, k, total = 3) {
  css(); const old = saveStars(n, k); const el = $('stars'); el.innerHTML = '';
  for (let i = 0; i < total; i++) { const s = document.createElement('span'); s.className = 's ' + (i < k ? 'y' : 'n'); s.textContent = i < k ? '★' : '☆'; el.appendChild(s); setTimeout(() => { s.classList.add('vis'); if (i < k && Sfx.pick) Sfx.pick(); }, 450 + i * 380); }
  if (k > old && old > 0) { const b = document.createElement('span'); b.className = 'best'; b.textContent = t('m_best'); el.appendChild(b); setTimeout(() => b.classList.add('vis'), 450 + total * 380); }
  let mb = $('emap'); if (!mb) { mb = document.createElement('button'); mb.id = 'emap'; mb.className = 'btn alt'; $('ereplay').before(mb); }
  mb.textContent = t('m_btn'); mb.onclick = () => { build(); openMap('end'); };
}

// ---------- mission intro fly-over ----------
const INTRO = {
  1: [[0, -50, 'e_horde'], [0, -78, 'e_wolf'], [5, -100, 'e_mage'], [0, -140, 'B']],
  2: [[0, -66, 'e_horde'], [-8, -74, 'e_arch'], [0, -132, 'B']],
  3: [[0, -42, 'e_horde'], [0, -62, 'e_cap'], [0, -108, 'B'], [0, -152, 'e_cap']],
  4: [[0, -45, 'e_horde'], [0, -82, 'e_wolf'], [0, -170.5, 'B']],
  5: [[0, -36, 'e_horde'], [0, -70, 'e_mage'], [0, -136, 'B']],
  6: [[0, -40, 'e_horde'], [0, -120, 'e_gate'], [0, -160, 'B']],
  7: [[0, -44, 'e_horde'], [0, -86, 'n_qa'], [0, -150, 'B']]
};
let flown = null;
// returns a Promise when `a` is a chapter banner title (t('chN')) for a level not yet flown over, else null
export function flyFor(a) {
  if (!a || !G.player || flown === G.player) return null; if (qs.get('fast') && !qs.get('fly')) return null;
  const MS = G.mis; if (MS) { if (a !== t('ch' + MS.c)) return null; const P = flyPoints(); if (!P) return null; flown = G.player;
    // the mission's real units are already standing in the level: fly past them (boss card for bosses, name label for groups)
    return introFly(P.map(q => q.boss && (q.chap || q.img) ? { x: q.x, z: q.z, boss: true, name: q.chap && BOSS[MS.c] ? t(BOSS[MS.c][1]) : q.name, img: q.chap && BOSS[MS.c] ? BOSS[MS.c][0] : q.img } : { x: q.x, z: q.z, label: q.boss ? q.name : q.label, big: q.big }), true); }
  for (let n = 1; n <= 7; n++) if (a === t('ch' + n)) { flown = G.player; return introFly(INTRO[n].map(([x, z, k]) => k === 'B' ? { x, z, boss: true, name: t(BOSS[n][1]), img: BOSS[n][0] } : { x, z, label: t(k) })); }
  return null;
}
const ease = u => u * u * (3 - 2 * u);
const FX = +qs.get('flyx') || 1; // test-only time multiplier for slow headless runs
export function introFly(points, liveUnits) {
  css(); const P = G.player; if (!P || !points || !points.length) return Promise.resolve();
  let fl = $('fly'); if (!fl) { fl = document.createElement('div'); fl.id = 'fly'; fl.className = 'layer'; fl.innerHTML = '<div class="lb t"></div><div class="lb b"></div><div class="sk"></div>'; document.body.appendChild(fl); }
  fl.querySelectorAll('.lbl').forEach(e => e.remove()); fl.querySelector('.sk').textContent = t('skip');
  const portrait = innerHeight > innerWidth, back = portrait ? 1.35 : 1;
  // keyframes: [pos, look, duration-to-reach, label point]
  const K = [], V = (x, y, z) => new THREE.Vector3(x, y, z);
  const bz = Math.min(...points.map(p => p.z));
  K.push({ p: V(P.x * .5, 30 * back, P.z + 24 * back), l: V(0, 0, P.z - 38), d: 0 });
  K.push({ p: V(-6, 22 * back, P.z - 8 + 10 * back), l: V(0, 0, P.z - 52), d: .9 });
  for (const q of points) {
    const el = document.createElement('div'); el.className = 'lbl' + (q.boss ? ' boss' : ''); el.innerHTML = q.boss ? `<i style="background-image:url(./assets/img/${q.img}.jpg)"></i><span><b>${t('m_boss')}</b>${q.name}</span>` : q.label; fl.appendChild(el); q.el = el;
    const side = K.length % 2 ? 1 : -1;
    if (liveUnits) { if (q.boss || q.big) K.push({ p: V(q.x + side * 4.5, 5.2 * back, q.z + 10.5 * back), l: V(q.x, 2.3, q.z), d: 1.9, q, hold: .9 }); else K.push({ p: V(q.x + side * 5.5, 6.2 * back, q.z + 10 * back), l: V(q.x, 1.1, q.z), d: 1.7, q, hold: .55 }); }
    else if (q.boss) K.push({ p: V(q.x + side * 5, 11 * back, q.z + 16 * back), l: V(q.x, 2.2, q.z), d: 1.2, q, hold: .7 });
    else K.push({ p: V(q.x + side * 8, 17 * back, q.z + 19 * back), l: V(q.x, 1, q.z), d: .85, q, hold: .2 });
  }
  K.push({ p: V(P.x * .5, 30 * back, (bz + P.z) / 2 + 36 * back), l: V(0, 0, (bz + P.z) / 2 - 6), d: 1.1 });
  // glowing zone rings: only for the legacy chapter fly-over (no units yet); missions show the real posted units instead
  const rings = (liveUnits ? [] : points).map(q => { const r0 = q.boss ? 4.2 : 3, g = new THREE.Group(); const mk = (a, b, op) => new THREE.Mesh(new THREE.RingGeometry(a, b, 48), new THREE.MeshBasicMaterial({ color: q.boss ? 0xff3010 : 0xff7a30, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    g.add(mk(r0, r0 + .35, .9)); g.add(mk(0, r0, .16)); g.rotation.x = -Math.PI / 2; g.position.set(q.x, .12, q.z); world.add(g); return g; });
  // times
  let tt = 0; const T0 = []; for (const k of K) { tt += k.d; k.t = tt; tt += k.hold || 0; k.te = tt; T0.push(k); }
  const Tm = tt, BL = 1.1; // then blend into the engine's own camera
  const cp = new THREE.CatmullRomCurve3(K.map(k => k.p), false, 'centripetal'), cl = new THREE.CatmullRomCurve3(K.map(k => k.l), false, 'centripetal');
  const N = K.length - 1, pos = new THREE.Vector3(), look = new THREE.Vector3(), sP = new THREE.Vector3(), sL = new THREE.Vector3(), q0 = new THREE.Quaternion(), dP = new THREE.Vector3(), dQ = new THREE.Quaternion(), v = new THREE.Vector3();
  const wasP = G.paused, hud = $('hud').classList.contains('on'); G.paused = !liveUnits; const PL = G.player, px0 = PL.x, pz0 = PL.z, pr0 = PL.rot; if (liveUnits) flyStart(true); let first = true; $('hud').classList.remove('on'); fl.classList.add('on'); requestAnimationFrame(() => fl.classList.add('in'));
  let el = 0, endT = Tm + BL, last = performance.now();
  return new Promise(res => {
    const skip = () => { if (el < Tm) { el = Math.max(el, Tm); endT = Tm + .55; } };
    fl.onpointerdown = e => { e.preventDefault(); skip(); }; const oe = G.onEnter; G.onEnter = skip;
    const finish = () => { camOverride(null); flyStart(false); for (const g of rings) { world.remove(g); g.traverse(m => { if (m.geometry) { m.geometry.dispose(); m.material.dispose(); } }); } fl.classList.remove('in'); fl.onpointerdown = null; G.onEnter = oe || null; setTimeout(() => { fl.classList.remove('on'); fl.querySelectorAll('.lbl').forEach(e => e.remove()); }, 450); if (hud) $('hud').classList.add('on'); G.paused = wasP; res(); };
    G.flyDbg = () => ({ el: +el.toFixed(2), Tm: +Tm.toFixed(2), endT: +endT.toFixed(2) });
    camOverride(cam => {
      const now = performance.now(); el += Math.min(.1, (now - last) / 1000) * FX; last = now;
      dP.copy(cam.position); dQ.copy(cam.quaternion);
      // segment index → spline parameter with ease (camera settles on each keyframe)
      const te = Math.min(el, Tm); let u = 1; for (let i = 1; i <= N; i++) { const a = K[i - 1].te, b = K[i].t; if (te < K[i - 1].te) { u = (i - 1) / N; break; } if (te <= b) { const s = (te - a) / Math.max(.001, b - a); u = (i - 1 + (liveUnits ? s - .6 * Math.sin(6.2832 * s) / 6.2832 : ease(s))) / N; break; } }
      cp.getPoint(Math.min(1, u), pos); cl.getPoint(Math.min(1, u), look);
      // cinematic feel: the camera never stops dead (eased glide), follows with inertia, breathes a little
      if (liveUnits) { const dtc = Math.min(.1, (now - (introFly.lt || now)) / 1000) * FX; introFly.lt = now; const k = first ? 1 : 1 - Math.exp(-dtc * 3.2); first = false; sP.lerp(pos, k); sL.lerp(look, 1 - Math.exp(-dtc * 4.2) + (k === 1 ? 1 : 0)); pos.copy(sP); look.copy(sL); PL.x = px0; PL.z = pz0; PL.rot = pr0; PL.act = null; }
      const sw = Math.min(1, el / 1.5); pos.x += Math.sin(el * 1.3) * .35 * sw; pos.y += Math.sin(el * 1.9 + 1) * .2 * sw + Math.sin(el * 7.3) * .025 * sw; look.x += Math.sin(el * .9 + 2) * .15; look.y += Math.sin(el * 1.1) * .08 * sw;
      cam.position.copy(pos); cam.lookAt(look);
      if (el >= Tm) { const w = ease(Math.min(1, (el - Tm) / (endT - Tm))); q0.copy(cam.quaternion); cam.position.lerp(dP, w); cam.quaternion.copy(q0).slerp(dQ, w); }
      else { G.cam.x = look.x / .85 * .6; G.cam.z = look.z; }
      cam.updateMatrixWorld();
      for (const k of K) if (k.q) { const on = el > k.t - .55 && el < k.te + .5 && el < Tm; k.q.el.classList.toggle('vis', on); if (on) { v.set(k.q.x, k.q.boss ? 4.6 : 2.6, k.q.z).project(cam); if (v.z > 1) k.q.el.classList.remove('vis'); k.q.el.style.left = ((v.x * .5 + .5) * innerWidth) + 'px'; k.q.el.style.top = Math.max(innerHeight * .09 + 48, (-v.y * .5 + .5) * innerHeight) + 'px'; } }
      for (const g of rings) g.scale.setScalar(1 + Math.sin(el * 5) * .06);
      if (el >= endT) finish();
    });
  });
}
// ---------- end credits ----------
export function credits(fromTitle) {
  css(); let c = $('cred'); if (c) c.remove(); c = document.createElement('div'); c.id = 'cred'; c.className = 'layer';
  const nm = t('cr_names').split('|').map(n => `<p class="nm">${n}</p>`).join('');
  c.innerHTML = `<div class="orn l"></div><div class="orn r"></div><div class="roll"><img class="logo" src="./assets/img/nukus_logo_white.webp" alt="Nukus Animation"><div class="div"></div><p class="big">${t('cr_based')}</p><p>${t('cr_ver')}</p><p class="sm">${t('cr_rec')}</p><p class="sm">${t('cr_src')}</p><div class="div"></div><p class="big">${t('cr_made')}</p>${nm}<div class="div"></div><p>© 2026 Nukus Animation</p><div class="gap"></div></div><div class="sk">${t('tap')}</div>`;
  document.body.appendChild(c); c.classList.add('on'); try { setMusic('calm'); } catch (e) { }
  const roll = c.querySelector('.roll'); const t0 = performance.now(); let raf, fin = false;
  return new Promise(res => {
    const end = () => { if (fin) return; fin = true; cancelAnimationFrame(raf); c.style.transition = 'opacity .6s'; c.style.opacity = 0; setTimeout(() => c.remove(), 650); G.onEnter = null; if (fromTitle) { try { playTitle(); } catch (e) { } } res(); };
    setTimeout(() => c.classList.add('go'), 60);
    const H = () => roll.offsetHeight + innerHeight, SP = Math.max(28, innerHeight / 11); // px per second
    const step = now => { const s = (now - t0) / 1000, y = s < 1.6 ? 0 : (s - 1.6) * SP; roll.style.transform = `translate(-50%,${-y - Math.min(innerHeight * .78, innerHeight * .78 * Math.min(1, s / 1.2))}px)`; if (y + innerHeight * .78 > H() - innerHeight * .1) return end(); raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    c.onpointerdown = e => { e.preventDefault(); if (performance.now() - t0 > 600) end(); }; G.onEnter = end;
  });
}
window.__M = { credits, endStars, openMap, introFly, flyFor, getStars, saveStars, munlocked, mdone };
