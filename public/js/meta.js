// Qirq qiz — META progression (js/meta.js). Self-contained: injects its own DOM + CSS, saves in localStorage "qq_meta".
// Systems: hero level/XP · skill upgrade tiers · equipment · maidens roster · daily/weekly quests · achievements · star chests · Camp screen.
// Public API: window.__META (see bottom). Combat code may read __META.mul('spin.dmg') etc. — every key defaults to 1 (add() to 0).
// Rules kept on purpose: one currency (the game's coins), no timers/energy, nothing sold for real money, every bonus is small and capped.
import { G, $, SAVE, saveGame, UPG, hudGold, HERO_SK, ringFx, burst, num, flash, T as TD } from './engine.js?v=1795715799';
import { t, lang } from './i18n.js?v=1795715799';
import { Sfx } from './audio.js?v=1795715799';
import { MLIST } from './missions.js?v=1795715799';

const KEY = 'qq_meta', VER = 2, MAXLV = 30, TEAM = 3;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sfx = k => { try { Sfx[k] && Sfx[k](); } catch (e) { } };

// ---------------------------------------------------------------- texts [uz, qq, ru, en]
const S = {
  camp: ['Qarorgoh', 'Qos', 'Стан', 'Camp'],
  back: ['◂ Orqaga', '◂ Artqa', '◂ Назад', '◂ Back'],
  t_hero: ['Botir', 'Batır', 'Герой', 'Hero'],
  t_skills: ['Mahoratlar', 'Sheberlikler', 'Умения', 'Skills'],
  t_equip: ['Qurol-yarog\'', 'Qural-jaraq', 'Снаряжение', 'Equipment'],
  t_maids: ['Qirq qiz', 'Qırq qız', 'Сорок девушек', 'Forty Maidens'],
  t_quests: ['Vazifalar', 'Wazıypalar', 'Поручения', 'Quests'],
  t_book: ['Doston kitobi', 'Dástan kitabı', 'Книга дастана', 'Book of the Epic'],
  level: ['Daraja', 'Dáreje', 'Уровень', 'Level'],
  lv: ['{n}-daraja', '{n}-dáreje', 'Уровень {n}', 'Level {n}'],
  lvup: ['YANGI DARAJA!', 'JAŃA DÁREJE!', 'НОВЫЙ УРОВЕНЬ!', 'LEVEL UP!'],
  lvmax: ['Eng yuqori daraja', 'Eń joqarı dáreje', 'Максимальный уровень', 'Max level'],
  xp: ['Tajriba', 'Tájiriybe', 'Опыт', 'Experience'],
  xpn: ['+{n} tajriba', '+{n} tájiriybe', '+{n} опыта', '+{n} XP'],
  hp: ['Jon', 'Jan', 'Здоровье', 'Health'],
  dmg: ['Zarba kuchi', 'Soqqı kúshi', 'Сила удара', 'Attack'],
  perlv: ['Har darajada: jon +1,5%, zarba +1%', 'Hár dárejede: jan +1,5%, soqqı +1%', 'За уровень: здоровье +1,5%, удар +1%', 'Each level: health +1.5%, attack +1%'],
  train: ['Mashg\'ulot', 'Shınıǵıw', 'Тренировка', 'Training'],
  bonus: ['Bonuslar', 'Bonuslar', 'Бонусы', 'Bonuses'],
  nobonus: ['Hozircha bonus yo\'q — buyum va qizlarni tanlang', 'Házirshe bonus joq — buyım hám qızlardı tańlań', 'Бонусов пока нет — выберите снаряжение и девушек', 'No bonuses yet — pick equipment and maidens'],
  buy: ['Sotib olish', 'Satıp alıw', 'Купить', 'Buy'],
  max: ['MAX', 'MAX', 'МАКС', 'MAX'],
  nogold: ['Oltin yetmaydi', 'Altın jetpeydi', 'Не хватает золота', 'Not enough gold'],
  choose: ['Tanlash', 'Tańlaw', 'Выбрать', 'Equip'],
  chosen: ['Tanlangan', 'Tańlanǵan', 'Выбрано', 'Equipped'],
  locked: ['Yopiq', 'Jabıq', 'Закрыто', 'Locked'],
  isnew: ['YANGI', 'JAŃA', 'НОВОЕ', 'NEW'],
  claim: ['Olish', 'Alıw', 'Забрать', 'Claim'],
  claimed: ['Olindi', 'Alındı', 'Получено', 'Claimed'],
  reward: ['Sovg\'a', 'Sıylıq', 'Награда', 'Reward'],
  newitem: ['Yangi buyum: {x}', 'Jańa buyım: {x}', 'Новый предмет: {x}', 'New item: {x}'],
  newmaid: ['{x} safga qo\'shildi', '{x} qatarǵa qosıldı', '{x} встала в строй', '{x} joined the ranks'],
  tier: ['{n}-bosqich', '{n}-basqısh', 'Ступень {n}', 'Tier {n}'],
  // skill effect templates
  e_dmg: ['Zarba kuchi +{n}%', 'Soqqı kúshi +{n}%', 'Сила удара +{n}%', 'Damage +{n}%'],
  e_cd: ['Tayyorlanish vaqti −{n}%', 'Tayarlanıw waqtı −{n}%', 'Перезарядка −{n}%', 'Cooldown −{n}%'],
  e_area: ['Ta\'sir doirasi +{n}%', 'Tásir sheńberi +{n}%', 'Радиус +{n}%', 'Area +{n}%'],
  e_hit: ['Qo\'shimcha zarba', 'Qosımsha soqqı', 'Дополнительный удар', 'Extra hit'],
  e_wave: ['Oxirida to\'lqin zarbasi', 'Aqırında tolqın soqqısı', 'Ударная волна в конце', 'Shockwave on finish'],
  e_volley: ['Yana 2 to\'lqin o\'q · zanjir ikkinchi dushmanga ham uradi', 'Jáne 2 tolqın oq · shınjır ekinshi dushpanǵa da uradı', 'Ещё 2 залпа · цепь бьёт второго врага', '+2 volleys · chain strikes a second enemy'],
  e_charge: ['Chaqiriq {n}% tezroq to\'ladi', 'Shaqırq {n}% tezirek toladı', 'Призыв копится на {n}% быстрее', 'Call charges {n}% faster'],
  e_heal: ['Qo\'llaganda jon +{n}%', 'Qollanǵanda jan +{n}%', 'При применении здоровье +{n}%', 'Restores {n}% health on use'],
  // hero skill names that i18n.js does not have
  n_bash: ['Qalqon zarbasi', 'Qalqan soqqısı', 'Удар щитом', 'Shield Bash'],
  n_cry: ['Jang chaqirig\'i', 'Uran', 'Боевой клич', 'War Cry'],
  n_cleave: ['Og\'ir zarba', 'Awır soqqı', 'Тяжёлый удар', 'Heavy Cleave'],
  n_thrust: ['Nayza zarbasi', 'Nayza soqqısı', 'Удар копьём', 'Spear Thrust'],
  n_sweep: ['Nayza aylanmasi', 'Nayza aylanbası', 'Круговой удар', 'Spear Sweep'],
  n_javelin: ['Nayza otish', 'Nayza ılaqtırıw', 'Бросок копья', 'Javelin'],
  // equipment
  sl_saber: ['Qilich', 'Qılısh', 'Сабля', 'Saber'],
  sl_bow: ['O\'q-yoy', 'Oq-jay', 'Лук', 'Bow'],
  sl_armor: ['Sovut', 'Sawıt', 'Доспех', 'Armour'],
  sl_amulet: ['Tumor', 'Tumar', 'Тумар', 'Amulet'],
  i_sab1: ['Po\'lat qilich', 'Polat qılısh', 'Стальная сабля', 'Steel Saber'],
  i_sab2: ['Kumush sopli qilich', 'Gúmis saplı qılısh', 'Сабля с серебряной рукоятью', 'Silver-hilted Saber'],
  i_sab3: ['Oltin sopli qilich', 'Altın saplı qılısh', 'Сабля с золотой рукоятью', 'Gold-hilted Saber'],
  i_bow1: ['Ovchi yoyi', 'Ańshı jayı', 'Охотничий лук', 'Hunter\'s Bow'],
  i_bow2: ['Shox yoy', 'Múyiz jay', 'Роговой лук', 'Horn Bow'],
  i_bow3: ['Botir yoyi', 'Batır jayı', 'Лук батыра', 'Batyr\'s Bow'],
  i_arm1: ['Teri sovut', 'Teri sawıt', 'Кожаный доспех', 'Leather Armour'],
  i_arm2: ['Temir sovut', 'Temir sawıt', 'Железная кольчуга', 'Iron Mail'],
  i_arm3: ['Botir sovuti', 'Batır sawıtı', 'Доспех батыра', 'Batyr\'s Mail'],
  i_amu1: ['Kumush tumor', 'Gúmis tumar', 'Серебряный тумар', 'Silver Tumar'],
  i_amu2: ['Haykal', 'Háykel', 'Хайкель', 'Haykel Pendant'],
  i_amu3: ['Aqiq tumor', 'Aqıq tumar', 'Сердоликовый тумар', 'Carnelian Tumar'],
  // bonus templates (equipment + maiden perks)
  b_hp: ['Jon +{n}%', 'Jan +{n}%', 'Здоровье +{n}%', 'Health +{n}%'],
  b_dmg: ['Zarba kuchi +{n}%', 'Soqqı kúshi +{n}%', 'Сила удара +{n}%', 'Attack +{n}%'],
  b_ranged: ['O\'q va zanjir zarbasi +{n}%', 'Oq hám shınjır soqqısı +{n}%', 'Урон стрел и цепи +{n}%', 'Arrow and chain damage +{n}%'],
  b_gold: ['Oltin +{n}%', 'Altın +{n}%', 'Золото +{n}%', 'Gold +{n}%'],
  b_xp: ['Tajriba +{n}%', 'Tájiriybe +{n}%', 'Опыт +{n}%', 'Experience +{n}%'],
  b_charge: ['Chaqiriq {n}% tezroq to\'ladi', 'Shaqırq {n}% tezirek toladı', 'Призыв копится на {n}% быстрее', 'Call charges {n}% faster'],
  b_cd: ['Tayyorlanish vaqti −{n}%', 'Tayarlanıw waqtı −{n}%', 'Перезарядка −{n}%', 'Cooldowns −{n}%'],
  b_regen: ['Jon asta tiklanadi', 'Jan áste tiklenedi', 'Здоровье медленно восстанавливается', 'Health slowly regenerates'],
  b_killheal: ['Dushman yengilganda jon +{n}%', 'Dushpan jeńilgende jan +{n}%', 'За побеждённого врага здоровье +{n}%', 'Heal {n}% per defeated enemy'],
  b_boss: ['Boss jangida zarba +{n}%', 'Boss sawashında soqqı +{n}%', 'В бою с боссом удар +{n}%', 'Attack +{n}% in boss fights'],
  b_startulti: ['Jang {n}% chaqiriq bilan boshlanadi', 'Sawash {n}% shaqırq penen baslanadı', 'Бой начинается с {n}% призыва', 'Start battles with {n}% Call'],
  b_laststand: ['Jon oz qolganda zarba +{n}%', 'Jan az qalǵanda soqqı +{n}%', 'При малом здоровье удар +{n}%', 'Attack +{n}% at low health'],
  // unlock sources
  src_start: ['Boshidan bor', 'Basınan bar', 'Есть с начала', 'Yours from the start'],
  src_star: ['★ {n} yig\'ing', '★ {n} jıynań', 'Соберите ★ {n}', 'Collect ★ {n}'],
  src_mis: ['«{m}» topshirig\'ini bajaring', '«{m}» tapsırmasın pitkeriń', 'Пройдите задание «{m}»', 'Complete "{m}"'],
  src_chest: ['Yulduz sandig\'i: ★ {n}', 'Juldız sandıǵı: ★ {n}', 'Звёздный сундук: ★ {n}', 'Star chest: ★ {n}'],
  // maidens
  team: ['Jangga boradiganlar: {a}/{b}', 'Sawashqa baratuǵınlar: {a}/{b}', 'Идут в бой: {a}/{b}', 'Going into battle: {a}/{b}'],
  teamhint: ['Uch qizni tanlang — ularning fazilati jangda yordam beradi', 'Úsh qızdı tańlań — olardıń qásiyeti sawashta járdem beredi', 'Выберите трёх девушек — их дар помогает в бою', 'Pick three maidens — their gifts help in battle'],
  teamfull: ['Avval bittasini chiqaring', 'Aldın birewin shıǵarıń', 'Сначала уберите одну', 'Remove one first'],
  inteam: ['Safda', 'Qatarda', 'В строю', 'In team'],
  // quests
  daily: ['Kunlik vazifalar', 'Kúndelikli wazıypalar', 'Ежедневные поручения', 'Daily quests'],
  weekly: ['Haftalik vazifalar', 'Háptelik wazıypalar', 'Недельные поручения', 'Weekly quests'],
  ach: ['Yutuqlar', 'Jetiskenlikler', 'Достижения', 'Achievements'],
  chests: ['Yulduz sandiqlari', 'Juldız sandıqları', 'Звёздные сундуки', 'Star chests'],
  dnote: ['Har kuni yangilanadi', 'Hár kúni jańalanadı', 'Обновляются каждый день', 'Refresh every day'],
  wnote: ['Har hafta yangilanadi', 'Hár hápte jańalanadı', 'Обновляются каждую неделю', 'Refresh every week'],
  dall: ['Uchala vazifa uchun', 'Úsh wazıypanıń hámmesi ushın', 'За все три поручения', 'For all three quests'],
  q_kills: ['{n} dushmanni yenging', '{n} dushpandı jeńiń', 'Побеждённые враги: {n}', 'Defeat {n} enemies'],
  q_missions: ['{n} topshiriqni bajaring', '{n} tapsırmanı pitkeriń', 'Пройденные задания: {n}', 'Complete {n} missions'],
  q_stars: ['{n} yulduz yig\'ing', '{n} juldız jıynań', 'Собранные звёзды: {n}', 'Earn {n} stars'],
  q_skills: ['Mahoratlarni {n} marta qo\'llang', 'Sheberliklerdi {n} ret qollanıń', 'Примените умения: {n}', 'Use skills {n} times'],
  q_heavy: ['{n} kuchli dushmanni yenging', '{n} kúshli dushpandı jeńiń', 'Побеждённые сильные враги: {n}', 'Defeat {n} strong enemies'],
  q_gold: ['Jangda {n} oltin yig\'ing', 'Sawashta {n} altın jıynań', 'Золото, собранное в бою: {n}', 'Collect {n} gold in battle'],
  q_s3: ['{n} topshiriqni 3 yulduz bilan bajaring', '{n} tapsırmanı 3 juldız benen pitkeriń', 'Задания на 3 звезды: {n}', 'Finish {n} missions with 3 stars'],
  a_lv: ['{n}-darajaga yeting', '{n}-dárejege jetiń', 'Достигните уровня {n}', 'Reach level {n}'],
  a_stars: ['Jami ★ {n} yig\'ing', 'Jámi ★ {n} jıynań', 'Соберите всего ★ {n}', 'Collect ★ {n} in total'],
  a_final: ['Surtayshani yenging', 'Surtayshanı jeńiń', 'Победите Суртайшу', 'Defeat Surtaysha'],
  a_up: ['{n} mahorat bosqichini oching', '{n} sheberlik basqıshın ashıń', 'Откройте ступеней умений: {n}', 'Unlock {n} skill tiers'],
  a_eq: ['To\'rt xil buyumning hammasini tanlang', 'Tórt túrli buyımnıń hámmesin tańlań', 'Наденьте все четыре вида снаряжения', 'Equip all four slots'],
  a_maids: ['{n} qizni safga qo\'shing', '{n} qızdı qatarǵa qosıń', 'Девушки в отряде: {n}', 'Recruit {n} maidens'],
  giftday: ['Kunlik sovg\'a: ketma-ket {n}-kun', 'Kúndelik sawǵa: izbe-iz {n}-kún', 'Ежедневный подарок: день {n} подряд', 'Daily gift: day {n} in a row'],
  endcamp: ['⛺ Qarorgoh', '⛺ Qos', '⛺ Стан', '⛺ Camp'],
  bookempty: ['Hali sahifa ochilmagan', 'Ele bet ashılmaǵan', 'Страницы ещё не открыты', 'No pages unlocked yet'],
  placeholder: ['Tez orada', 'Jaqında', 'Скоро', 'Coming soon'],
  // ui4: simple camp
  t_hs: ['Botir va mahorat', 'Batır hám sheberlik', 'Герой и умения', 'Hero & Skills'],
  t_md: ['Qizlar', 'Qızlar', 'Девушки', 'Maidens'],
  up_h: ['Kuchaytirish', 'Kúsheytiw', 'Улучшения', 'Upgrades'],
  up_btn: ['Kuchaytirish · {c} 🪙', 'Kúsheytiw · {c} 🪙', 'Улучшить · {c} 🪙', 'Upgrade · {c} 🪙'],
  up_need: ['Yana {c} 🪙 kerak', 'Jáne {c} 🪙 kerek', 'Нужно ещё {c} 🪙', 'Need {c} more 🪙'],
  weak: ['Zaif', 'Álsiz', 'Слабо', 'Weak'],
  good: ['Yaxshi', 'Jaqsı', 'Хорошо', 'Good'],
  legend: ['Yashil — yaxshi, qizil — zaif', 'Jasıl — jaqsı, qızıl — álsiz', 'Зелёный — хорошо, красный — слабо', 'Green = good, red = weak'],
  s_weak: ['Zaif joyingiz: {x}. Avval shuni kuchaytiring.', 'Álsiz jerińiz: {x}. Aldın sonı kúsheytiń.', 'Слабое место: {x}. Улучшите это первым.', 'Your weak spot: {x}. Upgrade this first.'],
  s_ok: ['Hammasi yaxshi! Keyingi topshiriqqa tayyorsiz.', 'Hámmesi jaqsı! Keyingi tapsırmaǵa tayınsız.', 'Всё хорошо! Вы готовы к следующему заданию.', 'All good! You are ready for the next mission.'],
  h_sk: ['{x} mahoratlari', '{x} sheberlikleri', 'Умения: {x}', '{x} — skills'],
  st_mstr: ['Qizlar kuchi', 'Qızlar kúshi', 'Сила девушек', 'Maidens\' strength'],
  st_mx: ['Qo\'shimcha qizlar', 'Qosımsha qızlar', 'Доп. девушки', 'Extra maidens'],
  st_horse: ['Otning chidamliligi', 'Attıń shıdamlılıǵı', 'Прочность коня', 'Horse toughness'],
  st_cd: ['Tayyorlanish vaqti', 'Tayarlanıw waqtı', 'Перезарядка', 'Cooldown'],
  st_area: ['Ta\'sir doirasi', 'Tásir sheńberi', 'Радиус', 'Area'],
  st_hit: ['Qo\'shimcha zarba', 'Qosımsha soqqı', 'Доп. удар', 'Extra hit'],
  st_wave: ['To\'lqin zarbasi', 'Tolqın soqqısı', 'Ударная волна', 'Shockwave'],
  st_volley: ['Qo\'shimcha o\'qlar', 'Qosımsha oqlar', 'Доп. залпы', 'Extra volleys'],
  st_charge: ['Chaqiriq tezligi', 'Shaqırıq tezligi', 'Скорость призыва', 'Call charge speed'],
  st_heal: ['Qo\'llaganda jon', 'Qollanǵanda jan', 'Лечение', 'Heal on use'],
  sec: ['s', 's', 'с', 's'],
  eq_tap: ['Almashtirish uchun bosing', 'Almastırıw ushın basıń', 'Нажмите, чтобы сменить', 'Tap to switch'],
  eq_none: ['Hali yo\'q', 'Ele joq', 'Пока нет', 'None yet'],
  ad_s: ['📺 Reklama: +{n} 🪙', '📺 Reklama: +{n} 🪙', '📺 Реклама: +{n} 🪙', '📺 Ad: +{n} 🪙'],
  e_weak: ['{x} zaif', '{x} álsiz', '{x}: слабо', '{x} is weak'],
};
const LI = () => ({ uz: 0, qq: 1, ru: 2, en: 3 })[lang] ?? 0;
function tt(k, v) { const a = S[k]; let s = a ? (a[LI()] ?? a[0]) : k; if (v) for (const x in v) s = s.split('{' + x + '}').join(v[x]); return s; }

