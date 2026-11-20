// Protsedural tovush va musiqa (WebAudio)
// urgent5: 4 volume sliders (Settings) — master / music / effects / voice, 0-100, saved in localStorage 'qq_vol', applied live to every source
// audio pass (audio_log.md): sprite variants (hit x4, swing x3, block/parry, arrow release/fly/impact, steps per surface, UI set), stingers, biome ambience,
//   crowd bed by fighter count, gallop loop, qobız drone intensity layer, music crossfades with resume + clean loop points, master compressor + limiter,
//   narration ducking, distance/pan helpers, Karakalpak bark text hooks. API list: /home/user/agents/audio_log.md "API".
export const VOL=(()=>{ const d={master:80,music:50,sfx:60,voice:100}; let s=null; try{ s=JSON.parse(localStorage.getItem('qq_vol')||'null'); }catch(e){}
  if(!s){ s={...d}; try{ const o=JSON.parse(localStorage.qq_set||'{}'); if(o.mus===0) s.music=0; if(o.snd===0) s.sfx=0; }catch(e){} }
  for(const k in d) if(typeof s[k]!=='number'||!(s[k]>=0&&s[k]<=100)) s[k]=d[k]; return s; })();
const MUS_K=0.9, SFX_K=0.9, VOX_K=1.0;   // bus trims (effects were 0.9*0.9 before = too loud next to the narration)
export function volOf(k){ const m=VOL.master/100; return k==='master'?m:m*((VOL[k]??100)/100); }
const MEDIA=new Map();   // <audio>/<video> elements: el -> [kind, base]
export function bindMedia(el,kind,base=1){ if(!el) return; MEDIA.set(el,[kind,base]); try{ el.volume=Math.max(0,Math.min(1,volOf(kind)*base)); }catch(e){} }
export function unbindMedia(el){ MEDIA.delete(el); }
function applyVol(){ if(ac){ const t=ac.currentTime; master.gain.setTargetAtTime(volOf('master'),t,.03); musicG.gain.setTargetAtTime(MUS_K*VOL.music/100,t,.03); sfxG.gain.setTargetAtTime(SFX_K*VOL.sfx/100,t,.03); voiceG.gain.setTargetAtTime(VOX_K*VOL.voice/100,t,.03); }
  for(const [el,[k,b]] of MEDIA){ if(!el.isConnected&&el.paused&&el.tagName!=='AUDIO'){ MEDIA.delete(el); continue; } try{ el.volume=Math.max(0,Math.min(1,volOf(k)*b)); }catch(e){} } }
