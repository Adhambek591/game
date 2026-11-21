module.exports = async (p, shot) => {
  await p.waitForFunction(() => window.__G && window.__META && document.getElementById('tplay').style.display === 'block', null, { timeout: 90000 });
  await p.evaluate(() => { localStorage.setItem('qq_prog', 'done'); localStorage.setItem('qq_ch', '4'); localStorage.setItem('qq_stars', JSON.stringify({ '0-1': 3, '1-1': 3, '1-2': 2, '1-3': 1, '1-4': 3, '2-1': 2 })); });
  await p.reload(); await p.waitForFunction(() => window.__META && document.getElementById('tplay').style.display === 'block', null, { timeout: 90000 });
  await p.waitForTimeout(800); await shot('u_title');
  for (const tab of ['hero', 'skills', 'equip', 'maids', 'quests', 'book']) { await p.evaluate(t => __META.openCamp(t), tab); await p.waitForTimeout(500); await shot('u_camp_' + tab); }
  await p.evaluate(() => __META.closeCamp()); await p.waitForTimeout(300);
  const sh = await p.evaluate(() => { const b = document.getElementById('tshop'); if (b) { b.click(); return 1; } return 0; }); await p.waitForTimeout(600); if (sh) await shot('u_shop');
  await p.evaluate(() => { document.getElementById('shop').classList.remove('on'); const $ = id => document.getElementById(id); $('title').style.display = 'none'; $('dh').textContent = 'You have fallen'; $('drevive').textContent = 'Revive (ad)'; $('dretry').textContent = 'Retry'; $('dead').classList.add('on'); });
  await p.waitForTimeout(500); await shot('u_dead');
  await p.evaluate(() => { const $ = id => document.getElementById(id); $('dead').classList.remove('on'); $('dport').style.backgroundImage = 'url(./assets/img/p_gu.jpg)'; $('dname').textContent = 'Gulayim'; $('dline').textContent = 'Sisters, the Kalmyk riders are coming from the east. Take your bows and hold the gate until the sun is high!'; $('dtap').textContent = 'tap to continue'; $('dlg').classList.add('on'); });
  await p.waitForTimeout(500); await shot('u_dlg');
  await p.evaluate(() => { const $ = id => document.getElementById(id); $('dlg').classList.remove('on'); $('ban1').textContent = 'Chapter 2'; $('ban2').textContent = 'Trail of Captives'; $('ban3').textContent = 'Free the captured girls before the caravan leaves'; $('ban').classList.add('show'); });
  await p.waitForTimeout(900); await shot('u_ban');
  await p.evaluate(() => { const $ = id => document.getElementById(id); $('ban').classList.remove('show'); $('eh').textContent = 'Chapter 1 · Ash'; __M.endStars('1-1', 2, 3); $('stl').innerHTML = '<div>★ Win</div><div>★ No deaths</div><div class="no">☆ Under 3:00</div><div>🪙 +120   📜 2/3</div>'; $('etb').textContent = 'Chapter 1 — complete'; $('ereplay').textContent = 'Next ▸'; $('eadx2').style.display = 'block'; $('eadx2').textContent = 'Watch ad x2 (+120 🪙)'; $('eshop').textContent = 'Shop'; try { __META.missionEnd('1-1', 2); } catch (e) { } $('end').classList.add('on'); });
  await p.waitForTimeout(1500); await shot('u_end');
};
