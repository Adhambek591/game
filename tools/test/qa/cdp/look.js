// generic look script: env ACTS = JSON list of [waitMs, jsExpression|null, shotName|null]
module.exports = async (p, shot) => {
  const acts = JSON.parse(process.env.ACTS || '[]');
  for (const [w, js, nm] of acts) {
    await p.waitForTimeout(w);
    if (js) { try { const r = await p.evaluate(js); if (r !== undefined) console.log('[eval] ' + (typeof r === 'string' ? r : JSON.stringify(r)).slice(0, 3000)); } catch (e) { console.log('[eval-err] ' + e.message.slice(0, 300)); } }
    if (nm) await shot(nm);
  }
};