export function setVolume(k,v){ if(!(k in VOL)) return; VOL[k]=Math.max(0,Math.min(100,Math.round(+v||0))); try{ localStorage.setItem('qq_vol',JSON.stringify(VOL)); }catch(e){} applyVol(); }
export function setVol(){ /* legacy on/off toggles (SET.mus/SET.snd) — replaced by the sliders above; kept as a no-op for old callers */ }
let ac=null, master=null, musicG=null, duckG=null, sfxG=null, voiceG=null, noiseBuf=null;
let comp=null, limiter=null, musLP=null, vduckM=null, vduckS=null, ambG=null;
function initAudio0(){
  if(ac){ if(ac.state==='suspended') ac.resume(); return; }
  try{
    ac=new (window.AudioContext||window.webkitAudioContext)();
    // master chain: master -> glue compressor -> brick-wall-ish limiter -> out (nothing clips when 20 swords land at once)
    // WebAudio compressors add automatic make-up gain ((1/fullRangeGain)^0.6: here ~+4 dB comp, ~+0.9 dB limiter) -> 'post' takes most of it back,
    // so quiet scenes sound as before (+~2 dB) and only loud pile-ups are squeezed. Numbers: audio_log.md "Mix check".
    comp=ac.createDynamicsCompressor(); comp.threshold.value=-12; comp.knee.value=6; comp.ratio.value=3; comp.attack.value=.004; comp.release.value=.25;
    limiter=ac.createDynamicsCompressor(); limiter.threshold.value=-1.5; limiter.knee.value=0; limiter.ratio.value=20; limiter.attack.value=.001; limiter.release.value=.08;
    const post=ac.createGain(); post.gain.value=.7;
    master=ac.createGain(); master.gain.value=volOf('master'); master.connect(comp); comp.connect(limiter); limiter.connect(post); post.connect(ac.destination);
    duckG=ac.createGain(); duckG.gain.value=1; duckG.connect(master);
    vduckM=ac.createGain(); vduckM.gain.value=1; vduckM.connect(duckG);                 // narration ducking of the music (-8 dB)
    musLP=ac.createBiquadFilter(); musLP.type='lowpass'; musLP.frequency.value=20000; musLP.Q.value=.5; musLP.connect(vduckM);   // intensity / low-HP filter
    musicG=ac.createGain(); musicG.gain.value=MUS_K*VOL.music/100; musicG.connect(musLP);
    vduckS=ac.createGain(); vduckS.gain.value=1; vduckS.connect(master);
    sfxG=ac.createGain(); sfxG.gain.value=SFX_K*VOL.sfx/100; sfxG.connect(vduckS);
    ambG=ac.createGain(); ambG.gain.value=1; ambG.connect(sfxG);                        // ambience follows the effects slider
    voiceG=ac.createGain(); voiceG.gain.value=VOX_K*VOL.voice/100; voiceG.connect(master);
    noiseBuf=ac.createBuffer(1,ac.sampleRate*1.5,ac.sampleRate); const d=noiseBuf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
    startMusic();
  }catch(e){ ac=null; }
}
function env(g,t,a,d,peak){ g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(peak,t+a); g.gain.exponentialRampToValueAtTime(0.0001,t+a+d); }
function noise(dur,freq,q,peak,type,out,t0){ if(!ac) return; const t=t0||ac.currentTime; const s=ac.createBufferSource(); s.buffer=noiseBuf; const f=ac.createBiquadFilter(); f.type=type||'bandpass'; f.frequency.value=freq; f.Q.value=q||1; const g=ac.createGain(); env(g,t,0.005,dur,peak); s.connect(f); f.connect(g); g.connect(out||sfxG); s.start(t); s.stop(t+dur+0.05); return f; }
function tone(f0,f1,dur,peak,type,out,t0){ if(!ac) return; const t=t0||ac.currentTime; const o=ac.createOscillator(); o.type=type||'sine'; o.frequency.setValueAtTime(f0,t); if(f1) o.frequency.exponentialRampToValueAtTime(f1,t+dur); const g=ac.createGain(); env(g,t,0.006,dur,peak); o.connect(g); g.connect(out||sfxG); o.start(t); o.stop(t+dur+0.05); }
function ring(freqs,dur,peak,t0){ if(!ac) return; const t=t0||ac.currentTime; freqs.forEach((f,i)=>{ const o=ac.createOscillator(); o.type='sine'; o.frequency.value=f*(1+Math.random()*.01); const g=ac.createGain(); env(g,t,0.002,dur*(1-i*.12),peak/(i+1.5)); o.connect(g); g.connect(sfxG); o.start(t); o.stop(t+dur+.05); }); }
function sweep(dur,f0,f1,q,peak,type,t0){ const f=noise(dur,f0,q,peak,type||'bandpass',null,t0); if(f) f.frequency.exponentialRampToValueAtTime(f1,(t0||ac.currentTime)+dur*.9); }
function thump(peak,t0){ noise(0.12,140,0.9,peak,'lowpass',null,t0); }
const _sw=[], _ht=[], _bg=[]; function lim(L,n,win){ const t=ac.currentTime; while(L.length&&t-L[0]>win) L.shift(); if(L.length>=n) return false; L.push(t); return true; }
// procedural fallbacks (used only when a sample file is missing / not decoded yet)
export const Sfx={
  swing(v=1){ if(!ac||v<.04||!lim(_sw,2,.09)) return; const p=.86+Math.random()*.28; sweep(0.17,700*p,3800*p,1.4,0.085*v); sweep(0.12,2500*p,6000*p,2,0.03*v,'bandpass',ac.currentTime+.03); },
  hit(v=1){ if(!ac||v<.04||!lim(_ht,2,.1)) return; const p=.86+Math.random()*.28; noise(0.05,3000*p,0.8,0.15*v,'highpass'); thump(0.24*v); ring([(1900+Math.random()*400)*p,3100*p,4600*p],0.13,0.035*v); },
  big(){ if(!ac||!lim(_bg,2,.15)) return; noise(0.5,180,0.6,0.7,'lowpass'); noise(0.25,900,0.7,0.2,'bandpass'); sweep(0.6,2400,300,0.6,0.1,'bandpass',ac.currentTime+.05); },
  hurt(){ if(!ac) return; thump(0.8); noise(0.07,1500,1,0.35,'bandpass'); },
  arrow(){ if(!ac) return; sweep(0.2,3200,1100,4,0.25); noise(0.03,5000,1,0.2,'highpass'); },
  orb(){ if(!ac) return; sweep(0.4,500,2200,3,0.22); ring([620,930],0.35,0.1); },
  dodge(){ if(!ac) return; sweep(0.22,400,1700,0.8,0.28); noise(0.08,250,0.8,0.25,'lowpass',null,ac.currentTime+.18); },
  howl(){ if(!ac) return; const t=ac.currentTime; [1,1.5].forEach((m,i)=>{ const o=ac.createOscillator(); o.type='triangle'; o.frequency.setValueAtTime(210*m,t); o.frequency.linearRampToValueAtTime(430*m,t+0.5); o.frequency.linearRampToValueAtTime(340*m,t+1.3); const f=ac.createBiquadFilter(); f.type='bandpass'; f.frequency.value=800; f.Q.value=3; const g=ac.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(i?0.12:0.35,t+0.25); g.gain.exponentialRampToValueAtTime(0.0001,t+1.5); o.connect(f); f.connect(g); g.connect(sfxG); o.start(t); o.stop(t+1.6); }); noise(1.3,900,2,0.08,'bandpass'); },
  ui(){ if(!ac) return; ring([880,1320],0.09,0.18); },
  pick(){ if(!ac) return; ring([660,990,1320],0.3,0.22); ring([880,1320],0.3,0.16,ac.currentTime+0.09); },
  power(){ if(!ac) return; const t=ac.currentTime; [220,277,330,440,554,660].forEach((f,i)=>ring([f,f*2,f*3],1.1,0.18,t+i*0.09)); noise(1.2,3000,0.5,0.12,'highpass'); },
  ulti(){ if(!ac) return; const t=ac.currentTime; for(let i=0;i<10;i++){ sweep(0.2,2500,900,3,0.18,'bandpass',t+i*0.07); } noise(0.8,160,0.6,0.7,'lowpass'); },
  death(){ if(!ac) return; thump(0.7); noise(0.3,300,0.7,0.3,'lowpass',null,ac.currentTime+.25); sweep(0.25,1200,300,1,0.15); },
  neigh(){ if(!ac) return; const t=ac.currentTime; const o=ac.createOscillator(); o.type='sawtooth'; o.frequency.setValueAtTime(520,t); o.frequency.linearRampToValueAtTime(900,t+.15); for(let i=0;i<6;i++) o.frequency.linearRampToValueAtTime(i%2?620:760,t+.2+i*.08); o.frequency.linearRampToValueAtTime(380,t+.9); const f=ac.createBiquadFilter(); f.type='bandpass'; f.frequency.value=1100; f.Q.value=2.5; const g=ac.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.22,t+.08); g.gain.exponentialRampToValueAtTime(0.0001,t+1); o.connect(f); f.connect(g); g.connect(sfxG); o.start(t); o.stop(t+1.05); noise(.9,1800,1.5,.05,'bandpass'); },
  hoof(){ if(!ac) return; const t=ac.currentTime; noise(0.05,320,1.2,0.22,'lowpass',null,t); noise(0.04,900,2,0.07,'bandpass',null,t); },
  step(){ if(!ac) return; noise(0.04,220,0.8,0.12,'lowpass'); },
  horn(){ if(!ac) return; const t=ac.currentTime; [98,147,196].forEach((f,i)=>{ const o=ac.createOscillator(); o.type='triangle'; o.frequency.value=f; const fl=ac.createBiquadFilter(); fl.type='lowpass'; fl.frequency.value=700; const g=ac.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(i==2?0.12:0.3,t+0.3); g.gain.setValueAtTime(i==2?0.12:0.3,t+1.2); g.gain.exponentialRampToValueAtTime(0.0001,t+1.9); o.connect(fl); fl.connect(g); g.connect(sfxG); o.start(t); o.stop(t+2); }); }
};
// Procedural music (only before initAudio() switches to the recorded tracks)
let mode='calm', timer=null, step=0, drone=null, droneG=null;
const SCALE=[146.83,164.81,196,220,261.63,293.66,329.63,392];
function startMusic(){
  droneG=ac.createGain(); droneG.gain.value=0.0; droneG.connect(musicG);
  const f=ac.createBiquadFilter(); f.type='lowpass'; f.frequency.value=380; f.connect(droneG);
  [73.42,73.9,110.2].forEach(fr=>{ const o=ac.createOscillator(); o.type='triangle'; o.frequency.value=fr; const g=ac.createGain(); g.gain.value=0.3; o.connect(g); g.connect(f); o.start(); });
  if(!REAL) droneG.gain.linearRampToValueAtTime(0.5,ac.currentTime+3);
  timer=setInterval(tick,180);
}
function drum(t,strong){ tone(strong?110:170,strong?60:110,strong?0.2:0.09,strong?0.6:0.25,'sine',musicG,t); noise(0.05,strong?400:2500,1,strong?0.3:0.12,'bandpass',musicG,t); }
function pluck(f,t,v){ if(!ac) return; const o=ac.createOscillator(); o.type='triangle'; o.frequency.value=f; const o2=ac.createOscillator(); o2.type='triangle'; o2.frequency.value=f*2.003; const g=ac.createGain(); env(g,t,0.004,0.5,v); const g2=ac.createGain(); g2.gain.value=0.25; o.connect(g); o2.connect(g2); g2.connect(g); g.connect(musicG); o.start(t); o2.start(t); o.stop(t+0.6); o2.stop(t+0.6); }
function tick(){
  if(!ac||ac.state!=='running'||mode==='off'||REAL) return;
  const t=ac.currentTime+0.05; const s=step++%16;
  if(mode==='battle'||mode==='boss'){
    if(s%4===0) drum(t,true); else if(s%2===0||(mode==='boss'&&s%4===3)) drum(t,false);
    if(mode==='boss'&&s%8===6) drum(t+0.09,false);
    if(s%4===2&&Math.random()<0.6) pluck(SCALE[(Math.random()*5)|0]*(mode==='boss'?0.5:1),t,0.16);
  } else {
    if(s%8===0) drum(t,true);
    if(s%2===0&&Math.random()<0.45) pluck(SCALE[(Math.random()*8)|0],t,0.14);
  }
}
let autoBattle=false;
export function setMusic(m){ const prev=mode; mode=m; autoBattle=false;
  if(REAL){ if(droneG&&ac) droneG.gain.value=0; if(m==='boss'&&prev!=='boss') Sfx.stinger('boss'); musicUpdate(); if((m==='battle')&&prev!=='battle'&&Math.random()<.5&&!quiet()) playS('cry',.45); return; }
  if(droneG&&ac) droneG.gain.linearRampToValueAtTime(m==='off'?0.0:(m==='calm'?0.4:0.6),ac.currentTime+0.6); }
