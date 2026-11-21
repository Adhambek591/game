module.exports = async (p, shot) => {
  const L = require('./lib.js')(p);
  await p.waitForFunction(() => document.getElementById('lore').classList.contains('on') || (window.__G && __G.player && !__G.paused), null, { timeout: 120000 });
  await p.waitForTimeout(800); await shot('lo'); console.log('lore', await p.evaluate(() => document.getElementById('lore').classList.contains('on')));
  await p.keyboard.press('Enter'); await p.waitForFunction(() => window.__G && __G.player && !__G.paused, null, { timeout: 60000 }); await L.dlg(5000);
  await p.evaluate(() => { __G.noDeath = true; __G.steps = 3; }); await L.tp(-30); await L.clear(4); await L.tp(-60); await L.clear(5); await L.tp(-100); await L.clear(3);
  await L.tp(-125); await p.waitForTimeout(1500); await L.dlg(8000); await p.evaluate(() => { __G.steps = 1; });
  for (let i = 0; i < 3; i++) { await p.evaluate(() => { const P = __G.player, b = __G.boss; P.x = b.x; P.z = -162; P.act = null; __G.sk[7].cd = 0; b.sub = false; }); console.log(await p.evaluate(async () => { const T = await import('./js/engine.js' + document.querySelector('script[src*=story]').src.match(/\?v=\d+/)[0]); __G.ts = 4; T.doAct(7); const P = __G.player; return JSON.stringify({ act: P.act && P.act.kind, tg: P.act && P.act.tg && P.act.tg.type, on: __G.sk[7].on, fr: __G.freeze, d: Math.hypot(P.x-__G.boss.x,P.z-__G.boss.z).toFixed(1), team: __G.boss.team }); })); await p.waitForTimeout(900);
    console.log(await p.evaluate(() => JSON.stringify({ hp: __G.boss.hp | 0, ash: __G.boss.ashore && __G.boss.ashore.toFixed(1), z: __G.boss.z }))); await p.waitForTimeout(2500); for (let k = 0; k < 6; k++) { await p.keyboard.press('KeyJ'); await p.waitForTimeout(700); } console.log('after', await p.evaluate(() => __G.boss.hp | 0)); }
  await shot('dr');
};
