
// ---------- ARCHERY "SNIPER" MISSIONS (archery agent; the mode itself lives in js/archery.js) ----------
// 3-S Dáryanıń arǵı betindegi lager (after 3-2), 5-S Darbent diywalı (after 5-1, Sárbinaz), 6-S Qashal dárwazası aldında (after 6-1, before the gate siege).
// Stars: win · no alarm (flag) · mission bonus (flag2: 3-S the camp captain too, 5-S no maiden lost, 6-S the western wall too and no beacon).
import { runArchery } from './archery.js?v=1';
for (const [id, after, o] of [['3-S', '3-2', { n: 'ar_n_3', o: 'ar_o_3', fl: 'ar_s_noal', fl2: 'ar_s_cap' }], ['5-S', '5-1', { n: 'ar_n_5', o: 'ar_o_5', fl: 'ar_s_noal', fl2: 's_allq' }], ['6-S', '6-1', { n: 'ar_n_6', o: 'ar_o_6', fl: 'ar_s_noal', fl2: 'ar_s_west' }]])
  if (midx(id) < 0 && midx(after) >= 0) { MLIST.splice(midx(after) + 1, 0, { id, c: +id[0], ty: 'archer', s: ['win', 'flag', 'flag2'], ...o }); RUN[id] = () => archMission(id); }
async function archMission(id) { const run = G.mis.run; mstart(); let r = null; try { r = await runArchery(id, H); } catch (e) { console.error('[archery]', e); }
  if (!G.mis || G.mis.run !== run) return; G.freeze = false; if (!r || !r.ok) return fail();
  G.mis.flag = !!r.noAlarm; G.mis.flag2 = !!r.all; setMusic('off'); await H.victory(); return win(); }
