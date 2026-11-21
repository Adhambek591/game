module.exports = async (p, shot) => {
  const L = require('./lib.js')(p);
  await p.waitForFunction(() => window.__G && __G.player && !__G.paused, null, { timeout: 90000 });
  await p.evaluate(() => { __G.noDeath = true; __G.steps = 3; }); await L.tp(-24); await L.clear(4); await L.tp(-60); await L.clear(5);
  await L.tp(-126); await p.waitForTimeout(1500); await L.dlg(8000); await p.evaluate(() => { __G.steps = 1; });
  for (let i = 0; i < 2; i++) {
    console.log(await p.evaluate(async () => { const T = await import('./js/engine.js' + document.querySelector('script[src*=story]').src.match(/\?v=\d+/)[0]); const s = __G.boss, P = __G.player; P.x = s.x; P.z = s.z + 5; P.act = null; __G.sk[7].cd = 0; T.doAct(7); return JSON.stringify({ act: P.act && P.act.kind, tg: P.act && P.act.tg && P.act.tg.type, on: __G.sk[7].on, fr: __G.freeze, pa: __G.paused, helm: s.helm }); }));
    await p.waitForTimeout(1200); console.log(await p.evaluate(() => 'helm ' + __G.boss.helm + ' act ' + JSON.stringify(__G.player.act && {k:__G.player.act.kind,t:__G.player.act.t,f:__G.player.act.fired}) + ' time ' + __G.time.toFixed(2) + ' fr ' + __G.freeze + ' qte ' + !!__G.qte));
  }
};