// ---------------------------------------------------------------- data
// skill tracks: 3 tiers each, bought with coins. e = [effect, value]; kinds = engine act kinds the track covers.
const COST = [120, 300, 600];
const TRACKS = {
  blade: { hero: 'gulayim', ic: '🌀', nm: () => t('k1') + ' · ' + t('pw6'), kinds: ['spin', 'slam'], tiers: [['dmg', 20], ['area', 35], ['hit']] },
  bow: { hero: 'gulayim', ic: '🏹', nm: () => t('k2') + ' · ' + t('pw7'), kinds: ['rain', 'chain'], tiers: [['dmg', 20], ['cd', 20], ['volley']] },
  dash: { hero: 'gulayim', ic: '💨', nm: () => t('k3'), kinds: ['dash'], tiers: [['dmg', 25], ['cd', 25], ['wave']] },
  leap: { hero: 'gulayim', ic: '🐺', nm: () => t('wolf'), kinds: ['leap'], tiers: [['cd', 20], ['area', 40], ['dmg', 40]] },
  call: { hero: 'gulayim', ic: '🐎', nm: () => t('k4'), kinds: ['ulti', 'amulet'], tiers: [['charge', 20], ['heal', 15], ['dmg', 30]] },
  bash: { hero: 'allayar', ic: '🛡', nm: () => tt('n_bash'), kinds: ['bash'], tiers: [['dmg', 20], ['cd', 20], ['wave']] },
  cry: { hero: 'allayar', ic: '📯', nm: () => tt('n_cry'), kinds: ['cry'], tiers: [['cd', 15], ['heal', 8], ['cd', 15]] },
  cleave: { hero: 'allayar', ic: '🪓', nm: () => tt('n_cleave'), kinds: ['cleave'], tiers: [['dmg', 20], ['cd', 20], ['wave']] },
  thrust: { hero: 'sarbinaz', ic: '🗡', nm: () => tt('n_thrust'), kinds: ['thrust'], tiers: [['dmg', 20], ['cd', 20], ['wave']] },
  sweep: { hero: 'sarbinaz', ic: '🌪', nm: () => tt('n_sweep'), kinds: ['sweep'], tiers: [['dmg', 20], ['area', 35], ['hit']] },
  javelin: { hero: 'sarbinaz', ic: '🎯', nm: () => tt('n_javelin'), kinds: ['javelin'], tiers: [['dmg', 20], ['cd', 20], ['dmg', 30]] },
};
const EFF_TXT = { dmg: 'e_dmg', cd: 'e_cd', area: 'e_area', hit: 'e_hit', wave: 'e_wave', volley: 'e_volley', charge: 'e_charge', heal: 'e_heal' };
// engine act.kind -> [track, mul-key prefix]
const KIND = { spin: ['blade', 'spin'], slamP: ['blade', 'slam'], cast: ['bow', 'rain'], chain: ['bow', 'chain'], dash: ['dash', 'dash'], leap: ['leap', 'leap'], ulti: ['call', 'ulti'], bash: ['bash', 'bash'], cry: ['cry', 'cry'], cleave: ['cleave', 'cleave'], thrust: ['thrust', 'thrust'], sweep: ['sweep', 'sweep'], javelin: ['javelin', 'javelin'] };
const RANGED = { rain: 1, chain: 1, javelin: 1 };
// equipment: slot, bonus list [stat, value], source {m: mission id first clear} | {c: star chest}
const SLOTS = ['saber', 'bow', 'armor', 'amulet'];
const ITEMS = {
  sab1: { s: 'saber', b: [['dmg', 6]], src: { c: 6 } }, sab2: { s: 'saber', b: [['dmg', 10]], src: { m: '3-4' } }, sab3: { s: 'saber', b: [['dmg', 14], ['charge', 10]], src: { c: 68 } },
  bow1: { s: 'bow', b: [['ranged', 12]], src: { m: '1-4' } }, bow2: { s: 'bow', b: [['ranged', 20]], src: { c: 40 } }, bow3: { s: 'bow', b: [['ranged', 28], ['cd', 6]], src: { m: '6-4' } },
  arm1: { s: 'armor', b: [['hp', 8]], src: { c: 15 } }, arm2: { s: 'armor', b: [['hp', 14]], src: { m: '4-4' } }, arm3: { s: 'armor', b: [['hp', 20], ['regen', 1]], src: { c: 80 } },
  amu1: { s: 'amulet', b: [['gold', 10]], src: { m: '2-4' } }, amu2: { s: 'amulet', b: [['xp', 10], ['charge', 10]], src: { c: 27 } }, amu3: { s: 'amulet', b: [['killheal', 2], ['gold', 10]], src: { m: '5-4' } },
};
// star chests on the map: stars -> coins (+ item)
const CHESTS = [[6, 100, 'sab1'], [15, 150, 'arm1'], [27, 200, 'amu2'], [40, 250, 'bow2'], [54, 400], [68, 350, 'sab3'], [80, 400, 'arm3'], [90, 800]];
// maidens: [uz, qq, ru, en] names; perk [stat, value]; unlock {start} | {m: mission} | {s: stars}. Only Sarbinaz is from the game's script — the rest are placeholder names for the author to replace.
const MAIDS = {
  sarbinaz: { n: ['Sarbinaz', 'Sárbinaz', 'Сарбиназ', 'Sarbinaz'], p: ['dmg', 8], u: { start: 1 }, img: 'p_sa', c: '#b5452c' },
  aysuliw: { n: ['Aysuluv', 'Aysulıw', 'Айсулыу', 'Aysuliw'], p: ['hp', 10], u: { m: '1-2', m0: '0-0' }, img: 'md_aysuliw', c: '#2f6f8f' },
  gulzar: { n: ['Gulzor', 'Gúlzar', 'Гулзар', 'Gulzar'], p: ['gold', 12], u: { s: 8 }, img: 'md_gulzar', c: '#a8842a' },
  aqmaral: { n: ['Oqmaral', 'Aqmaral', 'Акмарал', 'Aqmaral'], p: ['killheal', 2], u: { m: '1-4' }, img: 'md_aqmaral', c: '#5d8a4a' },
  jupar: { n: ['Jupar', 'Jupar', 'Жупар', 'Jupar'], p: ['cd', 8], u: { m: '2-4' }, img: 'md_jupar', c: '#7a4a8f' },
  ayparsha: { n: ['Oyposhsha', 'Ayparsha', 'Айпарша', 'Ayparsha'], p: ['xp', 12], u: { s: 24 }, img: 'md_ayparsha', c: '#8f3a5a' },
  nazlim: { n: ['Nozlim', 'Nazlım', 'Назлым', 'Nazlim'], p: ['ranged', 15], u: { m: '3-4' }, img: 'md_nazlim', c: '#3a7a6a' },
  gulshad: { n: ['Gulshod', 'Gúlshad', 'Гулшад', 'Gulshad'], p: ['charge', 15], u: { m: '4-4' }, img: 'md_gulshad', c: '#b06a2a' },
  ziyba: { n: ['Ziyba', 'Ziyba', 'Зийба', 'Ziyba'], p: ['startulti', 40], u: { s: 45 }, img: 'md_ziyba', c: '#4a5a9f' },
  qalbiyke: { n: ['Qalbika', 'Qálbiyke', 'Калбийке', 'Qalbiyke'], p: ['boss', 12], u: { m: '5-4' }, img: 'md_qalbiyke', c: '#8a2a2a' },
  nurzada: { n: ['Nurzoda', 'Nurzada', 'Нурзада', 'Nurzada'], p: ['regen', 1], u: { m: '6-4' }, img: 'md_nurzada', c: '#3f8f8f' },
  biybisanem: { n: ['Bibisanam', 'Biybisánem', 'Бийбисанем', 'Biybisanem'], p: ['laststand', 25], u: { s: 75 }, img: 'md_biybisanem', c: '#6a6a2a' },
};
// quests: [id, counter, target, coins]
const DQ = [['k40', 'kills', 40, 50], ['k80', 'kills', 80, 70], ['m2', 'missions', 2, 60], ['m3', 'missions', 3, 80], ['s4', 'stars', 4, 60], ['s6', 'stars', 6, 80], ['sk15', 'skills', 15, 50], ['h2', 'heavy', 2, 60], ['g150', 'gold', 150, 50], ['p1', 's3', 1, 70]];
const WQ = [['wk', 'kills', 400, 300], ['wm', 'missions', 10, 300], ['ws', 'stars', 20, 350], ['wp', 's3', 4, 350], ['wh', 'heavy', 12, 300]];
const DALL = 100;
// achievements: [id, kind, target, coins]
const ACH = [['m1', 'missions', 1, 50], ['k100', 'kills', 100, 80], ['k500', 'kills', 500, 200], ['k2000', 'kills', 2000, 500], ['lv5', 'lv', 5, 100], ['lv10', 'lv', 10, 200], ['lv20', 'lv', 20, 400], ['s30', 'tstars', 30, 150], ['s60', 'tstars', 60, 300], ['s90', 'tstars', 90, 600], ['up1', 'up', 1, 60], ['up9', 'up', 9, 250], ['eq4', 'eq', 4, 150], ['md6', 'maids', 6, 150], ['md12', 'maids', 12, 400], ['fin', 'final', 1, 500]];
const ACH_TXT = { missions: 'q_missions', kills: 'q_kills', lv: 'a_lv', tstars: 'a_stars', up: 'a_up', eq: 'a_eq', maids: 'a_maids', final: 'a_final' };