export function duck(on){ if(duckG&&ac){ const t=ac.currentTime; for(const g of [duckG,ambG]){ g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value,t); g.gain.linearRampToValueAtTime(on?0.0:1,t+0.4); } } }   // cutscenes: music + ambience out

// ---- recorded sounds ----
const BASE='./assets/audio/'; const BUF={}; const last={}; let REAL=false;
const SMAP={swing:['swing'],hit:['hit','hit','clash'],big:['slam'],hurt:['hurt'],arrow:['arrow'],dodge:['dodge'],howl:['howl'],power:['power'],ulti:['power','slam'],death:['death'],neigh:['neigh'],horn:['horn'],pick:['coin']};
function decode(a){ return new Promise((res,rej)=>{ const p=ac.decodeAudioData(a,res,rej); if(p&&p.catch) p.catch(rej); }); }
function loadBuf(name,dir){ if(BUF[name]!==undefined) return BUF[name]; BUF[name]=null; return BUF[name+'_p']=fetch(BASE+dir+'/'+name+'.mp3').then(r=>{ if(!r.ok) throw 0; return r.arrayBuffer(); }).then(decode).then(b=>{ BUF[name]=b; return b; }).catch(()=>{ BUF[name]=false; }); }
// pan / distance: Sfx.at(x,z) places the NEXT sound; or pass {x,z} as the last argument of hit/swing/block/arrowHit/step/bark
let POS=null; const G_=()=>window.__G;
function spatial(pos){ const G=G_(); const P=G&&G.player; if(!pos||!P) return {g:1,pan:0}; const dx=pos.x-P.x, dz=pos.z-P.z, d=Math.hypot(dx,dz);
  return { g:1/(1+Math.max(0,d-3)/9), pan:Math.max(-.8,Math.min(.8,dx/14)) }; }
