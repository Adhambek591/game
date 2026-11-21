module.exports = async (p, shot) => {
  await p.waitForFunction(() => window.__M && document.getElementById('tplay').style.display === 'block', null, { timeout: 90000 });
  await p.evaluate(() => { document.getElementById('title').style.display = 'none'; __G.player = { x: 0, z: 0 }; window.__done = false; __M.introFly([{ x: 0, z: -20, label: 'Wolves' }, { x: 0, z: -40, boss: true, name: 'Boss X', img: 'p_su' }]).then(() => window.__done = true); });
  for (let i = 0; i < 8; i++) { await p.waitForTimeout(1500); console.log(await p.evaluate(() => JSON.stringify([__G.flyDbg(), __done, __G.paused, !!__G.camFn]))); }
  await p.evaluate(() => { window.__done = false; __G.player = { x: 1, z: 0 }; __M.introFly([{ x: 0, z: -20, label: 'Wolves' }]).then(() => window.__done = true); });
  await p.waitForTimeout(1500); await p.mouse.click(300, 200);
  for (let i = 0; i < 4; i++) { await p.waitForTimeout(1000); console.log('skip', await p.evaluate(() => JSON.stringify([__G.flyDbg(), __done, !!document.querySelector('#fly.on'), !!__G.camFn]))); }
};
