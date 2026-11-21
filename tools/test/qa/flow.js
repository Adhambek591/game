// first-run flow: fresh storage, clicks through like a new player, screenshot + audit every step
const aud = require('./aud.js');
module.exports = async (p, shot) => {
  const N = process.env.NAME || 'flow', TMAX = +(process.env.TMAX || 95), t0 = Date.now(); let k = 0;
  const el = () => ((Date.now() - t0) / 1000).toFixed(0);
  const snap = async (tag) => { const a = await p.evaluate(aud).catch(e => 'ERR ' + e.message.slice(0, 60)); console.log('[a]', el(), tag, a); await shot('qa/' + N + '_' + String(k++).padStart(2, '0') + '_' + tag).catch(e => console.log('shotfail')); };
  await p.waitForTimeout(2500); await snap('load');
  let last = '';
  while ((Date.now() - t0) / 1000 < TMAX) {
    const st = await p.evaluate(() => { const on = id => { const e = document.getElementById(id); return !!(e && e.classList.contains('on')); };
      const tp = document.getElementById('tplay'); const ti = document.getElementById('title'); const tOn = ti && ti.offsetWidth > 0 && getComputedStyle(ti).display !== 'none' && +getComputedStyle(ti).opacity > .5; const tv = tp && tOn && tp.offsetWidth > 0;
      return tOn ? (tv ? 'title' : 'loading') : document.getElementById('fade').classList.contains('in') ? 'fade' : on('lore') ? 'lore' : on('cut') ? 'cut' : on('dlg') ? 'dlg' : on('end') ? 'end' : on('map') ? 'map' : on('dead') ? 'dead' : (window.__G && __G.player && !__G.paused) ? 'play' : 'other'; }).catch(() => 'err');
    if (st !== last) { await snap(st); last = st; if (st === 'fade') { await p.waitForTimeout(3500); console.log('[fadecss]', await p.evaluate(() => { const f = document.getElementById('fade'); const b = getComputedStyle(f, ':before'), a = getComputedStyle(f, ':after'); return JSON.stringify({ l: f.dataset.l, before: [b.content, b.opacity, b.display, b.animationName], after: [a.content, a.opacity, a.display] }); })); await snap('fade4s'); } }
    if (process.env.STOPAT && st === process.env.STOPAT) break;
    if (st === 'title') { await p.waitForTimeout(800); await p.click('#tplay').catch(e => console.log('noplay')); }
    else if (st === 'lore') { await p.waitForTimeout(600); await p.evaluate(() => { const b = document.querySelector('#lore.on button'); if (b) b.click(); }); }
    else if (st === 'cut') { await p.waitForTimeout(1500); await snap('cutmid'); await p.evaluate(() => document.getElementById('cskip').click()); await p.waitForTimeout(900); await p.evaluate(() => document.getElementById('cskip').click()); }
    else if (st === 'dlg') { const v = p.viewportSize(); console.log('[dlg]', await p.evaluate(() => document.getElementById('dname').textContent + ': ' + document.getElementById('dline').textContent)); await p.mouse.click(v.width / 2, v.height / 2); await p.waitForTimeout(300); await p.mouse.click(v.width / 2, v.height / 2); last = ''; if (k > 30) last = 'dlg'; }
    else if (st === 'play') { await p.waitForTimeout(3000); if (process.env.PLAYSNAP) { await snap('play2'); break; } }
    await p.waitForTimeout(700);
  }
  await snap('final');
};