function out(vol,pan,bus){ const g=ac.createGain(); g.gain.value=vol; let n=g; if(pan&&ac.createStereoPanner){ const p=ac.createStereoPanner(); p.pan.value=pan; g.connect(p); n=p; } n.connect(bus||sfxG); return g; }
function playS(name,vol=1,rate,o){ if(!ac) return false; const b=BUF[name]; if(!b) return false; const now=ac.currentTime; if(last[name]&&now-last[name]<0.045) return true; last[name]=now; const src=ac.createBufferSource(); src.buffer=b; src.playbackRate.value=rate||(0.92+Math.random()*0.16); src.connect(out(vol,o&&o.pan,o&&o.bus)); src.start(now+((o&&o.delay)||0)); return true; }
// sprites: one file per family, fixed slots (fewer requests than 30 tiny files); variant never repeats twice in a row
const SPR={ hit:{slot:.6,n:4}, swing:{slot:.5,n:3}, block:{slot:.9,n:3}, arrow:{slot:.8,n:4}, step:{slot:.3,n:9}, ui:{slot:1,n:6}, drum:{slot:1.5,n:2} };
const lastV={};
function pickV(fam,list){ let i; const L=lastV[fam]; do{ i=list[(Math.random()*list.length)|0]; }while(list.length>1&&i===L); lastV[fam]=i; return i; }
function spr(fam,idx,vol=1,o={}){ if(!ac) return false; const b=BUF['s_'+fam], S=SPR[fam]; if(!b) return false;
  const src=ac.createBufferSource(); src.buffer=b; src.playbackRate.value=o.rate||(0.93+Math.random()*0.14);
  src.connect(out(vol,o.pan,o.bus)); const t=ac.currentTime+(o.delay||0); src.start(t,idx*S.slot,S.slot); return true; }
function loadSpr(f){ const k='s_'+f; if(BUF[k]!==undefined) return; BUF[k]=null; fetch(BASE+'sfx/v_'+f+'.mp3').then(r=>{ if(!r.ok) throw 0; return r.arrayBuffer(); }).then(decode).then(b=>{ BUF[k]=b; }).catch(()=>{ BUF[k]=false; }); }
function preload(){ ['swing','hit','clash','slam','hurt','arrow','dodge','howl','power','death','neigh','horn','coin','cry','roar','gallop'].forEach(n=>loadBuf(n,'sfx')); Object.keys(SPR).forEach(loadSpr);
  setTimeout(()=>{ ['st_boss','st_phase','st_win','st_lose','roll'].forEach(n=>loadBuf(n,'sfx')); },4000); }
const SVOL={hit:.8,swing:.8,big:.75,ulti:.85,neigh:.45,horn:.55,death:.7,howl:.75,hurt:.85};   // urgent5 mix trims (real samples were all at 1.0)
const CD={neigh:3.5,horn:1.5,howl:1.2};   // min seconds between repeats (mass mount-ups / several camps waking)
const quiet=()=>{ try{ const f=document.getElementById('fade'); return !!(f&&f.classList.contains('in')); }catch(e){ return false; } };   // black fade = level is being built: nothing to hear yet
const cdT={};
const takePos=a=>{ const l=a[a.length-1]; if(l&&typeof l==='object'&&'x' in l) return l; const p=POS; POS=null; return p; };
// variant tables: which sprite slots / single files each call may use
const HITV={ any:[0,1,2,3], flesh:[0,1], cut:[1], armor:[2], heavy:[3], light:[0,1,2] };
for(const k in SMAP){ const f=Sfx[k]; Sfx[k]=function(...a){ if(quiet()&&k!=='pick') return; if(CD[k]&&ac){ if(ac.currentTime-(cdT[k]||-9)<CD[k]) return; cdT[k]=ac.currentTime; }
  const pos=takePos(a), sp=spatial(pos);
  if(k==='hit'||k==='swing'){ if(!ac) return; const v=typeof a[0]==='number'?a[0]:1; if(v<.04) return; const L=k==='hit'?_ht:_sw; if(!lim(L,3,.1)) return;
    const kind=typeof a[0]==='string'?a[0]:'any'; const vol=(SVOL[k]??1)*v*sp.g;
    if(k==='hit'){ const list=HITV[kind]||HITV.any; if(Math.random()<.2&&kind==='any'&&playS(Math.random()<.5?'hit':'clash',vol*.9,0,{pan:sp.pan})) { lastV.hit=-1; return; } if(spr('hit',pickV('hit',list),vol,{pan:sp.pan})) return; }
    else { const i=pickV('swing',[0,1,2,3]); if(i===3?playS('swing',vol,0,{pan:sp.pan}):spr('swing',i,vol*.9,{pan:sp.pan})) return; }
    return f&&f.apply(Sfx,a); }
  if(k==='arrow'){ if(spr('arrow',0,.7,{pan:sp.pan})){ spr('arrow',1,.35,{delay:.05,pan:sp.pan}); return; } }
  if(k==='power'){ const G=G_(); if(G&&G.paused&&!quiet()){ if(Sfx.ui('upgrade')) return; } else bark('maid','skill',null,.35); }
  if(k==='ulti') bark('maid','skill',null,.8);
  if(k==='horn'){ hornExtra(); }
  if(k==='big'&&Math.random()<.35&&BUF.s_hit) spr('hit',3,.45*sp.g,{rate:.8,pan:sp.pan});
  const l=SMAP[k]; const n=l[(Math.random()*l.length)|0]; if(playS(n, (SVOL[k]??1)*sp.g, 0, {pan:sp.pan})) return; return f&&f.apply(Sfx,a); }; }
// horn = súren. In a running fight a 2nd horn means a new wave: add the drum roll + an enemy shout
function hornExtra(){ const G=G_(); if(!G||G.paused) return; if(fight.nE>0&&ac&&ac.currentTime-(cdT.wave||-9)>6){ cdT.wave=ac.currentTime; playS('roll',.55,1); bark('enemy','wave',null,.9); } }
// gallop: the engine calls Sfx.hoof() per stride of the player's horse -> we keep a looped gallop alive (speed-matched in the ticker)
let hoofT=-9; { const hf=Sfx.hoof; Sfx.hoof=function(...a){ if(!ac) return; hoofT=ac.currentTime; if(LOOP.gallop||BUF.l_gallop_loop) return; if(BUF.gallop){ if(!quiet()&&ac.currentTime-(cdT.gal||-9)>3.4){ cdT.gal=ac.currentTime; playS('gallop',.4,1); } return; } return hf&&hf.apply(Sfx,a); }; }
Sfx.roar=()=>!quiet()&&playS('roar',.8,1); Sfx.cry=()=>!quiet()&&playS('cry',.55,1);
// --- new API (other owners call these; all are safe no-ops before initAudio) ---
Sfx.at=(x,z)=>{ POS={x,z}; return Sfx; };
Sfx.block=(kind='block',pos)=>{ if(!ac||quiet()) return; const sp=spatial(pos||takePos([])); const i=kind==='parry'?2:pickV('block',[0,1]); if(!spr('block',i,(kind==='parry'?.8:.7)*sp.g,{pan:sp.pan})) Sfx.hit(); if(kind==='parry') bark('maid','parry',null,.25); };
Sfx.parry=pos=>Sfx.block('parry',pos);
Sfx.arrowHit=(kind='body',pos)=>{ if(!ac||quiet()) return; const sp=spatial(pos||takePos([])); spr('arrow',kind==='wood'?3:2,.6*sp.g,{pan:sp.pan}); };
const STEPI={sand:[0,1,2],grass:[3,4,5],wood:[6,7,8],stone:[6,7,8]};
Sfx.step=(surface,vol=.3,pos)=>{ if(!ac||quiet()) return; const s=STEPI[surface]?surface:surfaceNow(); const sp=spatial(pos);
  if(!spr('step',pickV('step_'+s,STEPI[s]),vol*sp.g,{rate:(s==='stone'?.8:1)*(0.92+Math.random()*.16),pan:sp.pan})) noise(0.04,220,0.8,0.12*vol/.3,'lowpass'); };
