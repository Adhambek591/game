module.exports = async (p, shot) => {
  await p.waitForFunction(() => window.__G && window.__M && document.getElementById('tplay').style.display === 'block', null, { timeout: 120000 });
  await p.evaluate(() => { localStorage.setItem('qq_prog', 'done'); localStorage.setItem('qq_ch', '2'); localStorage.setItem('qq_stars', JSON.stringify({ '0-1': 3, '0-2': 2, '1-1': 3, '1-2': 2, '1-3': 3, '1-4': 1, '2-1': 2 })); });
  await p.click('#tmap'); await p.waitForTimeout(2500); await shot('ms_map');
  console.log('[map]', await p.evaluate(() => document.querySelector('#map .tot').textContent + ' | ' + [...document.querySelectorAll('#map .nd')].map(n => n.dataset.n + (n.classList.contains('lk') ? 'L' : '') + (n.classList.contains('cur') ? 'C' : '') + ':' + n.querySelector('.st').textContent).join(' ')));
  await p.click('#map .nd[data-n="2"]'); await p.waitForTimeout(1200); await shot('ms_map_card');
  console.log('[card]', await p.evaluate(() => [...document.querySelectorAll('#map .card .mr')].map(r => r.className + ' ' + r.textContent).join(' || ')));
  await p.click('#map .card .mr.lk'); await p.waitForTimeout(800); console.log('[toast]', await p.evaluate(() => document.querySelector('#map .toast').textContent));
  await p.click('#map .card .x'); await p.waitForTimeout(500); await p.click('#map .nd[data-n="1"]'); await p.waitForTimeout(1000); await shot('ms_map_card1');
  await p.click('#map .card .mr:nth-child(3)'); await p.waitForTimeout(8000); console.log('[started]', await p.evaluate(() => __G.mis && __G.mis.id));
};