// ---------------------------------------------------------------- save / derived state
const lsg = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
function starMap() { try { return JSON.parse(lsg('qq_stars', '{}')) || {}; } catch (e) { return {}; } }
function mdone(id, SM) { SM = SM || starMap(); const m = MLIST.find(x => x.id === id); if (!m) return false; if (id in SM) return true; return (String(m.c) in SM) || (!!lsg('qq_prog', null) && (+lsg('qq_ch', 1) || 1) > m.c); }
function totalStars(SM) { SM = SM || starMap(); let n = 0; for (let c = 0; c <= 7; c++) { let k = 0; for (const m of MLIST) if (m.c === c) k += +SM[m.id] || 0; n += k || +SM[c] || 0; } return n; }
function fresh() { return { v: VER, xp: 0, sk: {}, eq: {}, chest: {}, team: ['sarbinaz'], ach: {}, seen: {}, st: { kills: 0, heavy: 0, missions: 0, stars: 0, skills: 0, gold: 0, s3: 0 }, q: { day: '', dl: [], dc: {}, dd: {}, dall: 0, wk: '', wl: [], wc: {}, wd: {} }, fin: 0, auto: {} }; }
function load() {
  let m = null; try { m = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { }
  if (!m || typeof m !== 'object') {
    // migration for players who progressed before the meta systems existed: XP for every finished mission; items/maidens/chests derive from qq_stars
    m = fresh(); const SM = starMap(); let n = 0; for (const ms of MLIST) if (mdone(ms.id, SM)) n++;
    if (n) { m.xp = n * 300; m.st.missions = n; m.mig = 1; }
  }
  const f = fresh(); for (const k in f) if (m[k] === undefined || m[k] === null) m[k] = f[k]; for (const k in f.st) if (typeof m.st[k] !== 'number') m.st[k] = 0; for (const k in f.q) if (m.q[k] === undefined) m.q[k] = f.q[k];
  if (!Array.isArray(m.team)) m.team = ['sarbinaz'];
  // v1 -> v2: 'auto' (unlocks already auto-placed); empty slots / squad places get filled once on the next refresh
  if ((m.v | 0) < 2) { m.auto = m.auto && typeof m.auto === 'object' ? m.auto : {}; }
  m.v = VER; return m;
}
const M = load(); let dirty = false, saveT = 0;
function save() { dirty = false; try { localStorage.setItem(KEY, JSON.stringify(M)); } catch (e) { } }
addEventListener('pagehide', () => { if (dirty) save(); }); document.addEventListener('visibilitychange', () => { if (document.hidden && dirty) save(); });

const need = l => 60 + 40 * l;                       // XP from level l to l+1
function lvInfo(xp) { let l = 1, x = xp; while (l < MAXLV && x >= need(l)) { x -= need(l); l++; } return { lv: l, cur: l >= MAXLV ? 0 : x, need: l >= MAXLV ? 0 : need(l) }; }
const D = { stars: 0, done: {}, items: {}, maids: {}, lv: 1 }; const B = {};
const BK = ['dmg', 'hp', 'ranged', 'gold', 'xp', 'charge', 'cd', 'regen', 'killheal', 'boss', 'startulti', 'laststand'];
function owned(id) { const it = ITEMS[id]; return !!it && (it.src.m ? !!D.done[it.src.m] : !!M.chest[it.src.c]); }
function refresh() {
  const SM = starMap(); D.stars = totalStars(SM); D.done = {}; for (const m of MLIST) if (mdone(m.id, SM)) D.done[m.id] = 1;
  D.items = {}; for (const id in ITEMS) if (owned(id)) D.items[id] = 1;
  D.maids = {}; for (const id in MAIDS) { const u = MAIDS[id].u; if (u.start || (u.m && D.done[u.m]) || (u.m0 && +SM[u.m0] > 0) || (u.s && D.stars >= u.s)) D.maids[id] = 1; }
  D.lv = lvInfo(M.xp).lv; M.team = M.team.filter(id => D.maids[id]).slice(0, TEAM);
  // a fresh unlock goes straight into an empty slot / free squad place (or replaces a weaker saber/bow/armour), so rewards are felt without menu work
  for (const id in D.items) if (!M.auto[id]) { M.auto[id] = 1; dirty = true; const sl = ITEMS[id].s, cur = M.eq[sl], ord = Object.keys(ITEMS).filter(k => ITEMS[k].s === sl);
    if (!cur || (sl !== 'amulet' && ord.indexOf(id) > ord.indexOf(cur))) M.eq[sl] = id; }
  for (const id in D.maids) if (!M.auto[id]) { M.auto[id] = 1; dirty = true; if (M.team.length < TEAM && !M.team.includes(id)) M.team.push(id); }
  for (const s of SLOTS) if (M.eq[s] && !D.items[M.eq[s]]) delete M.eq[s];
  for (const k of BK) B[k] = 0;
  for (const s of SLOTS) { const it = ITEMS[M.eq[s]]; if (it) for (const [k, v] of it.b) B[k] += v; }
  for (const id of M.team) { const [k, v] = MAIDS[id].p; B[k] += v; }
  B.cd = Math.min(B.cd, 30);
}
refresh();

// ---------------------------------------------------------------- multipliers (the combat code can read these; everything defaults to 1 / 0)
const tier = tr => clamp(M.sk[tr] | 0, 0, 3);
function eff(tr, e) { const T = TRACKS[tr]; let v = 0, has = false; for (let i = 0; i < tier(tr); i++) if (T.tiers[i][0] === e) { v += T.tiers[i][1] || 0; has = true; } return has ? (v || 1) : 0; }
function trackOf(kind) { for (const k in TRACKS) if (TRACKS[k].kinds.includes(kind)) return k; return null; }
export function mul(key) {
  try {
    switch (key) {
      case 'hero.hp': return (1 + .015 * (D.lv - 1)) * (1 + B.hp / 100);
      case 'hero.dmg': return (1 + .01 * (D.lv - 1)) * (1 + B.dmg / 100);
      case 'gold': return 1 + B.gold / 100;
      case 'xp': return 1 + B.xp / 100;
      case 'cd': return 1 - B.cd / 100;
      case 'ulti.gain': return (1 + B.charge / 100) * (1 + (eff('call', 'charge') || 0) / 100);
    }
    const [k, prop] = String(key).split('.'), tr = trackOf(k); if (!tr) return 1;
    if (prop === 'dmg') return (1 + eff(tr, 'dmg') / 100) * (RANGED[k] ? 1 + B.ranged / 100 : 1);
    if (prop === 'cd') return (1 - eff(tr, 'cd') / 100) * (1 - B.cd / 100);
    if (prop === 'r') return 1 + eff(tr, 'area') / 100;
  } catch (e) { }
  return 1;
}
export function add(key) {
  try {
    const [k, prop] = String(key).split('.'), tr = trackOf(k); if (!tr) return 0;
    if (prop === 'hits') return eff(tr, 'hit') ? 1 : 0;        // spin.hits / slam.hits / sweep.hits: one extra hit
    if (prop === 'waves') return eff(tr, 'volley') ? 2 : 0;    // rain.waves: two extra volleys
    if (prop === 'targets') return eff(tr, 'volley') ? 1 : 0;  // chain.targets: one extra target
    if (prop === 'wave') return eff(tr, 'wave') ? 1 : 0;       // dash.wave / bash.wave / cleave.wave / thrust.wave: end shockwave
    if (prop === 'heal') return (eff(tr, 'heal') || 0) / 100;  // ulti.heal / amulet.heal / cry.heal: fraction of max HP
  } catch (e) { }
  return 0;
}
const NATIVE = {};
// damage multiplier for one hit. engine.js pd(kind?) multiplies by this (hook: `__META.pdMul(kk)`); kind = explicit key ('rain') or the current act's skill
export function pdMul(kk) {
  const p = G.player; if (!p) return 1; const a = p.act; let k = 1;
  if (kk) k = mul(kk + '.dmg'); else if (a && KIND[a.kind]) k = mul(KIND[a.kind][1] + '.dmg');
  if (p.giant > 0) k *= mul('amulet.dmg');
  return mul('hero.dmg') * k * (B.boss && G.boss && !G.boss.dead ? 1 + B.boss / 100 : 1) * (B.laststand && p.hp < p.maxHp * .35 ? 1 + B.laststand / 100 : 1);
}
// if engine.js carries the pdMul hook, the dmgBoost emulation is switched off (self-healing: if the hook disappears, emulation stays on)
try { fetch(new URL('./engine.js?v=1795715799', import.meta.url)).then(r => r.text()).then(x => { if (x.includes('__META.pdMul')) NATIVE.dmg = 1; }).catch(() => { }); } catch (e) { }   // combat code that applies a group itself calls __META.native('dmg' | 'cd' | 'extras' | 'hp') to switch the emulation here off

// ---------------------------------------------------------------- rewards
let goldSeen = SAVE.gold;
function grant(coins, why) { if (!coins) return; SAVE.gold += coins; saveGame(); hudGold(); goldSeen = SAVE.gold; toast('+' + coins + ' 🪙' + (why ? ' · ' + why : '')); }
function bump(c, n) { if (!n) return; ensureQuests(); M.st[c] = (M.st[c] || 0) + n; M.q.dc[c] = (M.q.dc[c] || 0) + n; M.q.wc[c] = (M.q.wc[c] || 0) + n; dirty = true; }
function addXp(n) {
  if (!n || n <= 0) return; const l0 = lvInfo(M.xp).lv; M.xp += Math.round(n); dirty = true; const l1 = lvInfo(M.xp).lv; hudXp();
  if (l1 > l0) levelUp(l0, l1);
}
function levelUp(l0, l1) {
  const hp0 = mul('hero.hp'); D.lv = l1; const hp1 = mul('hero.hp'); let coins = 0; for (let l = l0 + 1; l <= l1; l++) coins += 20 + 10 * l;
  SAVE.gold += coins; saveGame(); hudGold(); goldSeen = SAVE.gold; save();
  const p = G.player, live = p && !p.dead && $('hud') && $('hud').classList.contains('on');
  if (live) {
    if (!NATIVE.hp) p.maxHp = Math.round(p.maxHp * hp1 / hp0); p.hp = Math.min(p.maxHp, p.hp + p.maxHp * .35); G.ulti = Math.min(100, (G.ulti || 0) + 25);
    try { flash(.35); ringFx(p.x, p.z, 6.5, 0xffe08a); ringFx(p.x, p.z, 3.4, 0xfff4c8); burst(p.x, 1.6, p.z, 0xffd060, 4); num(p, '▲ ' + l1, 'c'); G.slow = Math.max(G.slow || 0, .45); G.shake = Math.max(G.shake || 0, .25); } catch (e) { }
  }
  sfx('power'); lvBanner(l1, coins); hudXp(true);
}

// ---------------------------------------------------------------- quests
const dayKey = (d = new Date()) => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
const weekKey = (d = new Date()) => 'w' + Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5 + 3) / 7);
function pick(pool, n, seed) { let h = 2166136261; for (const ch of seed) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } const rnd = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return (h >>> 0) / 4294967296; };
  const a = pool.slice(), out = [], used = {}; while (a.length && out.length < n) { const q = a.splice(Math.floor(rnd() * a.length), 1)[0]; if (used[q[1]]) continue; used[q[1]] = 1; out.push(q[0]); } return out; }
