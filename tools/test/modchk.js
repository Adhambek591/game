module.exports = async (p) => { await p.waitForTimeout(3000);
  const r = await p.evaluate(async () => { const out = []; for (const f of ['i18n', 'engine', 'missions', 'story', 'map', 'meta', 'fx', 'env', 'scenery', 'horse', 'audio', 'glbrig', 'skinrig']) { try { await import('/js/' + f + '.js?x=' + Math.random()); out.push(f + ' ok'); } catch (e) { out.push(f + ' ERR ' + e.message); } } return out.join('\n'); });
  console.log(r); };
