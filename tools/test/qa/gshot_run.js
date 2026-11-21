// Load a mission (current URL already has start=), skip lore/dialogs, wait, then __gshot. Usage: await __gshotRun('c21', 8000)
window.__gshotRun = async (name, wait = 7000) => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 40 && !(window.__G && __G.player); i++) { document.querySelector('#lore.on button')?.click(); await sl(400); }
  const t0 = performance.now(); while (performance.now() - t0 < wait) { document.querySelector('#lore.on button')?.click(); if (__G.onEnter && document.getElementById('dlg').classList.contains('on')) __G.onEnter(); await sl(500); }
  if (!window.__gshot) eval(await (await fetch('/tools/test/qa/gshot_page.js?' + Date.now())).text());
  return __gshot({ name });
};
