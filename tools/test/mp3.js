module.exports = async (p, shot) => {
  await p.waitForFunction(() => window.__M && document.getElementById('tplay').style.display === 'block', null, { timeout: 90000 });
  await p.evaluate(() => { localStorage.setItem('qq_prog', 'done'); localStorage.setItem('qq_ch', '6'); localStorage.setItem('qq_stars', JSON.stringify({ 0: 0, 1: 3, 2: 2, 3: 3, 4: 1, 5: 2 })); __M.openMap('title'); });
  await p.waitForTimeout(1500); await shot('mp_d');
};