const UII={tap:0,confirm:1,back:2,upgrade:3,star:4,coin:5}; const UIV={tap:.55,confirm:.6,back:.5,upgrade:.7,star:.7,coin:.6};
{ const uf=Sfx.ui; Sfx.ui=(kind='tap')=>{ if(!ac) return false; const k=kind in UII?kind:'tap'; const now=ac.currentTime; if(now-(cdT['ui_'+k]||-9)<(k==='star'?.12:.07)) return true; cdT['ui_'+k]=now;
  if(spr('ui',UII[k],UIV[k],{rate:k==='star'?1:0.98+Math.random()*.04})) return true; uf(); return false; }; }
Sfx.stinger=(kind)=>{ if(!ac) return; const now=ac.currentTime; if(now-(cdT['st_'+kind]||-9)<(kind==='phase'?2.5:5)) return; cdT['st_'+kind]=now;
  if(kind==='start'){ spr('drum',0,.8); spr('drum',1,.7,{delay:.42}); setTimeout(()=>{ if(!quiet()) Sfx.horn(); },700); bark('maid','start',null,.6); return; }
  if(kind==='wave'){ playS('roll',.6,1); setTimeout(()=>Sfx.horn(),1500); return; }
  const f={boss:'st_boss',phase:'st_phase',win:'st_win',lose:'st_lose'}[kind]; if(!f) return;
  if(kind==='phase'||kind==='boss') musicDip(kind==='boss'?2.6:1.6);
  if(!playS(f,kind==='phase'?.8:.85,1)) loadBuf(f,'sfx'); };
Sfx.win=()=>{ mode='win'; autoBattle=false; playTrack(null,true,.6); Sfx.stinger('win'); bark('maid','win',null,1); setTimeout(()=>{ if(mode==='win') playTrack('win',false); },2400); };
Sfx.defeat=()=>{ Sfx.stinger('lose'); };
Sfx.bark=(who,key,pos)=>bark(who,key,pos,1);
Sfx.amb=(name)=>{ AMB_OVR=name||null; };            // force a biome bed: 'steppe'|'desert'|'shore'|'river'|'night'|'city'|'storm'|'off'|null (auto)
Sfx.loop=(name,on,opt={})=>{ EXTRA[name]=on?{v:opt.vol??1,pos:opt.x!=null?{x:opt.x,z:opt.z}:null}:null; };   // 'cart' | 'fire' | 'river' | 'crowd' extra loops
Sfx.surface=name=>{ SURF_OVR=STEPI[name]?name:null; };   // footstep surface override: 'sand'|'grass'|'wood'|'stone'|null (auto by chapter)
Sfx.intensity=v=>{ FORCE_I=v==null?null:Math.max(0,Math.min(1,v)); };   // optional override of the automatic combat intensity (0..1)

// ---- Karakalpak barks: on-screen text only (no voice yet). Author checks the lines: audio_log.md "BARKS" ----
const BARKS={
  maid:{ start:['Alǵa, qızlar!','Súren! Atqa minińler!','Qırq qız — bir jan!'], skill:['Jawǵa jol joq!','Gúlayım biz benen!','Alǵa, qızlar!'], parry:['Shıda, sińlim!','Jawǵa jol joq!'],
         win:['Jeńis bizdiki!','Barekelle, qızlar!'], wave:['Taǵı keledi — tayar bolıń!','Eldi qorǵayıq!'], hurt:['Shıda, sińlim!'], kill:['Barekelle!','Eldi qorǵayıq!'] },
  enemy:{ wave:['Hújim!','Tutıń olardı!','Qızlardı qamańlar!'], start:['Qashpasın!','Hújim!'], flee:['Sheginiń!'], boss:['Kim maǵan qarsı shıǵadı?!'], kill:['Qashpasın!'] }
};
let barkT=-9, barkEl=null, barkTo=0;
function bark(who,key,pos,chance=1){ try{ if(Math.random()>chance) return; const now=performance.now()/1000; if(now-barkT<4) return; const G=G_(); if(!G||G.paused||quiet()) return;
  const L=(BARKS[who]||{})[key]; let txt=Array.isArray(L)?L[(Math.random()*L.length)|0]:(typeof key==='string'&&/\s/.test(key)?key:null);   // unknown key with a space = literal text if(!txt) return; barkT=now;
  const ev=new CustomEvent('qq:bark',{detail:{who,key,text:txt,pos},cancelable:true}); if(!window.dispatchEvent(ev)) return;   // a UI owner may draw it itself (preventDefault)
  if(!barkEl){ barkEl=document.createElement('div'); barkEl.id='qqbark'; barkEl.style.cssText='position:fixed;left:50%;top:21%;transform:translateX(-50%);z-index:30;pointer-events:none;font:700 italic clamp(15px,2.3vw,24px)/1.2 Georgia,serif;letter-spacing:.02em;text-shadow:0 2px 6px #000,0 0 2px #000;opacity:0;transition:opacity .25s;white-space:nowrap'; document.body.appendChild(barkEl); }
  barkEl.textContent='« '+txt+' »'; barkEl.style.color=who==='enemy'?'#ff9a86':'#ffe3a0'; barkEl.style.opacity='1'; clearTimeout(barkTo); barkTo=setTimeout(()=>{ barkEl.style.opacity='0'; },1700);
}catch(e){} }

