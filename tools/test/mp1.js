module.exports = async (p, shot) => {
  await p.evaluate(() => { localStorage.setItem('qq_prog', 'done'); localStorage.setItem('qq_ch', '4'); localStorage.setItem('qq_stars', JSON.stringify({ 0: 0, 1: 3, 2: 2, 3: 1 })); });
  await p.reload(); await p.waitForTimeout(9000); await shot('mp_t');
  await p.click('#tmap'); await p.waitForTimeout(800); await shot('mp_m');
  await p.click('#map .nd[data-n="3"]'); await p.waitForTimeout(500); await shot('mp_c');
  await p.click('#map .card .x'); await p.click('#map .nd[data-n="6"]'); await p.waitForTimeout(300); await shot('mp_l');
};
