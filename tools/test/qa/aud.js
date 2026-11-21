// DOM auditor injected in page: returns visible overlays, suspicious texts, off-screen / clipped elements
module.exports = () => {
  const W = innerWidth, H = innerHeight, out = { ov: [], bad: [], off: [], t: (window.__G && __G.time || 0).toFixed(1) };
  const vis = el => { const s = getComputedStyle(el); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < .05) return false; const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2; };
  const chainVis = el => { for (let e = el; e && e !== document.body; e = e.parentElement) { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < .05) return false; } return true; };
  for (const id of ['title','lore','cut','dlg','ban','end','dead','map','shop','set','hud','fade','qte','rot','adov']) { const e = document.getElementById(id); if (e && (e.classList.contains('on') || e.classList.contains('in'))) out.ov.push(id); }
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) { const s = n.textContent.trim(); if (!s) continue; const el = n.parentElement; if (!el || ['SCRIPT','STYLE'].includes(el.tagName)) continue; if (!chainVis(el)) continue;
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue; if (/^(dn|B$|tubub)/.test(el.className || el.tagName) || el.closest('#dmg')) continue;
    if (/undefined|NaN|\{[a-z0-9_]+\}|\bnull\b|\[object/.test(s) || /^[a-z0-9]+_[a-z0-9_]+$/.test(s)) out.bad.push((el.id || el.className || el.tagName) + ': ' + s.slice(0, 70));
    if (r.bottom > H + 2 || r.right > W + 2 || r.left < -2 || r.top < -2) { // ignore if inside a scroll container
      let sc = false; for (let e = el; e && e !== document.body; e = e.parentElement) { const cs = getComputedStyle(e); if (/(auto|scroll)/.test(cs.overflowY + cs.overflowX)) { sc = true; break; } }
      if (!sc) out.off.push((el.id || el.className || el.tagName) + ' [' + [r.left|0, r.top|0, r.right|0, r.bottom|0] + ']: ' + s.slice(0, 40)); }
    if (el.scrollWidth > el.clientWidth + 3 && getComputedStyle(el).overflow === 'hidden' && el.clientWidth > 0) out.off.push('CLIP ' + (el.id || el.className) + ': ' + s.slice(0, 40));
  }
  out.bad = [...new Set(out.bad)].slice(0, 12); out.off = [...new Set(out.off)].slice(0, 12);
  return JSON.stringify(out);
};