function ensureQuests() {
  const q = M.q, d = dayKey(), w = weekKey();
  if (q.day !== d || !q.dl || q.dl.length < 3) { q.day = d; q.dc = {}; q.dd = {}; q.dall = 0; q.dl = pick(DQ, 3, d); dirty = true; }
  if (q.wk !== w || !q.wl || q.wl.length < 2) { q.wk = w; q.wc = {}; q.wd = {}; q.wl = pick(WQ, 2, w); dirty = true; }
}
const qdef = (pool, id) => pool.find(x => x[0] === id);
function achVal(kind) { switch (kind) { case 'lv': return D.lv; case 'tstars': return D.stars; case 'up': return Object.keys(TRACKS).reduce((a, k) => a + tier(k), 0); case 'eq': return SLOTS.filter(s => M.eq[s]).length; case 'maids': return Object.keys(D.maids).length; case 'final': return D.done['7-4'] ? 1 : 0; default: return M.st[kind] || 0; } }
function claimables() {
  ensureQuests(); const q = M.q; let n = 0, dn = 0;
  for (const id of q.dl) { const f = qdef(DQ, id); if (!f) continue; const ok = (q.dc[f[1]] || 0) >= f[2]; if (ok) dn++; if (ok && !q.dd[id]) n++; }
  if (dn >= 3 && !q.dall) n++;
  for (const id of q.wl) { const f = qdef(WQ, id); if (f && (q.wc[f[1]] || 0) >= f[2] && !q.wd[id]) n++; }
  for (const a of ACH) if (!M.ach[a[0]] && achVal(a[1]) >= a[2]) n++;
  let c = 0; for (const ch of CHESTS) if (D.stars >= ch[0] && !M.chest[ch[0]]) c++;
  return { quests: n, chests: c, all: n + c };
}
function newCount() { let i = 0, m = 0; for (const id in D.items) if (!M.seen[id]) i++; for (const id in D.maids) if (!M.seen[id]) m++; return { items: i, maids: m }; }

// ---------------------------------------------------------------- combat bridge (runs on its own rAF; reads engine state, never patches engine code)
const HERO0 = {}; for (const h in HERO_SK) { HERO0[h] = {}; for (const k in HERO_SK[h]) HERO0[h][k] = HERO_SK[h][k][1]; }
const SLOT_KIND = { 1: 'spin', 6: 'slam', 2: 'rain', 7: 'chain', 3: 'dash', 5: 'leap', 8: 'amulet' };
function applyCd() {
  if (NATIVE.cd) return;
  for (const h in HERO0) for (const k in HERO0[h]) if (HERO_SK[h] && HERO_SK[h][k]) HERO_SK[h][k][1] = +(HERO0[h][k] * mul(HERO_SK[h][k][0] + '.cd')).toFixed(2);
  for (const k in SLOT_KIND) { const s = G.sk && G.sk[k]; if (!s) continue; if (s._b === undefined) s._b = s.max; s.max = +(s._b * (SLOT_KIND[k] === 'amulet' ? mul('cd') : mul(SLOT_KIND[k] + '.cd'))).toFixed(2); }
}
const ST = { p: null, base: 1, hpMul: 1, act: null, shield: 0, ulti: 0, time: 0, endOn: false, pend: null, pendT: 0 };
const sched = [];
const later = (d, fn) => sched.push({ t: G.time + d, fn, p: G.player });
function sd(k, kind) { const p = G.player; return (p.d.dmg[0] + p.d.dmg[1]) / 2 * (.88 + Math.random() * .24) * ST.base * mul('hero.dmg') * (p.giant > 0 ? 2.2 : 1) * k * (kind ? mul(kind + '.dmg') : 1); }
function band(x, z, r0, r1, dmg, op, stag) { let n = 0; const p = G.player; for (const e of G.ents) { if (e.dead || e.team !== 'enemy') continue; const d = Math.hypot(e.x - x, e.z - z) - (e.r || 0); if (d < r1 && d >= r0) { if (e.damage(dmg(), p, op || {})) n++; if (stag && e.d && !e.d.heavy) e.stagger = Math.max(e.stagger || 0, stag); } } if (n) { sfx('hit'); G.ulti = Math.min(100, (G.ulti || 0) + 2 * n); } return n; }
function onAct(p, a) {
  const K = KIND[a.kind]; if (!K) return; bump('skills', 1); if (NATIVE.extras) return;
  const tr = K[0], key = K[1], T = tier(tr), fx = Math.sin(p.rot), fz = Math.cos(p.rot);
  switch (a.kind) {
    case 'spin':
      if (add('spin.hits')) later(.8, () => { sfx('swing'); ringFx(p.x, p.z, 4.3, 0xffe08a); band(p.x, p.z, -9, 4.3, () => sd(1.6, 'spin'), { kb: 9 }); });
      if (mul('spin.r') > 1) later(.5, () => { const r1 = 3.9 * mul('spin.r'); ringFx(p.x, p.z, r1, 0xffc850); band(p.x, p.z, 3.9, r1, () => sd(1.6, 'spin'), { kb: 8 }); });
      break;
    case 'slamP': {
      const r0 = p.giant > 0 ? 9 : 5.5;
      if (mul('slam.r') > 1) later(.52, () => { const r1 = r0 * mul('slam.r'); ringFx(p.x, p.z, r1, 0xe8b860); band(p.x, p.z, r0, r1, () => sd(2, 'slam'), { kb: 6 }, 1.4); });
      if (add('slam.hits')) later(1.0, () => { ringFx(p.x, p.z, r0, 0xffa040); burst(p.x, .5, p.z, 0xc8a070, 4, true); sfx('big'); G.shake = Math.max(G.shake || 0, .4); band(p.x, p.z, -9, r0, () => sd(1.1, 'slam'), { kb: 5 }, .8); });
      break; }
    case 'chain':
      if (add('chain.targets')) later(.3, () => { const t0 = a.tg && !a.tg.dead ? a.tg : p; let b = null, bd = 8; for (const e of G.ents) { if (e.dead || e.team !== 'enemy' || e === a.tg) continue; const d = Math.hypot(e.x - t0.x, e.z - t0.z); if (d < bd) { bd = d; b = e; } }
        if (b) { b.damage(sd(1.2, 'chain'), p, { kb: 0 }); if (b.d && !b.d.heavy) b.stagger = Math.max(b.stagger || 0, .8); ringFx(b.x, b.z, 1.8, 0xc9c2b0); burst(b.x, 1.3, b.z, 0xe8e0c8, 1.6); sfx('hit'); } });
      break;
    case 'dash':
      if (add('dash.wave')) later(.26, () => { ringFx(p.x, p.z, 3.5, 0xfff0c0); band(p.x, p.z, -9, 3.5, () => sd(1.4, 'dash'), { kb: 9 }); });
      break;
    case 'leap':
      if (mul('leap.r') > 1) later(.66, () => { if (p.leaping) return; const r1 = 3.6 * mul('leap.r'); ringFx(p.x, p.z, r1, 0xbfe3ff); band(p.x, p.z, 3.6, r1, () => sd(1.6, 'leap'), { kb: 9 }); });
      break;
    case 'ulti': if (add('ulti.heal')) heal(p, add('ulti.heal')); break;
    case 'cry': if (add('cry.heal')) later(.35, () => heal(p, add('cry.heal'))); break;
    case 'bash': case 'cleave': case 'thrust':
      if (add(key + '.wave')) later(a.kind === 'bash' ? .3 : a.kind === 'cleave' ? .62 : .36, () => { const f2 = Math.sin(p.rot), g2 = Math.cos(p.rot), cx = p.x + f2 * 1.6, cz = p.z + g2 * 1.6; ringFx(cx, cz, 3.4, 0xcfe4ff); sfx('big'); band(cx, cz, -9, 3.4, () => sd(1.3, key), { kb: 10 }, .6); });
      break;
    case 'sweep':
      if (mul('sweep.r') > 1) later(.55, () => { const r1 = 3.8 * mul('sweep.r'); ringFx(p.x, p.z, r1, 0xcfe8ff); band(p.x, p.z, 3.8, r1, () => sd(1.5, 'sweep'), { kb: 9 }); });
      if (add('sweep.hits')) later(.95, () => { sfx('swing'); ringFx(p.x, p.z, 4.1, 0xe8f4ff); band(p.x, p.z, -9, 4.1, () => sd(1.5, 'sweep'), { kb: 9 }, .5); });
      break;
  }
}
function heal(p, f) { if (!p || p.dead || f <= 0) return; const h = Math.round(p.maxHp * f); if (p.hp >= p.maxHp) return; p.hp = Math.min(p.maxHp, p.hp + h); try { num(p, '+' + h, 'h'); } catch (e) { } }
function initPlayer(p) {
  p._mt = 1; ST.p = p; ST.base = G.dmgBoost || 1; ST.hpMul = mul('hero.hp'); ST.act = null; ST.shield = 0; sched.length = 0; goldSeen = SAVE.gold;
  if (!NATIVE.hp) { p.maxHp = Math.round(p.maxHp * ST.hpMul); p.hp = p.maxHp; }
  applyCd(); if (B.startulti) G.ulti = Math.max(G.ulti || 0, B.startulti); ST.ulti = G.ulti || 0; hudXp();
}
function killXp(e) { const hv = (e.d && e.d.heavy) || e === G.boss; return hv ? 80 : 4 + Math.min(8, Math.round((e.maxHp || 60) / 60)); }
function combatTick(now) {
  const p = G.player, hudOn = $('hud') && $('hud').classList.contains('on');
  if (p && !p._mt) initPlayer(p);
  if (p && ST.p === p && !G.paused && hudOn) {
    const dt = clamp(G.time - ST.time, 0, .5);
    // per-skill damage through the engine's global G.dmgBoost (pd() multiplies by it)
    if (!NATIVE.dmg) { const a = p.act; G.dmgBoost = ST.base * pdMul(!a && G.rains && G.rains.length ? 'rain' : ''); }
    else if (ST.emu) { ST.emu = 0; G.dmgBoost = ST.base; }
    if (!NATIVE.dmg) ST.emu = 1;
    if (p.act !== ST.act) { ST.act = p.act; if (p.act && !p.act._mt) { p.act._mt = 1; try { onAct(p, p.act); } catch (e) { } } }
    // amulet combo (shield rises) and arrow rains
    if ((p.shield || 0) > ST.shield + 1) { bump('skills', 1); if (add('amulet.heal')) heal(p, add('amulet.heal')); } ST.shield = p.shield || 0;
    if (G.rains) for (const r of G.rains) if (!r._mt) { r._mt = 1; if (!NATIVE.extras && add('rain.waves')) { G.rains.push({ x: r.x, z: r.z, r: r.r, t: .84 - 1.65, n: 3, tele: r.tele, _mt: 1 }); const rr = r; later(1.45, () => ringFx(rr.x, rr.z, rr.r, 0xffc040)); } }
    // kills -> XP, quests, kill-heal
    for (const e of G.ents) if (e.dead && !e._mx && e.team === 'enemy') { e._mx = 1; if (e.bg) continue; const hv = (e.d && e.d.heavy) || e === G.boss; bump('kills', 1); if (hv) bump('heavy', 1); addXp(killXp(e) * mul('xp')); if (B.killheal && !p.dead) p.hp = Math.min(p.maxHp, p.hp + p.maxHp * B.killheal / 100); }
    // gold bonus + gold quest, ulti charge bonus, regen
    if (SAVE.gold > goldSeen) { const d = SAVE.gold - goldSeen; bump('gold', d); const ex = Math.round(d * (mul('gold') - 1) + (ST.gfrac || 0)); ST.gfrac = d * (mul('gold') - 1) + (ST.gfrac || 0) - ex; if (ex > 0) { SAVE.gold += ex; G.chGold = (G.chGold || 0) + ex; saveGame(); hudGold(); } } goldSeen = SAVE.gold;
    const u = G.ulti || 0; if (u > ST.ulti && u < 100 && u - ST.ulti <= 40) G.ulti = Math.min(100, u + (u - ST.ulti) * (mul('ulti.gain') - 1)); ST.ulti = G.ulti || 0;
    if (B.regen && !p.dead && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + p.maxHp * .006 * dt);
    for (let i = sched.length - 1; i >= 0; i--) { const s = sched[i]; if (s.p !== p || p.dead) { sched.splice(i, 1); continue; } if (G.time >= s.t) { sched.splice(i, 1); try { s.fn(); } catch (e) { } } }
  }
  ST.time = G.time;
  // mission end: hook (missionEnd) or fallback (the #end screen appearing)
  const endOn = !!($('end') && $('end').classList.contains('on'));
  if (endOn && !ST.endOn) { if (!ST.pend && G.mis && !G.mis._mtDone) ST.pend = { id: G.mis.id, k: $('stl') ? $('stl').querySelectorAll('div:not(.no)').length : 1 }; if (ST.pend) finalize(); else endRow(null); }
  ST.endOn = endOn;
  if (ST.pend && now - ST.pendT > 7000) finalize();
  if (dirty && now - saveT > 2500) { saveT = now; save(); }
}
// called by missions.js win() (hook) — stars are saved a moment later, so the result is finalised when the end screen opens
export function missionEnd(id, k) { if (!id || (G.mis && G.mis._mtDone)) return; ST.pend = { id, k: k | 0 }; ST.pendT = performance.now(); }
function unlockSet() { const o = {}; for (const id in D.items) o[id] = 1; for (const id in D.maids) o[id] = 1; return o; }
function finalize() {
  const pd = ST.pend; ST.pend = null; if (!pd) return; if (G.mis) { if (G.mis._mtDone) return; G.mis._mtDone = 1; }
  const m = MLIST.find(x => x.id === pd.id); if (!m) return; const before = unlockSet(), lv0 = D.lv;
  bump('missions', 1); bump('stars', pd.k); if (pd.k >= 3) bump('s3', 1);
  const xp = Math.round((80 + 25 * pd.k + 10 * m.c) * mul('xp')); addXp(xp); refresh();
  const got = []; for (const id in D.items) if (!before[id]) got.push(tt('newitem', { x: tt('i_' + id) })); for (const id in D.maids) if (!before[id]) got.push(tt('newmaid', { x: mname(id) }));
  save(); endRow({ xp, lvUp: D.lv > lv0, got }); for (const g of got) toast('🎁 ' + g); mapBits();
}

