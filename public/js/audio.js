// Protsedural tovush va musiqa (WebAudio)
let volM=1, volS=1;
export function setVol(m,s){ volM=m; volS=s; if(musicG) musicG.gain.value=0.5*m; if(sfxG) sfxG.gain.value=0.9*s; }
let ac=null, master=null, musicG=null, sfxG=null, noiseBuf=null;
function initAudio0(){
  if(ac){ if(ac.state==='suspended') ac.resume(); return; }
  try{
    ac=new (window.AudioContext||window.webkitAudioContext)();
    master=ac.createGain(); master.gain.value=0.9; master.connect(ac.destination);
    musicG=ac.createGain(); musicG.gain.value=0.5*volM; musicG.connect(master);
    sfxG=ac.createGain(); sfxG.gain.value=0.9*volS; sfxG.connect(master);
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
export const Sfx={
  swing(){ if(!ac) return; sweep(0.17,700,3800,1.4,0.3); sweep(0.12,2500,6000,2,0.12,'bandpass',ac.currentTime+.03); },
  hit(){ if(!ac) return; noise(0.05,3200,0.8,0.55,'highpass'); thump(0.7); ring([2100+Math.random()*500,3400,5200],0.22,0.16); },
  big(){ if(!ac) return; noise(0.5,180,0.6,1.0,'lowpass'); noise(0.25,900,0.7,0.35,'bandpass'); sweep(0.6,2400,300,0.6,0.18,'bandpass',ac.currentTime+.05); },
  hurt(){ if(!ac) return; thump(0.8); noise(0.07,1500,1,0.35,'bandpass'); },
  arrow(){ if(!ac) return; sweep(0.2,3200,1100,4,0.25); noise(0.03,5000,1,0.2,'highpass'); },
  orb(){ if(!ac) return; sweep(0.4,500,2200,3,0.22); ring([620,930],0.35,0.1); },
  dodge(){ if(!ac) return; sweep(0.22,400,1700,0.8,0.28); noise(0.08,250,0.8,0.25,'lowpass',null,ac.currentTime+.18); },
  howl(){ if(!ac) return; const t=ac.currentTime; [1,1.5].forEach((m,i)=>{ const o=ac.createOscillator(); o.type='triangle'; o.frequency.setValueAtTime(210*m,t); o.frequency.linearRampToValueAtTime(430*m,t+0.5); o.frequency.linearRampToValueAtTime(340*m,t+1.3); const f=ac.createBiquadFilter(); f.type='bandpass'; f.frequency.value=800; f.Q.value=3; const g=ac.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(i?0.12:0.35,t+0.25); g.gain.exponentialRampToValueAtTime(0.0001,t+1.5); o.connect(f); f.connect(g); g.connect(sfxG); o.start(t); o.stop(t+1.6); }); noise(1.3,900,2,0.08,'bandpass'); },
  ui(){ ring([880,1320],0.09,0.18); },
  pick(){ if(!ac) return; ring([660,990,1320],0.3,0.22); ring([880,1320],0.3,0.16,ac.currentTime+0.09); },
  power(){ if(!ac) return; const t=ac.currentTime; [220,277,330,440,554,660].forEach((f,i)=>ring([f,f*2,f*3],1.1,0.18,t+i*0.09)); noise(1.2,3000,0.5,0.12,'highpass'); },
  ulti(){ if(!ac) return; const t=ac.currentTime; for(let i=0;i<10;i++){ sweep(0.2,2500,900,3,0.18,'bandpass',t+i*0.07); } noise(0.8,160,0.6,0.7,'lowpass'); },
  death(){ if(!ac) return; thump(0.7); noise(0.3,300,0.7,0.3,'lowpass',null,ac.currentTime+.25); sweep(0.25,1200,300,1,0.15); },
  neigh(){ if(!ac) return; const t=ac.currentTime; const o=ac.createOscillator(); o.type='sawtooth'; o.frequency.setValueAtTime(520,t); o.frequency.linearRampToValueAtTime(900,t+.15); for(let i=0;i<6;i++) o.frequency.linearRampToValueAtTime(i%2?620:760,t+.2+i*.08); o.frequency.linearRampToValueAtTime(380,t+.9); const f=ac.createBiquadFilter(); f.type='bandpass'; f.frequency.value=1100; f.Q.value=2.5; const g=ac.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.22,t+.08); g.gain.exponentialRampToValueAtTime(0.0001,t+1); o.connect(f); f.connect(g); g.connect(sfxG); o.start(t); o.stop(t+1.05); noise(.9,1800,1.5,.05,'bandpass'); },
  hoof(){ if(!ac) return; const t=ac.currentTime; noise(0.05,320,1.2,0.22,'lowpass',null,t); noise(0.04,900,2,0.07,'bandpass',null,t); },
  step(){ noise(0.04,220,0.8,0.12,'lowpass'); },
  horn(){ if(!ac) return; const t=ac.currentTime; [98,147,196].forEach((f,i)=>{ const o=ac.createOscillator(); o.type='triangle'; o.frequency.value=f; const fl=ac.createBiquadFilter(); fl.type='lowpass'; fl.frequency.value=700; const g=ac.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(i==2?0.12:0.3,t+0.3); g.gain.setValueAtTime(i==2?0.12:0.3,t+1.2); g.gain.exponentialRampToValueAtTime(0.0001,t+1.9); o.connect(fl); fl.connect(g); g.connect(sfxG); o.start(t); o.stop(t+2); }); }
};
// Musiqa: bas ton + doira zarbi + pentatonik chertma
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
export function setMusic(m){ mode=m; if(REAL){ if(droneG&&ac) droneG.gain.value=0; playTrack(m==='off'?null:m); if((m==='battle')&&Math.random()<.5) playS('cry',.55); return; } if(droneG&&ac) droneG.gain.linearRampToValueAtTime(m==='off'?0.0:(m==='calm'?0.4:0.6),ac.currentTime+0.6); }
export function duck(on){ if(musicG&&ac) musicG.gain.linearRampToValueAtTime(on?0.0:0.5*volM,ac.currentTime+0.4); }

// ---- Haqiqiy yozilgan tovushlar va musiqa ----
const BASE='./assets/audio/'; const BUF={}; const last={}; let REAL=false;
const SMAP={swing:['swing'],hit:['hit','hit','clash'],big:['slam'],hurt:['hurt'],arrow:['arrow'],dodge:['dodge'],howl:['howl'],power:['power'],ulti:['power','slam'],death:['death'],neigh:['neigh'],horn:['horn'],pick:['coin']};
function loadBuf(name,dir){ if(BUF[name]!==undefined) return BUF[name]; BUF[name]=null; return fetch(BASE+dir+'/'+name+'.mp3').then(r=>{ if(!r.ok) throw 0; return r.arrayBuffer(); }).then(a=>new Promise((res,rej)=>ac.decodeAudioData(a,res,rej))).then(b=>{ BUF[name]=b; return b; }).catch(()=>{ BUF[name]=false; }); }
function playS(name,vol=1,rate){ if(!ac) return false; const b=BUF[name]; if(!b) return false; const now=ac.currentTime; if(last[name]&&now-last[name]<0.045) return true; last[name]=now; const src=ac.createBufferSource(); src.buffer=b; src.playbackRate.value=rate||(0.92+Math.random()*0.16); const g=ac.createGain(); g.gain.value=vol; src.connect(g); g.connect(sfxG); src.start(); return true; }
function preload(){ ['swing','hit','clash','slam','hurt','arrow','dodge','howl','power','death','neigh','horn','coin','cry','roar','gallop'].forEach(n=>loadBuf(n,'sfx')); }
for(const k in SMAP){ const f=Sfx[k]; Sfx[k]=function(...a){ const l=SMAP[k]; const n=l[(Math.random()*l.length)|0]; if(playS(n, k==='hit'?0.85:1)) return; return f&&f.apply(Sfx,a); }; }
{ const hf=Sfx.hoof; let ht=0; Sfx.hoof=function(...a){ if(BUF.gallop&&ac){ if(ac.currentTime-ht>3.4){ ht=ac.currentTime; playS('gallop',.55,1); } return; } return hf&&hf.apply(Sfx,a); }; }
Sfx.roar=()=>playS('roar',1,1); Sfx.cry=()=>playS('cry',.7,1);
Sfx.win=()=>{ playTrack(null); setTimeout(()=>playTrack('win',false),250); };
// musiqa
let cur=null, curName=null; const TR={battle:'battle',calm:'calm',boss:'boss',win:'win',title:'title'};
function playTrack(name,loop=true){ if(!ac) return; if(name===curName) return; curName=name; const old=cur; cur=null;
  if(old){ const t=ac.currentTime; old.g.gain.cancelScheduledValues(t); old.g.gain.setValueAtTime(old.g.gain.value,t); old.g.gain.linearRampToValueAtTime(0,t+1.2); old.s.stop(t+1.3); }
  if(!name) return; const f=TR[name]; const go=b=>{ if(!b||curName!==name) return; const s=ac.createBufferSource(); s.buffer=b; s.loop=loop; const g=ac.createGain(); g.gain.value=0; s.connect(g); g.connect(musicG); s.start(); g.gain.linearRampToValueAtTime(name==='calm'?0.75:0.9,ac.currentTime+1.5); cur={s,g}; };
  const b=BUF['m_'+f]; if(b) go(b); else if(b!==false){ fetch(BASE+'music/'+f+'.mp3').then(r=>r.arrayBuffer()).then(a=>new Promise((res,rej)=>ac.decodeAudioData(a,res,rej))).then(b=>{ BUF['m_'+f]=b; go(b); }).catch(()=>{ BUF['m_'+f]=false; }); } }
export function playTitle(){ if(REAL) playTrack('title'); }
const _init=initAudio0;
export function initAudio(){ const was=!!ac; REAL=true; _init(); if(ac&&!was){ preload(); if(droneG) droneG.gain.value=0; playTrack(mode==='off'?null:mode); } }
