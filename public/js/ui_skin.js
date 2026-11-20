/* ui2 runtime skin (ui2 agent). Styling only: painted icons in the upgrade screen, a useful tip on the defeat screen. No game logic. */
(function () {
  var D = document, $ = function (i) { return D.getElementById(i); };
  function lang() { var l = ''; try { l = new URLSearchParams(location.search).get('lang') || localStorage.getItem('qq_lang') || ''; } catch (e) { } return { qq: 1, uz: 1, ru: 1, en: 1 }[l] ? l : 'qq'; }
  /* ---- emoji -> painted sprite (assets/img/ui/icons.webp, 4 x 8) inside wave4's upgrade screen ---- */
  var M = { '🗡': 18, '🏹': 4, '🛡': 15, '🔰': 15, '🎯': 20, '🪙': 22, '⚔': 0 };
  var RE = /(🗡|🏹|🛡|🔰|🎯|🪙|⚔)️?/u, REG = /(🗡|🏹|🛡|🔰|🎯|🪙|⚔)️?/gu;
  function pos(i) { return (i % 4) / 3 * 100 + '% ' + Math.floor(i / 4) / 7 * 100 + '%'; }
  function deco(root) {
    if (!root || !RE.test(root.textContent)) return;
    var w = D.createTreeWalker(root, NodeFilter.SHOW_TEXT), n, L = [];
    while ((n = w.nextNode())) if (RE.test(n.nodeValue)) L.push(n);
    L.forEach(function (n) {
      var f = D.createDocumentFragment(), last = 0, m, v = n.nodeValue; REG.lastIndex = 0;
      while ((m = REG.exec(v))) { if (m.index > last) f.appendChild(D.createTextNode(v.slice(last, m.index))); var s = D.createElement('i'); s.className = 'ic'; s.style.backgroundPosition = pos(M[m[1]]); f.appendChild(s); last = m.index + m[0].length; }
      if (last < v.length) f.appendChild(D.createTextNode(v.slice(last)));
      n.parentNode.replaceChild(f, n);
    });
  }
  var busy = false, obs = new MutationObserver(function () { if (busy) return; busy = true; try { deco($('w4up')); } catch (e) { } busy = false; });
  function hookUp() { var u = $('w4up'); if (u && !u._ui2) { u._ui2 = 1; deco(u); obs.observe(u, { childList: true, subtree: true, characterData: true }); } }
  function paneDeco() { var ps = D.querySelectorAll('.w4pane'); for (var i = 0; i < ps.length; i++) deco(ps[i]); }
  /* ---- defeat tip ---- */
  var TIPS = {
    qq: ['Dushpan qılıshın kótergende ➤ túymesin basıń — soqqını qaytarıp, juwap soqqı beresiz.', 'Jerdegi qızıl sheńberden shıǵıń — bul soqqını qaytarıp bolmaydı.', 'Tumar tolıp jarqırasa, 🔺 túymesin basıń — eń kúshli soqqı tayın.', 'Awır urıs aldınan qılıshtı hám qızlardıń sawıtın kúsheytiń.', 'Qızlarıńızdan alıslamań — jalǵız qalsańız, dushpan qorshap aladı.'],
    uz: ["Dushman qilichini ko'targanda ➤ tugmasini bosing — zarbani qaytarib, javob zarbasini berasiz.", "Yerdagi qizil doiradan chiqing — bu zarbani qaytarib bo'lmaydi.", "Tumor to'lib yarqirasa, 🔺 tugmasini bosing — eng kuchli zarba tayyor.", "Og'ir jang oldidan qilichni va qizlarning sovutini kuchaytiring.", "Qizlaringizdan uzoqlashmang — yolg'iz qolsangiz, dushman o'rab oladi."],
    ru: ['Когда враг заносит меч, нажмите ➤ — вы отобьёте удар и ответите своим.', 'Выйдите из красного круга на земле — этот удар нельзя отбить.', 'Когда амулет полон и светится, нажмите 🔺 — самый сильный удар готов.', 'Перед тяжёлым боем усильте меч и доспехи девушек.', 'Не уходите далеко от своих девушек — одну вас окружат.'],
    en: ['When an enemy raises his sword, tap ➤ — you parry and strike back.', 'Step out of the red circle on the ground — that blow cannot be parried.', 'When the amulet is full and glowing, tap 🔺 — your strongest strike is ready.', "Before a hard fight, upgrade the sword and the maidens' armour.", 'Stay close to your maidens — alone you get surrounded.']
  };
  var tipN = 0;
  function tip() {
    var d = $('dead'), el = $('dtip'); if (!d || !el) return;
    var on = d.classList.contains('on'); if (on === d._ui2on) return; d._ui2on = on; if (!on) return;
    var G = window.__G, boss = false; try { boss = !!(G && G.boss && !G.boss.dead); } catch (e) { }
    var L = TIPS[lang()], i = boss && tipN % 2 === 0 ? 1 : tipN % L.length; tipN++;
    el.textContent = L[i];
  }

  /* ---- ads: buttons exist only when a real ad provider is present ---- */
  function ads() { D.documentElement.classList.toggle('qq-ads', !!(window.QQ_ADS || window.ysdk)); }
  /* ---- title: the name always fits its column (EN/RU names are long) ---- */
  function fitTitle() { var n = $('tname'), b = $('tbox'); if (!n || !b || !n.offsetWidth) return; var key = n.textContent + '|' + b.clientWidth + '|' + innerWidth; if (n._ui2k === key) return; n._ui2k = key; n.style.fontSize = '';
    var w = b.clientWidth, sw = n.scrollWidth; if (sw > w + 1) { var fs = parseFloat(getComputedStyle(n).fontSize); n.style.fontSize = Math.max(22, Math.floor(fs * w / sw * 0.98)) + 'px'; } }
  /* ---- loading: percent + megabytes received ---- */
  var mb = 0; try { new PerformanceObserver(function (l) { l.getEntries().forEach(function (e) { mb += (e.transferSize || e.encodedBodySize || 0); }); }).observe({ type: 'resource', buffered: true }); } catch (e) { }
  function loadInfo() { var el = $('loadmb'), bar = $('loadbar'); if (!el || !bar) return; var p = $('tplay'), c = $('tcont'); var ready = (p && p.offsetWidth > 0) || (c && c.offsetWidth > 0) || !bar.offsetWidth; if (ready) { if (el.textContent) el.textContent = ''; return; }
    var i = bar.firstElementChild, pc = i && bar.offsetWidth ? Math.round(i.offsetWidth / bar.offsetWidth * 100) : 0; var t = pc + '%' + (mb > 5e4 ? ' · ' + (mb / 1048576).toFixed(1) + ' MB' : ''); if (el.textContent !== t) el.textContent = t; }
  /* ---- press feedback for the action buttons (class only) ---- */
  function prs(e, on) { var b = e.target && e.target.closest ? e.target.closest('#btns .ab') : null; if (on && b) { b.classList.add('prs'); } else D.querySelectorAll('#btns .ab.prs').forEach(function (x) { x.classList.remove('prs'); }); }
  ['pointerdown'].forEach(function (k) { D.addEventListener(k, function (e) { prs(e, true); }, { capture: true, passive: true }); });
  ['pointerup', 'pointercancel'].forEach(function (k) { D.addEventListener(k, function (e) { setTimeout(function () { prs(e, false); }, 70); }, { capture: true, passive: true }); });
  /* ---- world map: camp markers never sit on a chapter node/label; "stars to the next chest" ---- */
  function hit(a, b, m) { return a.left < b.right + m && a.right > b.left - m && a.top < b.bottom + m && a.bottom > b.top - m; }
  var mapKey = '';
  function mapFix() { var map = $('map'); if (!map || !map.offsetWidth) return; var cs = map.querySelectorAll('.w4camp'); if (!cs.length) return; var nds = [].slice.call(map.querySelectorAll('.nd')); var key = cs.length + '|' + innerWidth + 'x' + innerHeight + '|' + nds.length + '|' + (cs[0].style.left + cs[0].style.top); if (key === mapKey && cs[0]._ui2) return; mapKey = key;
    var boxes = []; nds.forEach(function (n) { [].forEach.call(n.children, function (ch) { var r = ch.getBoundingClientRect(); if (r.width > 4 && r.height > 4) boxes.push(r); }); });
    var placed = [];
    [].forEach.call(cs, function (c) { c._ui2 = 1; c.style.translate = ''; var r0 = c.getBoundingClientRect(), best = null, R = [0, 14, 28, 42, 56, 70, 84];
      for (var ri = 0; ri < R.length && !best; ri++) for (var a = 0; a < (ri ? 12 : 1); a++) { var dx = Math.cos(a * Math.PI / 6) * R[ri], dy = Math.sin(a * Math.PI / 6) * R[ri]; var r = { left: r0.left + dx, right: r0.right + dx, top: r0.top + dy, bottom: r0.bottom + dy };
        if (r.left < 6 || r.top < 56 || r.right > innerWidth - 6 || r.bottom > innerHeight - 6) continue; var bad = boxes.some(function (b) { return hit(r, b, 3); }) || placed.some(function (b) { return hit(r, b, 2); }); if (!bad) { best = [dx, dy, r]; break; } }
      if (best) { if (best[0] || best[1]) c.style.translate = Math.round(best[0]) + 'px ' + Math.round(best[1]) + 'px'; placed.push(best[2]); } else placed.push(r0); }); }
  function chestNext() { var bar = $('mt-chestbar'); if (!bar || !bar.offsetWidth) return; var cb = bar.querySelectorAll('.mt-cb'); if (!cb.length) return; var cst = bar.querySelector('.mt-cst'), m = /(\d+)/.exec((cst || bar).textContent || ''), st = m ? +m[1] : NaN; if (isNaN(st)) return; var th = [].map.call(cb, function (x) { var q = /(\d+)/.exec(x.textContent || ''); return q ? +q[1] : 0; }).filter(function (v) { return v > 0; }).sort(function (a, b) { return a - b; });
    var nx = th.filter(function (v) { return v > st; })[0], pv = th.filter(function (v) { return v <= st; }).pop() || 0; var el = bar.querySelector('.ui2-next'); if (!nx) { if (el) el.remove(); return; } if (!el) { el = D.createElement('div'); el.className = 'ui2-next'; el.innerHTML = '<i></i><b></b>'; bar.appendChild(el); }
    var t = '★ ' + st + ' / ' + nx; if (el.lastChild.textContent !== t) { el.lastChild.textContent = t; el.firstChild.style.width = Math.max(4, Math.min(100, (st - pv) / (nx - pv) * 100)) + '%'; } }
  function tick() { hookUp(); paneDeco(); tip(); ads(); fitTitle(); loadInfo(); try { mapFix(); chestNext(); } catch (e) { } }
  var dd = $('dead'); if (dd) new MutationObserver(tip).observe(dd, { attributes: true, attributeFilter: ['class'] });
  setInterval(tick, 500); tick(); addEventListener('resize', function () { mapKey = ''; tick(); });
})();