// ---------------------------------------------------------------- UI (all DOM + CSS injected here; restyle through the --mt-* variables / .mt-* classes)
const CSS = `
.mt{--mt-bg:#140d07;--mt-bg2:#22160b;--mt-panel:rgba(46,31,16,.86);--mt-panel2:rgba(20,13,7,.78);--mt-line:#6a4a22;--mt-line2:#c79a3a;--mt-gold:#f0c56a;--mt-text:#f3e9d6;--mt-dim:#c8b28a;--mt-accent:#8a2a14;--mt-accent2:#b5452c;--mt-ok:#6fbf62;--mt-lock:#7d7466;--mt-r:8px;--mt-fs:13px;--mt-font:inherit}
#mt-camp{z-index:58;background:radial-gradient(120% 90% at 50% 0%,var(--mt-bg2),var(--mt-bg) 70%);color:var(--mt-text);font-family:var(--mt-font);font-size:var(--mt-fs);flex-direction:column;padding:0 max(8px,env(safe-area-inset-right)) max(4px,env(safe-area-inset-bottom)) max(8px,env(safe-area-inset-left))}
#mt-camp.open{display:flex}
.mt button{font:inherit;color:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
.mt-top{flex:none;height:44px;display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--mt-line);padding-top:max(0px,env(safe-area-inset-top))}
.mt-back{padding:7px 12px;background:var(--mt-panel2);border:1px solid var(--mt-line2);border-radius:var(--mt-r);font-size:13px;white-space:nowrap}
.mt-title{margin:0;font-size:20px;letter-spacing:.12em;color:var(--mt-gold);flex:none}
.mt-lvl{flex:1;display:flex;align-items:center;gap:8px;justify-content:flex-end;min-width:0}
.mt-lvn{display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:28px;padding:0 4px;border-radius:50%;border:2px solid var(--mt-gold);background:var(--mt-accent);font-size:14px;color:#fff;box-sizing:border-box}
.mt-bar{display:inline-block;position:relative;height:8px;width:150px;border-radius:5px;background:rgba(0,0,0,.55);border:1px solid var(--mt-line);overflow:hidden;vertical-align:middle}
.mt-bar i{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#c58a1d,var(--mt-gold));border-radius:5px}
.mt-bar.ok i{background:linear-gradient(90deg,#3f8f3a,var(--mt-ok))}
.mt-lvl small{color:var(--mt-dim);font-size:11px;white-space:nowrap}
.mt-gold{flex:none;padding:5px 12px;border:1px solid var(--mt-line2);border-radius:16px;background:var(--mt-panel2);color:#ffd970;font-size:15px;white-space:nowrap}
.mt-body{flex:1;display:flex;min-height:0;gap:8px;padding-top:6px}
.mt-tabs{flex:none;width:136px;display:flex;flex-direction:column;gap:4px}
.mt-tab{flex:1 1 0;min-height:0;max-height:54px;position:relative;display:flex;align-items:center;gap:8px;padding:0 8px;text-align:left;background:var(--mt-panel2);border:1px solid var(--mt-line);border-radius:var(--mt-r);color:var(--mt-dim);font-size:13px;line-height:1.1}
.mt-tab b{font-size:18px;font-weight:400;flex:none;width:22px;text-align:center}
.mt-tab.sel{background:linear-gradient(90deg,var(--mt-accent),rgba(138,42,20,.25));border-color:var(--mt-gold);color:#fff}
.mt-dot{position:absolute;top:-4px;right:-4px;min-width:17px;height:17px;border-radius:9px;background:#e0412f;color:#fff;font:700 11px/17px sans-serif;text-align:center;padding:0 3px;box-sizing:border-box;box-shadow:0 1px 3px #000;pointer-events:none}
.mt-pane{flex:1;min-width:0;overflow-y:auto;overflow-x:hidden;touch-action:pan-y;-webkit-overflow-scrolling:touch;padding:0 2px 6px 0}
.mt-pane::-webkit-scrollbar{width:4px}.mt-pane::-webkit-scrollbar-thumb{background:var(--mt-line);border-radius:2px}
.mt-cols{display:grid;grid-template-columns:1fr 1fr;gap:8px;align-items:start}
.mt-card{background:var(--mt-panel);border:1px solid var(--mt-line);border-radius:var(--mt-r);padding:8px 10px}
.mt-h{margin:0 0 6px;font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:var(--mt-gold);font-weight:400;display:flex;justify-content:space-between;align-items:baseline;gap:8px}
.mt-h small{color:var(--mt-dim);font-size:11px;letter-spacing:0;text-transform:none}
.mt-btn{padding:7px 10px;min-width:74px;min-height:32px;background:var(--mt-accent);border:1px solid var(--mt-line2);border-radius:6px;color:#fff;font-size:13px;white-space:nowrap}
.mt-btn:active{transform:scale(.95)}
.mt-btn.poor{opacity:.5}
.mt-btn.done,.mt-btn[disabled]{background:transparent;border-color:var(--mt-line);color:var(--mt-dim);opacity:.8}
.mt-btn.go{background:linear-gradient(#4f9a45,#2f6a2a);border-color:#bfe8a8;animation:mtpulse 1.2s infinite}
@keyframes mtpulse{50%{box-shadow:0 0 12px 2px rgba(150,230,120,.55)}}
.mt-new{display:inline-block;margin-left:5px;padding:0 4px;border-radius:3px;background:#e0412f;color:#fff;font:700 9px/14px sans-serif;vertical-align:middle}
/* hero */
.mt-hero{display:flex;gap:10px;align-items:center}
.mt-port{flex:none;width:84px;height:84px;border-radius:var(--mt-r);border:2px solid var(--mt-line2);background:#1c140c center 20%/cover}
.mt-hero h3{margin:0 0 2px;font-size:18px;color:var(--mt-gold);font-weight:400}
.mt-hero .mt-bar{width:100%;height:10px;margin:4px 0 2px}
.mt-stat{display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px dashed rgba(106,74,34,.6)}
.mt-stat b{color:var(--mt-gold);font-weight:400}
.mt-note{color:var(--mt-dim);font-size:11px;margin-top:5px}
.mt-chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
.mt-chip{padding:3px 7px;border:1px solid var(--mt-line);border-radius:10px;background:var(--mt-panel2);font-size:11px;color:var(--mt-text)}
.mt-row{display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px dashed rgba(106,74,34,.6)}
.mt-row:last-child{border-bottom:0}
.mt-row .mt-g{flex:1;min-width:0}
.mt-row small{display:block;color:var(--mt-dim);font-size:11px}
.mt-pips{color:var(--mt-gold);letter-spacing:1px;font-size:10px}
/* skills */
.mt-seg{display:flex;gap:6px;margin-bottom:6px}
.mt-seg button{padding:6px 14px;background:var(--mt-panel2);border:1px solid var(--mt-line);border-radius:16px;color:var(--mt-dim);font-size:13px}
.mt-seg button.sel{background:var(--mt-accent);border-color:var(--mt-gold);color:#fff}
.mt-sk{display:grid;grid-template-columns:150px 1fr 88px;gap:8px;align-items:center;margin-bottom:6px}
.mt-skn{display:flex;align-items:center;gap:8px;min-width:0;line-height:1.15}
.mt-ic{flex:none;width:38px;height:38px;border-radius:50%;border:2px solid var(--mt-line2);background:radial-gradient(circle at 35% 30%,#5a2a1a,#1c0e08);display:flex;align-items:center;justify-content:center;font-size:19px}
.mt-tiers{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}
.mt-tier{min-height:40px;padding:4px 6px;border:1px solid var(--mt-line);border-radius:6px;background:var(--mt-panel2);color:var(--mt-lock);font-size:11px;line-height:1.2;display:flex;flex-direction:column;justify-content:center}
.mt-tier u{text-decoration:none;font-size:9px;letter-spacing:.08em;text-transform:uppercase;opacity:.8}
.mt-tier.sel{border-color:var(--mt-gold);background:linear-gradient(rgba(138,42,20,.75),rgba(74,20,11,.75));color:#fff}
.mt-tier.next{border-color:var(--mt-line2);color:var(--mt-text);border-style:dashed}
/* equipment */
.mt-eq{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.mt-slot h4{margin:0 0 5px;display:flex;align-items:center;gap:6px;font-size:13px;font-weight:400;color:var(--mt-gold);letter-spacing:.06em}
.mt-slot h4 svg{width:22px;height:22px;flex:none}
.mt-item{position:relative;margin-bottom:5px;padding:6px 7px;min-height:74px;border:1px solid var(--mt-line);border-radius:var(--mt-r);background:var(--mt-panel);display:flex;flex-direction:column;gap:2px;box-sizing:border-box;text-align:left;width:100%}
.mt-item b{font-weight:400;font-size:13px;line-height:1.15}
.mt-item small{color:var(--mt-dim);font-size:11px;line-height:1.2}
.mt-item em{margin-top:auto;font-style:normal;font-size:11px;color:var(--mt-dim)}
.mt-item.r1 b{color:#d9a878}.mt-item.r2 b{color:#dfe6ec}.mt-item.r3 b{color:var(--mt-gold)}
.mt-item.sel{border-color:var(--mt-gold);background:linear-gradient(rgba(138,42,20,.7),rgba(60,24,12,.7));box-shadow:0 0 0 1px var(--mt-gold) inset}
.mt-item.sel em{color:var(--mt-ok)}
.mt-item.lk{opacity:.62;background:var(--mt-panel2)}
.mt-item.lk b{color:var(--mt-lock)}
/* maidens */
.mt-md{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.mt-maid{position:relative;display:flex;gap:7px;align-items:center;padding:6px;min-height:62px;border:1px solid var(--mt-line);border-radius:var(--mt-r);background:var(--mt-panel);text-align:left;box-sizing:border-box;width:100%}
.mt-av{flex:none;width:40px;height:40px;border-radius:50%;border:2px solid var(--mt-line2);background:#333 center 15%/cover;display:flex;align-items:center;justify-content:center;font-size:18px;color:#fff;text-shadow:0 1px 2px #000}
.mt-maid .mt-g{min-width:0}
.mt-maid b{display:block;font-weight:400;font-size:13px;color:var(--mt-gold);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mt-maid small{display:block;color:var(--mt-text);font-size:11px;line-height:1.2}
.mt-maid.sel{border-color:var(--mt-gold);background:linear-gradient(rgba(138,42,20,.7),rgba(60,24,12,.7));box-shadow:0 0 0 1px var(--mt-gold) inset}
.mt-maid.sel:after{content:'✓';position:absolute;right:5px;top:3px;color:var(--mt-ok);font-size:14px}
.mt-maid.lk{opacity:.6;background:var(--mt-panel2)}.mt-maid.lk .mt-av{filter:grayscale(1) brightness(.6)}.mt-maid.lk b{color:var(--mt-lock)}.mt-maid.lk small{color:var(--mt-dim)}
/* quests */
.mt-q{display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;padding:5px 0;border-bottom:1px dashed rgba(106,74,34,.6)}
.mt-q:last-child{border-bottom:0}
.mt-q .mt-bar{width:100%;height:6px;margin-top:3px;display:block}
.mt-q .mt-rw{color:#ffd970;white-space:nowrap;font-size:13px}
.mt-q.cl{opacity:.55}
.mt-q small{color:var(--mt-dim);font-size:11px}
.mt-chs{display:grid;grid-template-columns:repeat(8,1fr);gap:4px}
.mt-ch{padding:4px 0;border:1px solid var(--mt-line);border-radius:6px;background:var(--mt-panel2);text-align:center;font-size:11px;color:var(--mt-dim);line-height:1.2}
.mt-ch b{display:block;font-size:20px;font-weight:400;filter:grayscale(1) brightness(.7)}
.mt-ch.go{border-color:#bfe8a8;color:#fff;animation:mtpulse 1.2s infinite}.mt-ch.go b{filter:none}
.mt-ch.cl{opacity:.5}.mt-ch.cl b{filter:none}
/* book */
.mt-book{display:grid;grid-template-columns:190px 1fr;gap:8px}
.mt-book .mt-bl button{display:block;width:100%;margin-bottom:4px;padding:7px 8px;text-align:left;background:var(--mt-panel2);border:1px solid var(--mt-line);border-radius:6px;color:var(--mt-dim);font-size:12px;line-height:1.2}
.mt-book .mt-bl button.sel{border-color:var(--mt-gold);color:#fff;background:var(--mt-accent)}
.mt-book .mt-bl button[disabled]{opacity:.45}
.mt-book p{margin:0;font-size:15px;line-height:1.5;white-space:pre-line}
.mt-book h3{margin:0 0 6px;color:var(--mt-gold);font-weight:400;font-size:17px}
/* outside the camp: title/map buttons, HUD xp, end row, toasts, level-up */
#tcamp{position:relative}
.mt-mapbtn{position:relative;margin-left:8px;padding:6px 12px;background:rgba(20,13,7,.78);border:1px solid #c79a3a;border-radius:8px;color:#f3e9d6;font:inherit;font-size:14px;cursor:pointer;white-space:nowrap}
#mt-chestbar{position:absolute;z-index:6;left:50%;bottom:max(6px,env(safe-area-inset-bottom));transform:translateX(-50%);display:flex;align-items:center;gap:5px;padding:4px 8px;background:rgba(20,13,7,.82);border:1px solid var(--mt-line2);border-radius:18px;font-size:11px;color:var(--mt-dim)}
#mt-chestbar .mt-cb{position:relative;width:38px;padding:2px 0;border-radius:8px;border:1px solid transparent;background:none;text-align:center;line-height:1.1;font-size:10px;color:var(--mt-dim)}
#mt-chestbar .mt-cb b{display:block;font-size:17px;font-weight:400;filter:grayscale(1) brightness(.65)}
#mt-chestbar .mt-cb.go{border-color:#bfe8a8;color:#fff;animation:mtpulse 1.2s infinite}#mt-chestbar .mt-cb.go b{filter:none}
#mt-chestbar .mt-cb.cl{opacity:.45}#mt-chestbar .mt-cb.cl b{filter:none}
#mt-chestbar .mt-cst{color:#ffd970;font-size:13px;padding:0 4px;white-space:nowrap}#mt-chestbar .mt-cmore{font-size:11px;color:var(--mt-dim);padding:0 4px 0 2px}
#mt-xp{position:absolute;left:12px;top:100px;display:flex;align-items:center;gap:5px;pointer-events:none;text-shadow:0 1px 2px #000}
#mt-xp b{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;border-radius:50%;border:1px solid var(--mt-gold);background:var(--mt-accent);font-size:11px;font-weight:400;color:#fff}
#mt-xp .mt-bar{width:74px;height:5px}
#mt-xp.pop b{animation:mtpop .6s ease-out}
@keyframes mtpop{0%{transform:scale(2.2)}100%{transform:scale(1)}}
#mt-end{margin:0 auto 10px;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:6px 10px;font-size:14px;color:var(--mt-text)}
#mt-end .mt-x{color:var(--mt-gold)}
#mt-end .mt-got{flex-basis:100%;color:#bfe8a8;font-size:13px}
#mt-end .mt-endbtn{position:relative;padding:6px 14px;background:var(--mt-panel2);border:1px solid var(--mt-line2);border-radius:16px;font-size:14px}
#mt-toasts{position:fixed;z-index:95;right:max(10px,env(safe-area-inset-right));top:58px;display:flex;flex-direction:column;align-items:flex-end;gap:4px;pointer-events:none}
.mt-toast{padding:5px 12px;border:1px solid var(--mt-line2);border-radius:14px;background:rgba(20,13,7,.9);color:#ffe2a0;font-size:13px;animation:mttoast 2.8s ease-out forwards;max-width:60vw}
@keyframes mttoast{0%{transform:translateX(30px);opacity:0}8%{transform:none;opacity:1}85%{opacity:1}100%{opacity:0}}
#mt-lvup{position:fixed;z-index:59;left:5vw;right:5vw;max-width:90vw;overflow:hidden;top:20%;text-align:center;pointer-events:none;display:none;color:var(--mt-gold);text-shadow:0 2px 0 #3a2208,0 0 22px rgba(255,180,60,.8)}
#mt-lvup.open{display:block;animation:mtlv 2.4s ease-out forwards}
#mt-lvup span{display:block;font-size:clamp(16px,3vw,26px);letter-spacing:.3em}
#mt-lvup b{display:block;font-size:clamp(44px,11vw,88px);line-height:1;font-weight:700}
#mt-lvup small{display:block;font-size:clamp(12px,1.8vw,16px);color:#ffe9b8}
@keyframes mtlv{0%{transform:scale(.4);opacity:0}12%{transform:scale(1.15);opacity:1}22%{transform:scale(1)}80%{opacity:1}100%{opacity:0;transform:translateY(-20px)}}
@media (max-width:700px){.mt-tabs{width:52px}.mt-tab span{display:none}.mt-cols{grid-template-columns:1fr}.mt-eq,.mt-md{grid-template-columns:repeat(2,1fr)}.mt-sk{grid-template-columns:1fr 80px}.mt-sk .mt-tiers{grid-column:1/3;grid-row:2}.mt-book{grid-template-columns:1fr}.mt-lvl small{display:none}}
`;
const ICON = {
  saber: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4 20l3-3M6 15l3 3M8 16C14 13 18 9 20 3c-6 2-10 6-13 12"/></svg>',
  bow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M6 3c9 2 12 9 12 9s-3 7-12 9M6 3v18M3 12h17M17 9l3 3-3 3"/></svg>',
  armor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M8 3l4 2 4-2 5 4-3 4v10H6V11L3 7z"/><path d="M9 12h6M9 15h6M9 18h6" stroke-width="1"/></svg>',
  amulet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M3 5h18L12 21z"/><path d="M8 8h8l-4 7z" stroke-width="1.1"/><path d="M7 5l-2-3M17 5l2-3" stroke-width="1.1"/></svg>',
};
const TABS = [['hero', '⚔', 't_hs'], ['maids', '👥', 't_md'], ['army', '⚒', 't_army'], ['quests', '📜', 't_quests']];   // ui4: one Camp, three tabs (skills + equipment live inside Hero; book/shop are on the title)
const TAB_ALIAS = { skills: 'hero', equip: 'hero', book: 'hero' };
let tab = 'hero', skHero = 'gulayim', bookI = 0, campEl = null, curLang = lang, campFrom = '';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const mname = id => { const n = MAIDS[id].n; return n[LI()] ?? n[0]; };
const pct = v => (v >= 0 ? '+' : '−') + Math.round(Math.abs(v)) + '%';
const bonusTxt = ([k, v]) => tt('b_' + k, { n: v });
const srcTxt = it => it.src.m ? tt('src_mis', { m: misName(it.src.m) }) : tt('src_chest', { n: it.src.c });
function misName(id) { const m = MLIST.find(x => x.id === id); return m ? t(m.n) : id; }
function effTxt(e) { return tt(EFF_TXT[e[0]], { n: e[1] }); }
function dot(n) { return n > 0 ? `<i class="mt-dot">${n}</i>` : ''; }