// ---- music: crossfades driven by game state, resume position per track, clean loop points ----
// loop lengths (s) of the re-cut tracks (audio pass: fade-in/out removed, tail cross-faded into the head at a spectrally matched point)
const LOOPLEN={battle:111.4201,boss:81.6008,calm:80.3802,title:65.0079,steppe:45.7143};
let cur=null, curName=null; const TR={battle:'battle',calm:'calm',boss:'boss',win:'win',title:'title',steppe:'steppe'}; const OFFS={};
function loopPts(b,name){ const d=b.getChannelData(0); let i=0; const n=Math.min(d.length,b.sampleRate*.5); while(i<n&&Math.abs(d[i])<1e-3) i++; const s=i/b.sampleRate; const L=LOOPLEN[name]; return (L&&s+L<=b.duration+.002)?[s,Math.min(b.duration,s+L)]:[0,b.duration]; }
function fadeOut(o,sec){ const t=ac.currentTime; o.g.gain.cancelScheduledValues(t); o.g.gain.setValueAtTime(o.g.gain.value,t); o.g.gain.linearRampToValueAtTime(0,t+sec); try{ o.s.stop(t+sec+.05); }catch(e){}
  if(o.loop&&o.name!=='boss'){ const [a,b]=o.lp; OFFS[o.name]=a+(((t-o.t0)*1+o.off-a)%(b-a)+(b-a))%(b-a); } }
function playTrack(name,loop=true,fo){ if(!ac) return; if(name===curName) return; curName=name; const old=cur; cur=null;
  const xf=fo||(name==='boss'?1.2:2.2); if(old) fadeOut(old,xf);
  if(!name) return; const f=TR[name]; const go=b=>{ if(!b||curName!==name||(cur&&cur.name===name)) return; const s=ac.createBufferSource(); s.buffer=b; s.loop=loop; const lp=loopPts(b,f); if(loop){ s.loopStart=lp[0]; s.loopEnd=lp[1]; }
    const off=(loop&&OFFS[f]!=null&&name!=='boss')?OFFS[f]:lp[0]; const g=ac.createGain(); g.gain.value=0; s.connect(g); g.connect(musicG); s.start(ac.currentTime,off);
    const tgt={calm:.75,steppe:.62,title:.85,win:.85,battle:.9,boss:.92}[name]||.85; g.gain.setValueAtTime(0,ac.currentTime); g.gain.linearRampToValueAtTime(tgt,ac.currentTime+(off>lp[0]+.5?xf:Math.min(xf,1.6))); cur={s,g,name:f,loop,lp,off,t0:ac.currentTime}; };
  const b=BUF['m_'+f]; if(b) go(b); else if(b!==false){ if(BUF['m_'+f+'_p']) { BUF['m_'+f+'_p'].then(()=>go(BUF['m_'+f])); return; } BUF['m_'+f+'_p']=fetch(BASE+'music/'+f+'.mp3').then(r=>{ if(!r.ok) throw 0; return r.arrayBuffer(); }).then(decode).then(b=>{ BUF['m_'+f]=b; go(b); }).catch(()=>{ BUF['m_'+f]=false; if(name==='steppe'){ TR.steppe='calm'; curName=null; musicUpdate(); } }); } }
let dipUntil=0;
function musicDip(sec){ if(!ac) return; dipUntil=ac.currentTime+sec; }
let deadOn=false;
function mapOn(){ const m=document.getElementById('map'); return !!(m&&m.classList.contains('on')); }
function wantTrack(){ if(deadOn) return null; if(mapOn()) return 'steppe'; if(mode==='off') return null; if(mode==='win') return curName==='win'?'win':null;
  if(mode==='calm'){ if(autoBattle) return 'battle'; return 'calm'; }
  return mode; }
function musicUpdate(){ if(!ac||!REAL) return; const w=wantTrack(); if(w!==curName&&(mode!=='win'||w==='steppe')) playTrack(w); }
export function playTitle(){ if(REAL){ mode='title'; playTrack('title'); } }

// ---- ambience + crowd + gallop + qobız drone loops (lazy-loaded, gain driven by the ticker) ----
const LOOP={}; let AMB_OVR=null; const EXTRA={}; let FORCE_I=null;
function loopNode(name){ if(LOOP[name]) return LOOP[name]; const k='l_'+name; if(BUF[k]===undefined){ BUF[k]=null; fetch(BASE+'sfx/'+name+'.mp3').then(r=>{ if(!r.ok) throw 0; return r.arrayBuffer(); }).then(decode).then(b=>{ BUF[k]=b; }).catch(()=>{ BUF[k]=false; }); }
  const b=BUF[k]; if(!b) return null; const s=ac.createBufferSource(); s.buffer=b; s.loop=true; const d=b.getChannelData(0); let i=0; while(i<2000&&Math.abs(d[i])<1e-4) i++; s.loopStart=i/b.sampleRate; s.loopEnd=b.duration-Math.max(0,(b.duration-s.loopStart)-(LLEN[name]||b.duration))-0; if(!(s.loopEnd>s.loopStart+1)) s.loopEnd=b.duration;
  const g=ac.createGain(); g.gain.value=0; let n=g; let p=null; if(ac.createStereoPanner){ p=ac.createStereoPanner(); g.connect(p); n=p; } n.connect(name==='drone'?musicG:ambG); s.start(ac.currentTime,s.loopStart+Math.random()*(s.loopEnd-s.loopStart)); return LOOP[name]={s,g,p}; }
