const fs = require('fs');
module.exports = async (p, shot) => {
  const bg = 'data:image/jpeg;base64,' + fs.readFileSync('/home/user/t/u_bg.jpg').toString('base64');
  await p.waitForFunction(() => window.__G && window.__META && document.getElementById('tplay').style.display === 'block', null, { timeout: 120000 });
  const W = p.viewportSize().width;
  for (const H of ['gulayim', 'sarbinaz', 'allayar']) {
    await p.evaluate(([H, bg]) => {
      const $ = id => document.getElementById(id);
      $('title').style.display = 'none'; $('c').style.visibility = 'hidden';
      let b = $('ubg'); if (!b) { b = document.createElement('div'); b.id = 'ubg'; b.style.cssText = 'position:fixed;inset:0;z-index:1;background:center/cover'; document.body.insertBefore(b, $('hud')); } b.style.backgroundImage = `url(${bg})`;
      __G.hero = H; const P = { gulayim: ['p_gu', 'Gulayim'], sarbinaz: ['p_sa', 'Sarbinaz'], allayar: ['p_al', 'Allayar Bay'] }[H];
      $('pport').style.backgroundImage = `url(./assets/img/${P[0]}.jpg)`; $('pname').textContent = P[1]; $('hbar').firstChild.style.width = '72%'; $('ubar').firstChild.style.width = '45%';
      const SK = { gulayim: { b1: '🌀', b2: '🏹', b3: '💨', b4: '🐎', b5: '🐺', b8: '💧' }, sarbinaz: { b1: '🗡', b2: '🌪', b5: '🎯', b4: '🐎' }, allayar: { b1: '🛡', b2: '📯', b3: '🪓', b4: '🐎' } }[H];
      document.querySelectorAll('#btns .ab').forEach(e => { if (e.id === 'bA' || e.id === 'bD') { e.style.display = ''; return; } const v = SK[e.id]; e.style.display = v ? 'flex' : 'none'; if (v && e.firstChild.nodeType === 3) e.firstChild.nodeValue = v; });
      $('hud').classList.add('on'); $('gold').innerHTML = '🪙 340';
      $('boss').style.display = 'block'; $('bname').textContent = 'Qashqir'; $('bbar').firstChild.style.width = '62%'; $('obj').textContent = 'Defeat the Kalmyk vanguard (3/8)'; const h = $('hint'); h.textContent = 'Swipe the joystick to dodge arrows'; h.classList.add('show');
      const hc = $('hc'); hc.querySelector('b').textContent = '12'; hc.querySelector('i').textContent = 'hits'; hc.querySelector('span').textContent = 'Fierce!'; hc.classList.add('on');
      const c2 = document.querySelector('#b2 .cd'); if (c2) { c2.style.display = 'block'; c2.style.background = 'conic-gradient(rgba(0,0,0,.78) 140deg, transparent 0)'; }
      const c4 = document.querySelector('#b4 .cd'); if (c4) c4.style.display = 'none'; $('b4').classList.add('ready');
      const D = $('dmg'); D.innerHTML = ''; [['dn', '48', .36, .4], ['dn c', '126!', .5, .3], ['dn p', '-35', .47, .6], ['dn g', '+5 🪙', .6, .45]].forEach(([c, t, x, y]) => { const d = document.createElement('div'); d.className = c; d.textContent = t; d.style.left = x * innerWidth + 'px'; d.style.top = y * innerHeight + 'px'; d.style.animation = 'none'; d.style.transform = 'translate(-50%,0)'; D.appendChild(d); });
    }, [H, bg]);
    await p.waitForTimeout(900); await shot('u_hud_' + H + '_' + W);
  }
  await p.evaluate(() => document.getElementById('bset').click()); await p.waitForTimeout(500); await shot('u_pause_' + W);
};
