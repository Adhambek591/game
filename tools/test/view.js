module.exports = async (p, shot) => { await p.waitForFunction(() => window.__done, null, { timeout: 90000 }); console.log(await p.evaluate(() => window.__info)); await shot('view'); };