function build() {
  if (campEl) return; const st = document.createElement('style'); st.id = 'mt-css'; st.textContent = CSS; document.head.appendChild(st);
  campEl = document.createElement('div'); campEl.id = 'mt-camp'; campEl.className = 'layer mt';
  campEl.innerHTML = `<div class="mt-top"><button class="mt-back" data-a="close"></button><div class="mt-tabs"></div><div class="mt-gold"></div></div><div class="mt-body"><div class="mt-pane"></div></div>`;
  document.body.appendChild(campEl);
  campEl.addEventListener('click', onClick);
  const ts = document.createElement('div'); ts.id = 'mt-toasts'; ts.className = 'mt'; document.body.appendChild(ts);
  const lu = document.createElement('div'); lu.id = 'mt-lvup'; lu.className = 'mt'; lu.innerHTML = '<span></span><b></b><small></small>'; document.body.appendChild(lu);
  const hud = $('hud'); if (hud) { const x = document.createElement('div'); x.id = 'mt-xp'; x.className = 'mt'; x.innerHTML = '<b></b><span class="mt-bar"><i></i></span>'; hud.appendChild(x); }
  const tb = $('tbox'); if (tb) { const b = document.createElement('button'); b.className = 'btn alt'; b.id = 'tcamp'; const after = $('tshop') || $('tcont'); if (after && after.parentNode === tb) after.after(b); else tb.appendChild(b); b.onclick = () => openCamp('hero', 'title'); }
  addEventListener('keydown', e => { if (e.key === 'Escape' && campEl.classList.contains('open')) closeCamp(); });
  labels(); hudXp();
}
function labels() {
  const c = claimables(), nw = newCount(), wk = weakList(), n = c.all + nw.items + nw.maids + (wk.some(w => w.can) ? 1 : 0);
  const b = $('tcamp'); if (b) b.innerHTML = '⛺ ' + esc(tt('camp')) + dot(n);
  const mb = document.querySelector('.mt-mapbtn'); if (mb) mb.innerHTML = '⛺ ' + esc(tt('camp')) + dot(c.quests + nw.items + nw.maids + (wk.some(w => w.can) ? 1 : 0));
  const eb = document.querySelector('.mt-endbtn'); if (eb) { const w = wk.find(x => x.can); eb.innerHTML = esc(tt('endcamp')) + (w ? ` <span class="mt-ew">⚠ ${esc(tt('e_weak', { x: w.name }))}</span>` : '') + dot(n); eb.classList.toggle('warn', !!w); }
}
function head() {
  campEl.querySelector('.mt-back').textContent = tt('back');
  campEl.querySelector('.mt-gold').textContent = '🪙 ' + SAVE.gold;
  const c = claimables(), nw = newCount(), dots = { quests: c.all, hero: nw.items + (weakList().some(w => w.can) ? 1 : 0), maids: nw.maids };
  campEl.querySelector('.mt-tabs').innerHTML = TABS.map(([id, ic, k]) => `<button class="mt-tab${id === tab ? ' sel' : ''}" data-a="tab" data-v="${id}"><b>${ic}</b><span>${esc(tt(k))}</span>${dot(dots[id] || 0)}</button>`).join('');
}
function render() { if (!campEl) return; ensureQuests(); refresh(); head(); const pane = campEl.querySelector('.mt-pane'); const sc = pane.scrollTop; pane.innerHTML = PANE[tab](); pane.scrollTop = sc; labels();
  if (tab === 'equip') { for (const id in D.items) if (!M.seen[id]) { M.seen[id] = 1; dirty = true; } } if (tab === 'maids') { for (const id in D.maids) if (!M.seen[id]) { M.seen[id] = 1; dirty = true; } } }
// ---- ui4: plain-words upgrade cards. Each card: what it does now -> after the upgrade, one big button, red/green = weak/good
const fmt = v => (Math.round(v * 10) / 10).toString().replace('.', LI() === 3 ? '.' : ',');
const doneN = () => Object.keys(D.done).length;
const TRAIN = [];   /* QA 2b: ONE upgrade list — hero armour / squad / horse moved into the army tab too */ const TRAIN_ALL = [['life', '🛡', 4], ['squad', '👥', 8], ['horse', '🐴', 10]];   // wave4: sword and maidens' training live once, in the army tab (Gúlayım's sword / maidens' armour)   // [key, icon, missions per recommended level]
function heroBase() { const d = (TD && TD.gulayim) || { hp: 500, dmg: [20, 30] }; return { hp: d.hp, att: (d.dmg[0] + d.dmg[1]) / 2 }; }
function trainVal(k, lv) { const b = heroBase();
  switch (k) { case 'sword': return [tt('dmg'), Math.round(b.att * (1 + .12 * lv) * mul('hero.dmg'))]; case 'life': return [tt('hp'), Math.round(b.hp * (1 + .15 * lv) * mul('hero.hp'))];
    case 'maid': return [tt('st_mstr'), (100 + 15 * lv) + '%']; case 'squad': return [tt('st_mx'), '+' + lv]; case 'horse': return [tt('st_horse'), 260 + 80 * lv]; } return ['', lv]; }
function effAt(tr, e, n) { const T = TRACKS[tr]; let v = 0, has = false; for (let i = 0; i < n; i++) if (T.tiers[i][0] === e) { v += T.tiers[i][1] || 0; has = true; } return has ? (v || 1) : 0; }
function baseCd(tr) { const T = TRACKS[tr], k = T.kinds[0]; for (const h in HERO0) for (const s in HERO0[h]) if (HERO_SK[h][s][0] === k) return HERO0[h][s]; const SL = { spin: 5, rain: 8, dash: 6, leap: 7, ulti: 0 }; return SL[k] || 0; }
function skillVal(tr, e, n) { const v = effAt(tr, e, n), yes = v ? '✓' : '✗';
  switch (e) { case 'dmg': return [tt('dmg'), (100 + v) + '%']; case 'area': return [tt('st_area'), (100 + v) + '%']; case 'charge': return [tt('st_charge'), (100 + v) + '%'];
    case 'heal': return [tt('st_heal'), '+' + v + '%']; case 'hit': return [tt('st_hit'), yes]; case 'wave': return [tt('st_wave'), yes]; case 'volley': return [tt('st_volley'), yes];
    case 'cd': { const b = baseCd(tr); return b ? [tt('st_cd'), fmt(b * (1 - v / 100)) + ' ' + tt('sec')] : [tt('st_cd'), '−' + v + '%']; } } return ['', v]; }
// recommended level grows with finished missions; below it = weak (red)
function weakList() { const n = doneN(), out = [];
  for (const [k, ic, per] of TRAIN) { const U = UPG[k]; if (!U) continue; const lv = SAVE.up[k] | 0, rec = Math.min(U.max, Math.floor(n / per)); if (lv < rec) out.push({ id: k, name: t('u_' + k), can: SAVE.gold >= U.cost(lv) }); }
  for (const k in TRACKS) if (TRACKS[k].hero === 'gulayim') { const lv = tier(k), rec = Math.min(3, Math.floor(n / 9)); if (lv < rec) out.push({ id: k, name: TRACKS[k].nm(), can: SAVE.gold >= COST[lv] }); }
  return out; }
