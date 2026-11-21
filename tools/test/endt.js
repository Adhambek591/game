module.exports = async (p, shot) => {
  await p.waitForFunction(() => window.__G && window.__M && document.getElementById('tplay').style.display === 'block', null, { timeout: 90000 });
  await p.evaluate(() => { localStorage.setItem('qq_prog', 'done'); localStorage.setItem('qq_stars', JSON.stringify({ 1: 3, 2: 1 })); localStorage.setItem('qq_ch', '3');
    const $ = id => document.getElementById(id); $('title').style.display = 'none'; $('eh').textContent = '2-bap — pitti'; __M.endStars(2, 2, 3); $('ereplay').textContent = 'Keyingi bap ▸'; $('eadx2').style.display = 'block'; $('eadx2').textContent = 'Reklama x2'; $('eshop').textContent = 'Dúkan'; $('end').classList.add('on'); });
  await p.waitForTimeout(2500); await shot('end1');
  await p.click('#emap'); await p.waitForTimeout(1000); await shot('end2');
  await p.click('#map .bk'); await p.waitForTimeout(500); console.log('end back', await p.evaluate(() => document.getElementById('end').classList.contains('on')), await p.evaluate(() => localStorage.qq_stars));
};
