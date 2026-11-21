module.exports = async (p, shot) => { await p.waitForTimeout(9000); await shot('ti'); await p.click('#tset'); await p.waitForTimeout(400); await shot('ti2'); };