function upCard(o) {   // o: {act, v, ic, name, lv, max, cost, now:[label,val], next:[label,val], weak}
  const mx = o.lv >= o.max, poor = !mx && SAVE.gold < o.cost, st = mx ? 'm' : o.weak === null ? 'n' : o.weak ? 'w' : 'g';
  const pill = mx ? `<i class="mt-pill">${esc(tt('max'))}</i>` : st === 'n' ? '' : `<i class="mt-pill">${esc(tt(st === 'w' ? 'weak' : 'good'))}</i>`;
  const val = mx ? `<b>${esc(o.now[1])}</b>` : `<s>${esc(o.now[1])}</s><u>→</u><b>${esc(o.next[1])}</b>`;
  const pips = o.max <= 8 ? `<span class="mt-pips">${'●'.repeat(Math.min(o.lv, o.max))}${'○'.repeat(Math.max(0, o.max - o.lv))}</span>` : '';
  return `<div class="mt-up ${st}"><div class="mt-uph"><div class="mt-ic">${o.ic}</div><div class="mt-upn">${esc(o.name)}${pips}</div>${pill}</div><div class="mt-upv"><span>${esc(o.now[0])}</span>${val}</div>`
    + `<button class="mt-upb${poor ? ' poor' : ''}${mx ? ' done' : ''}" data-a="${o.act}" data-v="${o.v}"${mx ? ' disabled' : ''}>${mx ? esc(tt('max')) : esc(poor ? tt('up_need', { c: o.cost - SAVE.gold }) : tt('up_btn', { c: o.cost }))}</button></div>`; }
