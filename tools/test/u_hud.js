module.exports = async (p, shot) => {
  const N = process.env.SN || 'u';
  await p.waitForFunction(() => window.__G, null, { timeout: 90000 });
  const seen = {};
  for (let k = 0; k < 60; k++) {
    await p.waitForTimeout(700);
    const st = await p.evaluate(() => ({ lore: document.getElementById('lore').classList.contains('on'), dlg: document.getElementById('dlg').classList.contains('on'), ban: document.getElementById('ban').classList.contains('show'), cut: document.getElementById('cut').classList.contains('on'), live: !!(__G.player && !__G.paused && document.getElementById('hud').classList.contains('on')) }));
    for (const s of ['lore', 'dlg', 'ban']) if (st[s] && !seen[s]) { seen[s] = 1; await p.waitForTimeout(500); await shot(N + '_' + s); }
    if (st.lore) await p.evaluate(() => document.querySelector('#lore button').click());
    else if (st.dlg) { const v = p.viewportSize(); await p.mouse.click(v.width / 2, v.height / 2); }
    else if (st.cut) await p.evaluate(() => document.getElementById('cskip').click());
    else if (st.live && k > 1 && !st.ban) break;
  }
  await p.evaluate(() => { const P = __G.player; for (let i = 0; i < 4; i++) __T.spawn(i % 2 ? 'askar' : 'wolf', P.x + (i % 3 - 1) * 2.4, P.z - 4 - (i > 2 ? 2 : 0)); });
  for (let k = 0; k < 12; k++) { await p.keyboard.press(k == 6 ? 'Digit1' : 'KeyJ'); await p.waitForTimeout(220); }
  await p.evaluate(() => { const e = __G.ents.find(e => e.team === 'enemy' && !e.dead); if (e) { __G.boss = e; document.getElementById('bname').textContent = 'Qashqir'; } const h = document.getElementById('hint'); h.textContent = 'Tap the sword to attack'; h.classList.add('show'); });
  await p.keyboard.press('KeyJ'); await p.waitForTimeout(150); await p.keyboard.press('KeyJ'); await p.waitForTimeout(250);
  await shot(N + '_hud');
  await p.evaluate(() => { __G.paused = true; const $ = id => document.getElementById(id); const e = __G.ents.find(e => e.team === 'enemy' && !e.dead) || __G.player; __G.boss = null; $('boss').style.display = 'block'; $('bname').textContent = 'Qashqir'; $('bbar').firstChild.style.width = '62%'; $('obj').textContent = 'Defeat the Kalmyk vanguard (3/8)'; const h = $('hint'); h.textContent = 'Swipe the joystick to dodge arrows'; h.classList.add('show');
    const hc = $('hc'); hc.querySelector('b').textContent = '12'; hc.querySelector('i').textContent = 'hits'; hc.querySelector('span').textContent = 'Fierce!'; hc.classList.add('on');
    const c2 = document.querySelector('#b2 .cd'); if (c2) { c2.style.display = 'block'; c2.style.background = 'conic-gradient(rgba(0,0,0,.78) 140deg, transparent 0)'; }
    const D = $('dmg'); [['dn', '48', 300, 150], ['dn c', '126!', 420, 120], ['dn p', '-35', 400, 230], ['dn g', '+5 🪙', 520, 170]].forEach(([c, t, x, y]) => { const d = document.createElement('div'); d.className = c; d.textContent = t; d.style.left = x + 'px'; d.style.top = y + 'px'; d.style.animation = 'none'; d.style.transform = 'translate(-50%,0)'; D.appendChild(d); }); });
  await p.waitForTimeout(400); await shot(N + '_hud2');
  await p.evaluate(() => { document.getElementById('dmg').innerHTML = ''; __G.paused = false; });
  await p.evaluate(() => document.getElementById('bset').click()); await p.waitForTimeout(500); await shot(N + '_pause');
  await p.evaluate(() => document.getElementById('setok').click()); await p.waitForTimeout(300);
};
