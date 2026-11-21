module.exports = async (p, shot) => { await p.waitForFunction(() => window.__PV, null, { timeout: 120000 }); await p.waitForTimeout(1500);
  console.log(await p.evaluate(() => { const out = []; for (const o of __G ? [] : []) ; return 'x'; }));
  console.log(await p.evaluate(async () => { const E = await import('./js/engine.js?v=' + document.querySelector('script[type=importmap]').textContent.match(/v=(\d+)/)[1]); const r = []; E.world.children.forEach(o => { if (o.userData.terr) { o.geometry.computeBoundingBox(); r.push(JSON.stringify(o.geometry.boundingBox)); } }); r.push('cam ' + JSON.stringify(E.camera.position) + ' n=' + E.world.children.length); return r.join('\n'); }));
};
