module.exports = async (p, shot) => {
  await p.waitForFunction(() => window.__META, null, { timeout: 60000 });
  await p.evaluate(() => { __META.openCamp('hero'); });
  await p.waitForTimeout(300);
  console.log(await p.evaluate(() => { const c = document.getElementById('mt-camp'), cs = getComputedStyle(c), b = c.querySelector('.mt-body'), tb = c.querySelector('.mt-tab.on'), ib = tb.querySelector('b'); const r = e => { const q = e.getBoundingClientRect(); return [q.x, q.y, q.width, q.height].map(Math.round).join(','); };
    return JSON.stringify({ disp: cs.display, dir: cs.flexDirection, camp: r(c), body: r(b), tabs: r(c.querySelector('.mt-tabs')), tab: r(tb), b: r(ib), bdisp: getComputedStyle(ib).display, bpos: getComputedStyle(ib).position, pane: r(c.querySelector('.mt-pane')) }); }));
};