const LLEN={amb_steppe:12,amb_desert:12,amb_shore:12,amb_night:10,amb_river:8,amb_fire:8,amb_cart:4.8,amb_crowd:10,gallop_loop:3.2,drone:14};
function loopSet(name,v,tc=.5,pan){ if(!ac) return; if(v<=.001&&!LOOP[name]) return; const L=loopNode(name); if(!L) return; L.g.gain.setTargetAtTime(v,ac.currentTime,tc); if(L.p&&pan!=null) L.p.pan.setTargetAtTime(pan,ac.currentTime,.2); return L; }
// biome by chapter (scenery.js): 0 village night, 1 steppe, 2 desert, 3 river camp, 4 sea shore, 5 Darbent pass, 6 Qashal city, 7 storm horde
const BIOME={0:'steppe',1:'steppe',2:'desert',3:'river',4:'shore',5:'pass',6:'city',7:'storm'};
const BEDS={ steppe:[['amb_steppe',.55]], desert:[['amb_desert',.6]], river:[['amb_steppe',.35],['amb_river',.5]], shore:[['amb_shore',.6],['amb_steppe',.2]],
  pass:[['amb_desert',.45],['amb_steppe',.3]], city:[['amb_steppe',.25]], storm:[['amb_desert',.7]], night:[['amb_night',.5]], off:[] };
const SURF={0:'grass',1:'grass',2:'sand',3:'grass',4:'sand',5:'stone',6:'stone',7:'grass'};
function chap(){ const G=G_(); const id=G&&G.mis&&G.mis.id; const c=id?parseInt(String(id),10):NaN; return isNaN(c)?null:c; }
let SURF_OVR=null;
function surfaceNow(){ if(SURF_OVR) return SURF_OVR; const c=chap(); return c==null?'grass':SURF[c]||'grass'; }
const fight={nE:0,nA:0,I:0};
let lastP=null, stepAcc=0, lastBoss=null, lastPhase=1, startRun=null, endStars=0, lastHp=1, tkT=0;
const ACTIVE=/chase|windup|side|back|block|pounce|recover|crouch|kit/;
function ticker(){ if(!ac||!REAL||ac.state!=='running') return; const now=ac.currentTime; const dt=Math.min(.5,now-(tkT||now)); tkT=now; const G=G_(); const q=quiet();
  // defeat overlay
  const de=document.getElementById('dead'); const dOn=!!(de&&de.classList.contains('on')); if(dOn!==deadOn){ deadOn=dOn; if(dOn) Sfx.stinger('lose'); musicUpdate(); }
  // end screen stars -> chime per star as they appear
  const en=document.getElementById('end'); if(en&&en.classList.contains('on')){ const st=document.getElementById('stars'); const n=st?(st.textContent.match(/★/g)||[]).length:0; if(n>endStars){ for(let i=0;i<n-endStars;i++) setTimeout(()=>Sfx.ui('star'),i*180); endStars=n; } } else endStars=0;
  const P=G&&G.player; const live=!!(G&&P&&!G.paused&&!q&&!P.dead&&!deadOn);
  // fighters near the player
  let nE=0,nA=0; if(live){ for(const e of G.ents){ if(e.dead||e===P) continue; const d=Math.hypot(e.x-P.x,e.z-P.z); if(d>28) continue; if(e.team==='enemy'&&(ACTIVE.test(e.state||'')||d<9)) nE++; else if(e.team==='ally'&&ACTIVE.test(e.state||'')) nA++; } }
  fight.nE=nE; fight.nA=nA; const Iraw=FORCE_I!=null?FORCE_I:Math.min(1,nE/8+(G&&G.boss&&!G.boss.dead?.5:0)); fight.I+=(Iraw-fight.I)*Math.min(1,dt*1.2);
  // auto battle music when a fight breaks out while the mission left 'calm' playing (and back after 5 s of quiet)
  if(mode==='calm'&&live){ if(nE>=3&&!autoBattle){ fight.calmT=0; autoBattle=true; musicUpdate(); } else if(autoBattle&&nE===0){ fight.calmT=(fight.calmT||0)+dt; if(fight.calmT>5){ autoBattle=false; musicUpdate(); } } else fight.calmT=0; }
  musicUpdate();
  // music filter: battle opens with intensity; hero HP < 25 % -> 900 Hz low-pass ("heartbeat" moment); stingers dip the music briefly
  let fc=20000; if(live&&(mode==='battle'||autoBattle)) fc=3500+Math.pow(fight.I,1.5)*17000; const hpR=live?P.hp/(P.maxHp||1):1; if(live&&hpR<.25) fc=Math.min(fc,900);
  musLP.frequency.setTargetAtTime(Math.min(20000,fc),now,.35); vduckM.gain.setTargetAtTime((vCur&&vCur.playing?.4:1)*(now<dipUntil?.45:1),now,now<dipUntil?.08:.4);
  if(live&&hpR<lastHp-.18&&hpR<.5) bark('maid','hurt',null,.3); lastHp=hpR;
  // qobız drone: boss fights + heavy fights
  const bossOn=!!(G&&G.boss&&!G.boss.dead&&live); loopSet('drone',bossOn?.32:(mode==='battle'||autoBattle)&&live?Math.max(0,fight.I-.55)*.5:0,1.5);
  // boss phase change (bosses bump e.phase at 50 % / 20 % hp)
  if(bossOn){ if(G.boss!==lastBoss){ lastBoss=G.boss; lastPhase=G.boss.phase||1; bark('enemy','boss',null,.7); } else if((G.boss.phase||1)>lastPhase){ lastPhase=G.boss.phase; Sfx.stinger('phase'); } }
  // mission start: drums + súren once per run (G.mis.started is set by missions.js mstart())
  if(G&&G.mis&&G.mis.started&&G.mis.run!==startRun&&live){ startRun=G.mis.run; Sfx.stinger('start'); }
  // ambience bed
  const c=chap(); let bed=AMB_OVR||(c==null?null:BIOME[c]); const beds=[]; if(bed&&BEDS[bed]) beds.push(...BEDS[bed]); if(G&&G.night&&bed&&bed!=='desert'&&bed!=='storm'&&!AMB_OVR) beds.push(['amb_night',.45]);
  const ambOn=live||(G&&G.mis&&!G.paused&&!q&&!deadOn); const want={};
  for(const [n,v] of beds) want[n]=Math.max(want[n]||0,v*(1-.45*fight.I));
  // fire: nearest burning fire (fx.js G.fires) within 14 m
  if(live&&G.fires&&G.fires.length){ let bd=1e9,bf=null; for(const f of G.fires){ const d=Math.hypot(f.x-P.x,f.z-P.z); if(d<bd){ bd=d; bf=f; } } if(bd<14){ want.amb_fire=Math.max(want.amb_fire||0,.7/(1+bd/3)); fight.firePan=Math.max(-.7,Math.min(.7,(bf.x-P.x)/10)); } }
  for(const k in EXTRA){ const x=EXTRA[k]; if(!x) continue; const n='amb_'+k; const sp=spatial(x.pos); want[n]=Math.max(want[n]||0,.6*x.v*sp.g); }
  // crowd battle bed: scales with the number of fighters around the hero
  const fighters=nE+nA; want.amb_crowd=live&&nE>0?Math.min(.75,Math.max(0,(fighters-2)/14)*.75+(nE>=2?.12:0)):0;
  for(const n of ['amb_steppe','amb_desert','amb_shore','amb_night','amb_river','amb_fire','amb_cart','amb_crowd']) loopSet(n,ambOn?(want[n]||0):0,n==='amb_crowd'?1.2:1.5,n==='amb_fire'?fight.firePan:null);
  // player footsteps (not mounted) + gallop loop (mounted)
  let spd=0; if(live){ if(lastP){ spd=Math.hypot(P.x-lastP.x,P.z-lastP.z)/Math.max(dt,.05); } lastP={x:P.x,z:P.z}; } else lastP=null;
  if(live&&P.mounted){ const v=Math.min(1,spd/9); const g=(spd>2||now-hoofT<.6)?.32+.28*v:0; const L=loopSet('gallop_loop',g,.25); if(L) L.s.playbackRate.setTargetAtTime(Math.max(.8,Math.min(1.3,.75+spd/22)),now,.3); stepAcc=0; }
  else { loopSet('gallop_loop',0,.2); if(live&&spd>1.3&&spd<14&&!P.leaping&&(P.y||0)<.3){ stepAcc+=dt/Math.max(.26,Math.min(.5,.62-spd*.04)); if(stepAcc>=1){ stepAcc-=1; Sfx.step(null,.22); } } else stepAcc=.6; }
}
setInterval(()=>{ try{ ticker(); }catch(e){ if(!ticker.w){ ticker.w=1; console.warn('[audio] ticker',e); } } },150);
// UI clicks: every button outside the combat HUD gets a tap; title play / continue / next = confirm; close / back = back
document.addEventListener('click',e=>{ if(!REAL||!ac) return; const b=e.target&&e.target.closest&&e.target.closest('button,.btn,[role=button]'); if(!b||b.closest('#hud,#btns,#joy,#bset')) return;
  const id=(b.id||'')+' '+(b.className||''); let k='tap'; if(/tplay|tcont|ereplay|setok|dretry|confirm|ok\b|play|start/i.test(id)) k='confirm'; else if(/close|back|shclose|cancel|x\b/i.test(id)) k='back';
  setTimeout(()=>Sfx.ui(k),0); },true);

