// Minimal Playwright-like page over CDP (Edge headless), no npm.  usage: node runp.cjs "<query>" W H script.js [shotPrefix]
const { spawn } = require('child_process'); const fs = require('fs'); const path = require('path'); const os = require('os');
const [, , Q, W = 844, H = 390, SCRIPT, SHOT = ''] = process.argv;
const PORT = process.env.PORT || 8770, DBG = 9300 + Math.floor(Math.random() * 600);
const EDGE = process.env.BROWSER || ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(f => fs.existsSync(f));
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'qqe-'));
const args = ['--headless=new', '--remote-debugging-port=' + DBG, '--user-data-dir=' + prof, '--no-first-run', '--mute-audio', '--autoplay-policy=no-user-gesture-required', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=' + W + ',' + H, 'about:blank'];
if (process.env.GPU) args.splice(args.indexOf('--use-angle=swiftshader'), 2);
const br = spawn(EDGE, args, { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  let ws; for (let i = 0; i < 60; i++) { try { const l = await (await fetch(`http://127.0.0.1:${DBG}/json/list`)).json(); const pg = l.find(x => x.type === 'page'); if (pg) { ws = pg.webSocketDebuggerUrl; break; } } catch (e) { } await sleep(300); }
  const so = new WebSocket(ws); await new Promise(r => so.onopen = r); let id = 0; const pend = {};
  so.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend[d.id]) { pend[d.id](d); delete pend[d.id]; } else if (d.method === 'Runtime.consoleAPICalled') { console.log('[' + d.params.type + '] ' + d.params.args.map(a => a.value !== undefined ? a.value : (a.description || a.type)).join(' ')); } else if (d.method === 'Runtime.exceptionThrown') { const e = d.params.exceptionDetails; console.log('[pageerror] ' + (e.exception && e.exception.description || e.text) + ' @' + e.url + ':' + e.lineNumber); } else if (d.method === 'Log.entryAdded') { const e = d.params.entry; if (e.level === 'error') console.log('[log-error] ' + e.text + ' ' + (e.url || '')); } };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; so.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: +W, height: +H, deviceScaleFactor: 1, mobile: false });
  const page = {
    evaluate: async (fn, arg) => { const ex = typeof fn === 'function' ? `(${fn.toString()})(${arg === undefined ? '' : JSON.stringify(arg)})` : fn; const r = await send('Runtime.evaluate', { expression: ex, awaitPromise: true, returnByValue: true }); if (r.result && r.result.exceptionDetails) throw new Error((r.result.exceptionDetails.exception || {}).description || r.result.exceptionDetails.text); return r.result && r.result.result ? r.result.result.value : undefined; },
    waitForTimeout: ms => sleep(ms),
    screenshot: async (o = {}) => { const r = await send('Page.captureScreenshot', { format: 'png' }); const b = Buffer.from(r.result.data, 'base64'); if (o.path) fs.writeFileSync(o.path, b); return b; },
  };
  if (process.env.SEED) { const S = JSON.parse(process.env.SEED); await send('Page.addScriptToEvaluateOnNewDocument', { source: `try{if(!sessionStorage.__seeded){sessionStorage.__seeded=1;const S=${JSON.stringify(S)};for(const k in S)localStorage.setItem(k,typeof S[k]==='string'?S[k]:JSON.stringify(S[k]));}}catch(e){}` }); }
  if (process.env.MOBILE) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/?${Q}` });
  const shot = async n => { if (SHOT) await page.screenshot({ path: SHOT + '_' + n + '.png' }); };
  try { await require(path.resolve(SCRIPT))(page, shot); } catch (e) { console.log('[runner-error] ' + e.stack); }
  console.log('[runner] done'); try { so.close(); } catch (e) { } br.kill(); setTimeout(() => process.exit(0), 500);
})();
setTimeout(() => { console.log('[runner] TIMEOUT'); br.kill(); process.exit(0); }, (+process.env.TMAX || 93) * 1000 + 60000);