const PANE = {
  hero() {
    const L = lvInfo(M.xp), b = heroBase(), n = doneN(), wk = weakList();
    const msg = wk.length ? `<div class="mt-sum w">⚠ ${esc(tt('s_weak', { x: wk.slice(0, 2).map(w => w.name).join(', ') }))}</div>` : `<div class="mt-sum g">✓ ${esc(tt('s_ok'))}</div>`;
    const top = `<div class="mt-card mt-hs"><div class="mt-port" style="background-image:url(./assets/img/p_gu.jpg)"></div><div class="mt-hsi"><h3>${esc(t('n_gu'))} <small>${esc(tt('lv', { n: L.lv }))}</small></h3><span class="mt-bar"><i style="width:${L.need ? L.cur / L.need * 100 : 100}%"></i></span><small class="mt-note">${L.need ? esc(tt('xp')) + ' ' + L.cur + '/' + L.need : esc(tt('lvmax'))}</small></div>`
      + `<div class="mt-hst"><span>${esc(tt('hp'))}</span><b>${Math.round(b.hp * (1 + .15 * (SAVE.up.life | 0)) * mul('hero.hp'))}</b></div><div class="mt-hst"><span>${esc(tt('dmg'))}</span><b>${Math.round(b.att * (1 + .12 * (SAVE.up.sword | 0)) * mul('hero.dmg'))}</b></div>${msg}</div>`;
    const tr = TRAIN.map(([k, ic, per]) => { const U = UPG[k]; if (!U) return ''; const lv = SAVE.up[k] | 0; return upCard({ act: 'train', v: k, ic, name: t('u_' + k), lv, max: U.max, cost: U.cost(lv), now: trainVal(k, lv), next: trainVal(k, lv + 1), weak: lv < Math.min(U.max, Math.floor(n / per)) }); }).join('');
    const heroes = [['gulayim', 'n_gu'], ['allayar', 'n_al'], ['sarbinaz', 'n_sa']];
    const seg = `<div class="mt-seg">${heroes.map(([h, k]) => `<button class="${h === skHero ? 'sel' : ''}" data-a="skhero" data-v="${h}">${esc(t(k))}</button>`).join('')}</div>`;
    const sk = Object.keys(TRACKS).filter(k => TRACKS[k].hero === skHero).map(k => { const T = TRACKS[k], lv = tier(k), e = T.tiers[Math.min(lv, 2)][0];
      return upCard({ act: 'skill', v: k, ic: T.ic, name: T.nm(), lv, max: 3, cost: COST[Math.min(lv, 2)], now: skillVal(k, e, lv), next: skillVal(k, e, lv + 1), weak: skHero === 'gulayim' ? lv < Math.min(3, Math.floor(n / 9)) : null }); }).join('');
    const eq = SLOTS.map(s => { const own = Object.keys(ITEMS).filter(id => ITEMS[id].s === s && D.items[id]), cur = M.eq[s], it = ITEMS[cur], first = Object.keys(ITEMS).find(id => ITEMS[id].s === s);
      return `<button class="mt-eqs${cur ? ' on' : ''}" data-a="eqcyc" data-v="${s}"${own.length > 1 ? '' : ' disabled'}><span class="mt-eqi">${ICON[s]}</span><span class="mt-g"><b>${esc(cur ? tt('i_' + cur) : tt('sl_' + s))}${cur && !M.seen[cur] ? `<span class="mt-new">${tt('isnew')}</span>` : ''}</b><small>${cur ? it.b.map(bonusTxt).map(esc).join(' · ') : '🔒 ' + esc(srcTxt(ITEMS[first]))}</small>${own.length > 1 ? `<em>⇄ ${esc(tt('eq_tap'))}</em>` : ''}</span></button>`; }).join('');
    for (const id in D.items) if (!M.seen[id] && Object.values(M.eq).includes(id)) { M.seen[id] = 1; dirty = true; }
    return top + `<h4 class="mt-h">${esc(tt('up_h'))}<small>${esc(tt('legend'))}</small></h4><div class="mt-ups">${tr}</div>`
      + `<h4 class="mt-h">${esc(tt('h_sk', { x: t(heroes.find(h => h[0] === skHero)[1]) }))}</h4>${seg}<div class="mt-ups">${sk}</div>`
      + `<h4 class="mt-h">${esc(tt('t_equip'))}</h4><div class="mt-eqr">${eq}</div>`;
  },
  hero_old() {
    const L = lvInfo(M.xp), bl = BK.filter(k => B[k]).map(k => `<span class="mt-chip">${esc(bonusTxt([k, B[k]]))}</span>`).join('');
    const tr = [].map(k => { const lv = SAVE.up[k] | 0, U = UPG[k]; if (!U) return ''; const c = U.cost(lv), mx = lv >= U.max;
      return `<div class="mt-row"><div class="mt-g">${esc(t('u_' + k))} <span class="mt-pips">${'●'.repeat(lv)}${'○'.repeat(Math.max(0, U.max - lv))}</span><small>${esc(t('u_' + k + 'd'))}</small></div><button class="mt-btn${mx ? ' done' : SAVE.gold < c ? ' poor' : ''}" data-a="train" data-v="${k}"${mx ? ' disabled' : ''}>${mx ? tt('max') : '🪙 ' + c}</button></div>`; }).join('');
    return `<div class="mt-cols"><div class="mt-card"><div class="mt-hero"><div class="mt-port" style="background-image:url(./assets/img/p_gu.jpg)"></div><div class="mt-g" style="flex:1;min-width:0"><h3>${esc(t('n_gu'))}</h3><div>${esc(tt('lv', { n: L.lv }))}</div><span class="mt-bar"><i style="width:${L.need ? L.cur / L.need * 100 : 100}%"></i></span><small class="mt-note" style="margin:0">${L.need ? esc(tt('xp')) + ' ' + L.cur + '/' + L.need : esc(tt('lvmax'))}</small></div></div>
      <div style="margin-top:8px"><div class="mt-stat"><span>${esc(tt('hp'))}</span><b>${pct((mul('hero.hp') - 1) * 100)}</b></div><div class="mt-stat"><span>${esc(tt('dmg'))}</span><b>${pct((mul('hero.dmg') - 1) * 100)}</b></div></div>
      <div class="mt-note">${esc(tt('perlv'))}</div><h4 class="mt-h" style="margin-top:8px">${esc(tt('bonus'))}</h4>${bl ? `<div class="mt-chips">${bl}</div>` : `<div class="mt-note">${esc(tt('nobonus'))}</div>`}</div>
      <div class="mt-card"><h4 class="mt-h">${esc(tt('train'))}</h4>${tr}</div></div>`;
  },
  skills() {
    const heroes = [['gulayim', 'n_gu'], ['allayar', 'n_al'], ['sarbinaz', 'n_sa']];
    const seg = `<div class="mt-seg">${heroes.map(([h, k]) => `<button class="${h === skHero ? 'sel' : ''}" data-a="skhero" data-v="${h}">${esc(t(k))}</button>`).join('')}</div>`;
    const rows = Object.keys(TRACKS).filter(k => TRACKS[k].hero === skHero).map(k => { const T = TRACKS[k], lv = tier(k), mx = lv >= 3, c = COST[lv];
      const tiers = T.tiers.map((e, i) => `<div class="mt-tier${i < lv ? ' sel' : i === lv ? ' next' : ''}"><u>${esc(tt('tier', { n: i + 1 }))}${i < lv ? ' ✓' : ''}</u>${esc(effTxt(e))}</div>`).join('');
      return `<div class="mt-card mt-sk"><div class="mt-skn"><div class="mt-ic">${T.ic}</div><div>${esc(T.nm())}</div></div><div class="mt-tiers">${tiers}</div><button class="mt-btn${mx ? ' done' : SAVE.gold < c ? ' poor' : ''}" data-a="skill" data-v="${k}"${mx ? ' disabled' : ''}>${mx ? tt('max') : '🪙 ' + c}</button></div>`; }).join('');
    return seg + rows;
  },
  equip() {
    return `<div class="mt-eq">${SLOTS.map(s => { const items = Object.keys(ITEMS).filter(id => ITEMS[id].s === s);
      return `<div class="mt-slot"><h4>${ICON[s]}${esc(tt('sl_' + s))}</h4>${items.map((id, i) => { const it = ITEMS[id], have = D.items[id], on = M.eq[s] === id;
        return `<button class="mt-item r${i + 1}${on ? ' sel' : ''}${have ? '' : ' lk'}" data-a="equip" data-v="${id}"><b>${esc(tt('i_' + id))}${have && !M.seen[id] ? `<span class="mt-new">${tt('isnew')}</span>` : ''}</b><small>${it.b.map(bonusTxt).map(esc).join('<br>')}</small><em>${have ? (on ? '✓ ' + esc(tt('chosen')) : esc(tt('choose'))) : '🔒 ' + esc(srcTxt(it))}</em></button>`; }).join('')}</div>`; }).join('')}</div>`;
  },
  maids() {
    const cards = Object.keys(MAIDS).map(id => { const m = MAIDS[id], have = D.maids[id], on = M.team.includes(id), u = m.u;
      const lock = u.m ? tt('src_mis', { m: misName(u.m) }) : u.s ? tt('src_star', { n: u.s }) : '';
      const av = m.img ? `<div class="mt-av" style="background-image:url(./assets/img/${m.img}.jpg)"></div>` : `<div class="mt-av" style="background:${m.c}">${esc(mname(id)[0])}</div>`;
      return `<button class="mt-maid${on ? ' sel' : ''}${have ? '' : ' lk'}" data-a="maid" data-v="${id}">${av}<div class="mt-g"><b>${esc(mname(id))}${have && !M.seen[id] ? `<span class="mt-new">${tt('isnew')}</span>` : ''}</b><small>${have ? esc(bonusTxt(m.p)) : '🔒 ' + esc(lock)}</small></div></button>`; }).join('');
    return `<h4 class="mt-h">${esc(tt('team', { a: M.team.length, b: TEAM }))}<small>${esc(tt('teamhint'))}</small></h4><div class="mt-md">${cards}</div>`;
  },
  quests() {
    const q = M.q, row = (txt, cur, tgt, coins, act, v, done) => { const ok = cur >= tgt; return `<div class="mt-q${done ? ' cl' : ''}"><div>${esc(txt)}<span class="mt-bar${ok ? ' ok' : ''}"><i style="width:${clamp(cur / tgt * 100, 0, 100)}%"></i></span></div><div class="mt-rw"><small>${Math.min(cur, tgt)}/${tgt}</small> · 🪙 ${coins}</div><button class="mt-btn${done ? ' done' : ok ? ' go' : ' done'}" data-a="${act}" data-v="${v}"${done || !ok ? ' disabled' : ''}>${done ? '✓ ' + esc(tt('claimed')) : esc(tt('claim'))}</button></div>`; };
    let dn = 0; const dl = q.dl.map(id => { const f = qdef(DQ, id); if (!f) return ''; const cur = q.dc[f[1]] || 0; if (cur >= f[2]) dn++; return row(tt('q_' + f[1], { n: f[2] }), cur, f[2], f[3], 'qd', id, !!q.dd[id]); }).join('') + row(tt('dall'), dn, 3, DALL, 'qall', '1', !!q.dall);
    const wl = q.wl.map(id => { const f = qdef(WQ, id); if (!f) return ''; return row(tt('q_' + f[1], { n: f[2] }), q.wc[f[1]] || 0, f[2], f[3], 'qw', id, !!q.wd[id]); }).join('');
    const al = ACH.slice().sort((a, b) => (M.ach[a[0]] ? 1 : 0) - (M.ach[b[0]] ? 1 : 0)).map(a => row(tt(ACH_TXT[a[1]], { n: a[2] }), achVal(a[1]), a[2], a[3], 'ach', a[0], !!M.ach[a[0]])).join('');
    const ch = CHESTS.map(c => { const cl = M.chest[c[0]], go = !cl && D.stars >= c[0]; return `<button class="mt-ch${cl ? ' cl' : go ? ' go' : ''}" data-a="chest" data-v="${c[0]}"><b>${cl ? '📭' : '🎁'}</b>★ ${c[0]}</button>`; }).join('');
    let gift = ''; try { const dg = JSON.parse(lsg('qq_daily', '{}')); if (dg && dg.s) gift = `<div class="mt-note">🎁 ${esc(tt('giftday', { n: dg.s }))}</div>`; } catch (e) { }
    return `<div class="mt-cols"><div><div class="mt-card"><h4 class="mt-h">${esc(tt('daily'))}<small>${esc(tt('dnote'))}</small></h4>${dl}${gift}</div><div class="mt-card" style="margin-top:8px"><h4 class="mt-h">${esc(tt('weekly'))}<small>${esc(tt('wnote'))}</small></h4>${wl}</div></div>
      <div><div class="mt-card"><h4 class="mt-h">${esc(tt('chests'))}<small>★ ${D.stars}/${MLIST.length * 3}</small></h4><div class="mt-chs">${ch}</div></div><div class="mt-card" style="margin-top:8px"><h4 class="mt-h">${esc(tt('ach'))}<small>${ACH.filter(a => M.ach[a[0]]).length}/${ACH.length}</small></h4>${al}</div></div></div>`;
  },
  book() {
    const mx = clamp(+lsg('qq_ch', 0) || 0, 0, 7), has = !!lsg('qq_prog', null) || D.stars > 0; if (!has) return `<div class="mt-card mt-note">${esc(tt('bookempty'))}</div>`;
    bookI = clamp(bookI, 0, mx); const nm = i => i === 0 ? t('ch0') : t('ch' + i) + ' — ' + t('ch' + i + 'n');
    let l = ''; for (let i = 0; i <= 7; i++) l += `<button class="${i === bookI ? 'sel' : ''}" data-a="book" data-v="${i}"${i > mx ? ' disabled' : ''}>${i > mx ? '🔒 ' : ''}${esc(nm(i))}</button>`;
    const txt = t('lore' + bookI); return `<div class="mt-book"><div class="mt-bl">${l}</div><div class="mt-card"><h3>${esc(nm(bookI))}</h3><p>${esc(txt === 'lore' + bookI ? '' : txt)}</p></div></div>`;
  },
};
function spend(c) { if (SAVE.gold < c) { toast(tt('nogold')); return false; } SAVE.gold -= c; saveGame(); hudGold(); goldSeen = SAVE.gold; return true; }
function onClick(e) {
  const el = e.target.closest('[data-a]'); if (!el || el.disabled) return; const a = el.dataset.a, v = el.dataset.v, q = M.q;
  if (a === 'close') return closeCamp();
  if (a === 'tab') { tab = v; campEl.querySelector('.mt-pane').scrollTop = 0; }
  else if (a === 'skhero') skHero = v;
  else if (a === 'book') bookI = +v;
  else if (a === 'train') { const U = UPG[v], lv = SAVE.up[v] | 0; if (!U || lv >= U.max || !spend(U.cost(lv))) return; SAVE.up[v] = lv + 1; saveGame(); sfx('power'); }
  else if (a === 'skill') { const lv = tier(v); if (!TRACKS[v] || lv >= 3 || !spend(COST[lv])) return; M.sk[v] = lv + 1; save(); applyCd(); sfx('power'); }
  else if (a === 'eqcyc') { const own = Object.keys(ITEMS).filter(id => ITEMS[id].s === v && D.items[id]); if (own.length < 2) return; const i = own.indexOf(M.eq[v]); M.eq[v] = own[(i + 1) % own.length]; M.seen[M.eq[v]] = 1; save(); sfx('pick'); }
  else if (a === 'equip') { const it = ITEMS[v]; if (!it || !D.items[v]) return; M.seen[v] = 1; if (M.eq[it.s] === v) delete M.eq[it.s]; else M.eq[it.s] = v; save(); sfx('pick'); }
  else if (a === 'maid') { if (!D.maids[v]) return; M.seen[v] = 1; const i = M.team.indexOf(v); if (i >= 0) M.team.splice(i, 1); else if (M.team.length >= TEAM) { toast(tt('teamfull')); save(); render(); return; } else M.team.push(v); save(); sfx('pick'); }
  else if (a === 'qd') { const f = qdef(DQ, v); if (!f || q.dd[v] || (q.dc[f[1]] || 0) < f[2]) return; q.dd[v] = 1; save(); grant(f[3]); sfx('pick'); }
  else if (a === 'qall') { if (q.dall || q.dl.filter(id => { const f = qdef(DQ, id); return f && (q.dc[f[1]] || 0) >= f[2]; }).length < 3) return; q.dall = 1; save(); grant(DALL); sfx('power'); }
  else if (a === 'qw') { const f = qdef(WQ, v); if (!f || q.wd[v] || (q.wc[f[1]] || 0) < f[2]) return; q.wd[v] = 1; save(); grant(f[3]); sfx('power'); }
  else if (a === 'ach') { const f = ACH.find(x => x[0] === v); if (!f || M.ach[v] || achVal(f[1]) < f[2]) return; M.ach[v] = 1; save(); grant(f[3]); sfx('power'); }
  else if (a === 'chest') { claimChest(+v); return; }
  render();
}
function claimChest(n) {
  refresh(); const c = CHESTS.find(x => x[0] === n); if (!c || M.chest[n] || D.stars < n) return false; M.chest[n] = 1; save(); refresh(); grant(c[1]); if (c[2]) toast('🎁 ' + tt('newitem', { x: tt('i_' + c[2]) })); sfx('power');
  if (campEl && campEl.classList.contains('open')) render(); mapBits(); labels(); return true;
}
// wave4: the ONE upgrade screen — host & arms (sword, bow, armour, shields, archers with chapter caps) is a Camp tab; wave4.js supplies the pane, the old Shop and the separate overlay open this tab
S.t_army = ["Qo'shin va qurol", 'Safımız hám qural', 'Войско и оружие', 'Host & arms']; const trainRows = () => TRAIN_ALL.map(([k]) => { const lv = SAVE.up[k] | 0, U = UPG[k]; if (!U) return ''; const c = U.cost(lv), mx = lv >= U.max; return `<div class="mt-row"><div class="mt-g">${esc(t('u_' + k))} <span class="mt-pips">${'●'.repeat(lv)}${'○'.repeat(Math.max(0, U.max - lv))}</span><small>${esc(t('u_' + k + 'd'))}</small></div><button class="mt-btn${mx ? ' done' : SAVE.gold < c ? ' poor' : ''}" data-a="train" data-v="${k}"${mx ? ' disabled' : ''}>${mx ? tt('max') : '🪙 ' + c}</button></div>`; }).join('');
PANE.army = () => { try { return ((window.__W4 && window.__W4.paneHTML) ? window.__W4.paneHTML() : '') + '<div class="w4train">' + trainRows() + '</div>'; } catch (e) { return ''; } };
export function openCamp(tb, from) { build(); tb = TAB_ALIAS[tb] || tb; if (tb && PANE[tb] && TABS.some(x => x[0] === tb)) tab = tb; if (!TABS.some(x => x[0] === tab)) tab = 'hero'; campFrom = from || ''; render(); campEl.classList.add('open'); }
function closeCamp() { if (!campEl) return; campEl.classList.remove('open'); if (dirty) save(); labels(); mapBits(); try { hudGold(); } catch (e) { } }
function toast(s) { const c = $('mt-toasts'); if (!c) return; const el = document.createElement('div'); el.className = 'mt-toast'; el.textContent = s; c.appendChild(el); while (c.children.length > 4) c.firstChild.remove(); setTimeout(() => el.remove(), 2900); }
function lvBanner(l, coins) { const el = $('mt-lvup'); if (!el) return; el.querySelector('span').textContent = tt('lvup'); el.querySelector('b').textContent = l; el.querySelector('small').textContent = tt('b_hp', { n: '1,5' }) + ' · ' + tt('b_dmg', { n: 1 }) + ' · +' + coins + ' 🪙'; el.classList.remove('open'); void el.offsetWidth; el.classList.add('open'); setTimeout(() => el.classList.remove('open'), 2500); }
function hudXp(pop) { const el = $('mt-xp'); if (!el) return; const L = lvInfo(M.xp); el.querySelector('b').textContent = L.lv; el.querySelector('i').style.width = (L.need ? L.cur / L.need * 100 : 100) + '%'; if (pop) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); } }
// end screen row: XP earned, new unlocks, Camp shortcut
function endRow(r) {
  const box = document.querySelector('#end .in'); if (!box) return; let el = $('mt-end'); if (!el) { el = document.createElement('div'); el.id = 'mt-end'; el.className = 'mt'; const ref = $('eadx2'); if (ref && ref.parentNode === box) box.insertBefore(el, ref); else box.appendChild(el); el.addEventListener('click', e => { if (e.target.closest('.mt-endbtn')) openCamp(weakList().some(w => w.can) ? 'hero' : claimables().quests ? 'quests' : 'hero', 'end'); }); }
  const L = lvInfo(M.xp); el.innerHTML = (r ? `<span class="mt-x">✦ ${esc(tt('xpn', { n: r.xp }))}</span>` : '') + `<span>${esc(tt('lv', { n: L.lv }))}${r && r.lvUp ? ' ▲' : ''}</span><button class="mt-endbtn"></button>` + (r && r.got.length ? `<span class="mt-got">🎁 ${r.got.map(esc).join(' · ')}</span>` : ''); labels();
}
// ui4: end screen layout hook — called from missions.js win() after it filled the buttons. o = {id, next, chEnd, gold}
export function endUI(o) {
  try { const ad = $('eadx2'); if (ad && o && o.gold > 0) ad.textContent = tt('ad_s', { n: o.gold });
    const em = $('emap'); if (em) em.style.display = o && o.chEnd ? 'none' : ''; const en = $('end'); if (en) en.classList.toggle('chend', !!(o && o.chEnd)); } catch (e) { }
}
// map: Camp button in the header + star-chest strip
function mapBits() {
  const map = $('map'); if (!map) return; const mh = map.querySelector('.mh'), pm = map.querySelector('.pm') || map; if (!campEl) build();
  if (mh && !mh.querySelector('.mt-mapbtn')) { const b = document.createElement('button'); b.className = 'mt-mapbtn'; b.onclick = e => { e.stopPropagation(); openCamp(null, 'map'); }; const tot = mh.querySelector('.tot'); if (tot) mh.insertBefore(b, tot); else mh.appendChild(b); }
  let bar = $('mt-chestbar'); if (!bar) { bar = document.createElement('div'); bar.id = 'mt-chestbar'; bar.className = 'mt'; pm.appendChild(bar); bar.addEventListener('pointerdown', e => e.stopPropagation()); bar.addEventListener('click', e => { const b = e.target.closest('.mt-cb'); if (b) claimChest(+b.dataset.v); }); }
  refresh(); const open = CHESTS.filter(c => !M.chest[c[0]]), show = open.slice(0, Math.max(3, open.filter(c => D.stars >= c[0]).length + 1));   // compact: only the unclaimed ones that matter now (claimable + the next goal), so the strip does not hide map labels
  bar.style.display = show.length ? '' : 'none';
  bar.innerHTML = `<span class="mt-cst">★ ${D.stars}</span>` + show.map(c => { const go = D.stars >= c[0]; return `<button class="mt-cb${go ? ' go' : ''}" data-v="${c[0]}"><b>🎁</b>${c[0]}</button>`; }).join('') + (open.length > show.length ? `<span class="mt-cmore">+${open.length - show.length}</span>` : ''); labels();
}

// ---------------------------------------------------------------- loop + boot
let mapOn = false;
function frame(now) {
  requestAnimationFrame(frame);
  try { combatTick(now); } catch (e) { if (!frame.err) { frame.err = 1; console.warn('meta tick', e); } }
  if (lang !== curLang) { curLang = lang; labels(); if (campEl && campEl.classList.contains('open')) render(); }
  const mo = !!($('map') && $('map').classList.contains('on')); if (mo && !mapOn) mapBits(); mapOn = mo;
}
build(); ensureQuests(); requestAnimationFrame(frame);
// 7-4 ends in the epilogue (no end screen): poll the star save as a fallback when the missions hook is absent
setInterval(() => { if (!M.fin && !ST.pend) { const SM = starMap(); if ('7-4' in SM) { M.fin = 1; dirty = true; if (G.mis && G.mis.id === '7-4' && !G.mis._mtDone) { ST.pend = { id: '7-4', k: +SM['7-4'] || 1 }; finalize(); } } } }, 3000);

window.__META = {
  ver: VER, chestNext: () => { try { refresh(); const ch = CHESTS.find(c => D.stars < c[0]); return ch ? ch[0] - D.stars : 0; } catch (e) { return 0; } }, mul, add, pdMul, native: k => { NATIVE[k] = 1; }, isNative: k => !!NATIVE[k],  missionEnd, openCamp, closeCamp, claimChest, endUI, tt,
  state: M, derived: D, bonus: B, level: () => lvInfo(M.xp), addXp, refresh: () => { refresh(); applyCd(); if (campEl && campEl.classList.contains('open')) render(); labels(); },
  tracks: TRACKS, items: ITEMS, maids: MAIDS, strings: S, save,
  // test helpers
  _grant: grant, _bump: bump, _reset: () => { try { localStorage.removeItem(KEY); } catch (e) { } },
};
