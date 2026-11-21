// UI screens: returning player (chapter 3 progress) -> title, map, mission card, upgrade pane, camp, settings, shop. Screenshot + DOM audit each.
const aud = require('./aud.js');
module.exports = async (p, shot) => {
  const N = process.env.NAME || 'ui'; let k = 0; const T0 = Date.now();
  const snap = async (tag) => { const a = await p.evaluate(aud).catch(e => 'ERR'); console.log('[a]', ((Date.now() - T0) / 1000) | 0, tag, a); await shot('qa/' + N + '_' + (k++) + '_' + tag).catch(e => console.log('shotfail ' + tag)); };
  await p.waitForFunction(() => window.__M && window.__W4 && document.getElementById('loadbar') && document.getElementById('loadbar').style.display === 'none', null, { timeout: 70000 }).catch(e => console.log('[wait] ' + String(e).slice(0, 80) + ' :: ' + document));
  console.log('[title]', await p.evaluate(() => [...document.querySelectorAll('#tbox button')].filter(b => b.offsetWidth > 0).map(b => b.id + '=' + b.innerText.trim().slice(0, 20)).join(' | ')));
  await p.waitForTimeout(800); await snap('title');
  await p.evaluate(() => { try { __M.openMap('title'); } catch (e) { console.warn('openMap', e.message); const b = document.getElementById('tmap') || document.getElementById('tcont'); if (b) b.click(); } });
  await p.waitForTimeout(3500); await snap('map');
  console.log('[map]', await p.evaluate(() => { const m = document.getElementById('map'); return m ? m.innerText.replace(/\s+/g, ' ').slice(0, 500) : 'NO MAP'; }));
  // open a chapter card: click first chapter node-like element
  const clicked = await p.evaluate(() => { const m = document.getElementById('map'); if (!m) return 'nomap'; const c = [...m.querySelectorAll('[data-c],[data-ch],.node,.mnode,.chn')].filter(e => e.offsetWidth > 0); if (c.length) { (c[2] || c[0]).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); (c[2] || c[0]).click(); return 'clicked ' + (c[2] || c[0]).className + ' of ' + c.length; } return 'no nodes: ' + [...new Set([...m.querySelectorAll('*')].map(e => e.className && String(e.className).split(' ')[0]).filter(Boolean))].slice(0, 30).join(','); });
  console.log('[card]', clicked); await p.waitForTimeout(2000); await snap('card');
  await p.evaluate(() => { try { __W4.upOpen(); } catch (e) { console.warn('upOpen', e.message); } }); await p.waitForTimeout(1500); await snap('upgrade');
  await p.evaluate(() => { try { __W4.upClose(); } catch (e) { } const b = document.getElementById('tcamp'); if (b) b.click(); }); await p.waitForTimeout(1500); await snap('camp');
};
