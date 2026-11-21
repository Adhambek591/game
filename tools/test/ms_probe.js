module.exports = async (p, shot) => {
  await p.waitForFunction(() => window.__G && window.__MS && __G.mis, null, { timeout: 120000 });
  await p.evaluate(() => window.__MS.auto(true, 8));
  for (let i = 0; i < 8; i++) { await p.waitForTimeout(12000);
    console.log('[pr]', await p.evaluate(() => JSON.stringify({ t: __G.time | 0, paused: __G.paused, freeze: __G.freeze, waits: __G.waits.length, untils: __G.untils.length, boss: __G.boss && [__G.boss.type, __G.boss.hp | 0, __G.boss.dead], ents: __G.ents.filter(e => e.team !== 'ally' || e.type === 'asir').map(e => e.type + (e.dead ? 'X' : '') + (e.potion ? 'P' : '') + '@' + (e.z | 0) + ':' + (e.hp | 0)).join(','), ban: document.getElementById('ban').className, obj: document.getElementById('obj').textContent })));
  }
};
