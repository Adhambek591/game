module.exports = async (p, shot) => {
  await p.evaluate(() => { localStorage.setItem('qq_prog', 'done'); localStorage.setItem('qq_ch', '4'); localStorage.setItem('qq_stars', JSON.stringify({ 0: 0, 1: 3, 2: 2, 3: 1 })); });
  await p.reload(); await p.waitForFunction(() => document.getElementById('tplay').style.display === 'block', null, { timeout: 60000 });
  await p.evaluate(() => { document.getElementById('tcred').click(); }); await p.waitForTimeout(1200); await shot('cr_1');
  await p.evaluate(() => { const c = document.getElementById('cred'); c && c.dispatchEvent(new PointerEvent('pointerdown')); }); await p.waitForTimeout(900);
  console.log('cred gone', await p.evaluate(() => !document.getElementById('cred')));
  await p.click('#tcont'); await p.waitForTimeout(800);
  await p.click('#map .nd[data-n="3"]'); await p.waitForTimeout(1500); await shot('mp_c');
  await p.click('#map .card .go'); await p.waitForTimeout(3000); console.log('started', await p.evaluate(() => ({ title: document.getElementById('title').style.display, map: document.getElementById('map').classList.contains('on') })));
};
