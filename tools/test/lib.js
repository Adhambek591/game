module.exports = (p) => {
  const L = {};
  L.info = async (l) => console.log(l, await p.evaluate(() => JSON.stringify({ fps: __G.fps | 0, en: __G.ents.filter(e => e.team === 'enemy' && !e.dead).length, p: [__G.player.x | 0, __G.player.z | 0], hp: __G.player.hp | 0, paused: __G.paused, obj: document.getElementById('obj').textContent, boss: __G.boss ? (__G.boss.hp | 0) : null })));
  L.dlg = async (timeout = 8000) => { try { await p.waitForFunction(() => document.getElementById('dlg').classList.contains('on'), null, { timeout }); } catch (e) { console.log('no dialog'); return; } for (let i = 0; i < 10; i++) { if (!(await p.evaluate(() => document.getElementById('dlg').classList.contains('on')))) break; { const v = p.viewportSize(); await p.mouse.click(v.width / 2, v.height / 2); } await p.waitForTimeout(420); } };
  L.tp = async (z, x = 0) => { await p.evaluate(([x, z]) => { __G.player.x = x; __G.player.z = z; }, [x, z]); };
  L.kill = async () => { await p.evaluate(() => __T.kill()); };
  L.clear = async (n = 6) => { for (let i = 0; i < n; i++) { await p.waitForTimeout(900); await L.kill(); } };
  L.ready = async () => { await p.waitForFunction(() => window.__G && __G.player && !document.getElementById('cut').classList.contains('on'), null, { timeout: 60000 }); };
  return L;
};