const _init=initAudio0;
export function initAudio(){ const was=!!ac; REAL=true; _init(); if(ac&&!was){ preload(); if(droneG) droneG.gain.value=0; musicUpdate(); } }

// ---- urgent5: narration (baqsı / Jaxongir voice) — one line at a time, on the voice bus; music ducks -8 dB while it speaks ----
let vCur=null;
function loadVoice(key){ const n='v_'+key; if(BUF[n]) return Promise.resolve(BUF[n]); if(BUF[n]===false) return Promise.resolve(null);
  return fetch(BASE+key+'.mp3').then(r=>{ if(!r.ok) throw 0; return r.arrayBuffer(); }).then(decode).then(b=>{ BUF[n]=b; return b; }).catch(()=>{ BUF[n]=false; return null; }); }
export function preloadVoice(key){ if(ac&&key) loadVoice(key); }
function vduck(on){ if(!ac||!vduckM) return; const t=ac.currentTime; vduckM.gain.setTargetAtTime(on?.4:1,t,on?.12:.5); vduckS.gain.setTargetAtTime(on?.75:1,t,on?.12:.5); }
export function playVoice(key){ if(vCur) vCur.stop(); const h={key,playing:true}; let res; h.done=new Promise(r=>res=r); let safety=0;
  const end=()=>{ if(!h.playing) return; h.playing=false; clearTimeout(safety); if(vCur===h){ vCur=null; vduck(false); } res(); };
  h.stop=end; vCur=h; safety=setTimeout(end,12000);   // never wait forever on a file that does not load
  if(ac){ if(ac.state==='suspended') ac.resume().catch(()=>{});
    loadVoice(key).then(b=>{ if(!h.playing) return; if(!b){ end(); return; } const s=ac.createBufferSource(); s.buffer=b; s.connect(voiceG); s.onended=end; s.start(); h.dur=b.duration; vduck(true);
      clearTimeout(safety); safety=setTimeout(end,(b.duration+1.5)*1000); h.stop=()=>{ try{ s.onended=null; s.stop(); }catch(e){} end(); }; }); }
  else { const a=new Audio(BASE+key+'.mp3'); bindMedia(a,'voice',1); a.onended=a.onerror=()=>{ unbindMedia(a); end(); }; a.play().catch(()=>end()); h.stop=()=>{ try{ a.pause(); }catch(e){} unbindMedia(a); end(); }; }
  return h; }
export function voiceBusy(){ return !!(vCur&&vCur.playing); }
export function waitVoice(maxS=25){ if(!voiceBusy()) return Promise.resolve(); const h=vCur; return Promise.race([h.done,new Promise(r=>setTimeout(r,maxS*1000))]); }
export function stopVoice(){ if(vCur) vCur.stop(); }
// debug / test hook
window.__QQA={ Sfx, fight, get mode(){ return mode; }, get track(){ return curName; }, get ac(){ return ac; }, BUF };
