// Qirq qiz — WAVE 4 (js/wave4.js). Self-contained module: own CSS/DOM, save in localStorage "qq_w4".
// A) 3-button controls: ⚔ ATTACK (auto target: sword combo near, bow volley far, hold = spinning strike, auto lock on captains/bosses),
//    ➤ DODGE (dodge/roll; pressed during an enemy wind-up = parry + counter strike), 🔺 AMULET (one button, the game picks the power).
// B) army: rescued warriors (batırs) join for good, fallen ones are lost; enemy power grows per chapter (hp/dmg curve, captains' poise).
// C) upgrades (sword, bow, maidens' armour, warriors' shields, archer maidens) with a level cap per chapter (ch1 3, ch2 5, ch3 7 …).
// D) enemy camps on the world map (missions "c-C1".. are added in missions 66_w4camps.js; this file draws them on the map).
import { G, $, T, A, THREE, SAVE, SET, renderer, saveGame, hudGold, spawn, num, ringFx, burst, sparks, flash, shoot, addGold, hitCircle, telegraph, toggleMount, hintRaw, world, doAct, AMU_SVG, refreshSkills } from './engine.js?v=1795239978';
import { t, lang, L } from './i18n.js?v=1795239978';
import { Sfx } from './audio.js?v=1795239978';
import { MLIST } from './missions.js?v=1795239978';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), hyp = Math.hypot, rnd = (a, b) => a + Math.random() * (b - a);
// ---------------------------------------------------------------- texts [qq, uz, ru, en] (injected into i18n so missions can use t('w4_…'))
const TX = {
  w4_army: ['Safımız: {q} qız + {b} batır', 'Safimiz: {q} qiz + {b} botir', 'Наше войско: {q} девушек + {b} батыров', 'Our host: {q} maidens + {b} warriors'],
  w4_foe: ['Dushpan: ~{n}', 'Dushman: ~{n}', 'Враг: ~{n}', 'Enemy: ~{n}'],
  w4_join: ['+{n} batır safımızǵa qosıldı!', '+{n} botir safimizga qo\'shildi!', '+{n} батыров вступили в войско!', '+{n} warriors joined our host!'],
  w4_lost: ['Urısta qurban bolǵan batırlar: {n}', 'Jangda halok bo\'lgan botirlar: {n}', 'Павшие в бою батыры: {n}', 'Warriors fallen in battle: {n}'],
  w4_bat: ['Batır', 'Botir', 'Батыр', 'Warrior'],
  w4_arc: ['Mergen qız', 'Mergan qiz', 'Лучница', 'Archer maiden'],
  w4_manj: ['Manjanıq arba', 'Manjaniq arava', 'Катапульта', 'Catapult cart'],
  w4_up: ['⚒ Safımız hám qural', '⚒ Qo\'shin va qurol', '⚒ Войско и оружие', '⚒ Host & arms'],
  w4_upT: ['Safımız hám qural', 'Qo\'shin va qurol', 'Войско и оружие', 'Host & arms'],
  w4_sword: ['Gúlayımnıń qılıshı', 'Guloyimning qilichi', 'Меч Гулаим', 'Gulayim\'s sword'],
  w4_bow: ['Gúlayımnıń sadaǵı', 'Guloyimning kamoni', 'Лук Гулаим', 'Gulayim\'s bow'],
  w4_armor: ['Qızlardıń sawıtı', 'Qizlarning sovuti', 'Доспехи девушек', 'Maidens\' armour'],
  w4_shield: ['Batırlardıń qalqanı', 'Botirlarning qalqoni', 'Щиты батыров', 'Warriors\' shields'],
  w4_archers: ['Mergen qızlar', 'Mergan qizlar', 'Лучницы', 'Archer maidens'],
  w4_e_sword: ['Qılısh soqqısı +{n}%', 'Qilich zarbasi +{n}%', 'Удар мечом +{n}%', 'Sword damage +{n}%'],
  w4_e_bow: ['Bir atıwda {a} oq, kúshi +{n}%', 'Bir otishda {a} o\'q, kuchi +{n}%', '{a} стрелы за выстрел, сила +{n}%', '{a} arrows per volley, damage +{n}%'],
  w4_e_armor: ['Qızlardıń janı +{n}%', 'Qizlarning joni +{n}%', 'Здоровье девушек +{n}%', 'Maidens\' health +{n}%'],
  w4_e_shield: ['Batırlardıń janı +{n}%, qalqan +{b}%', 'Botirlarning joni +{n}%, qalqon +{b}%', 'Здоровье батыров +{n}%, щит +{b}%', 'Warriors\' health +{n}%, block +{b}%'],
  w4_e_arch: ['Urısqa {n} mergen qız shıǵadı', 'Jangga {n} mergan qiz chiqadi', 'В бой выходят лучницы: {n}', '{n} archer maidens join the fight'],
  w4_lv: ['Dáreje {l}/{c}', 'Daraja {l}/{c}', 'Уровень {l}/{c}', 'Level {l}/{c}'],
  w4_cap: ['{ch}: kúsheytiw shegi — {c}-dáreje', '{ch}: kuchaytirish chegarasi — {c}-daraja', '{ch}: предел улучшений — уровень {c}', '{ch}: upgrade limit — level {c}'],
  w4_capN: ['Keyingi shek bul baptıń sońǵı urısında jeńiske erisgende ashıladı', 'Keyingi chegara shu bobning so\'nggi jangida g\'alaba qozonilganda ochiladi', 'Следующий предел откроется после победы в последней битве главы', 'The next limit opens after winning this chapter\'s final battle'],
  w4_buy: ['Kúsheytiw', 'Kuchaytirish', 'Улучшить', 'Upgrade'],
  w4_capped: ['SHEK', 'CHEGARA', 'ПРЕДЕЛ', 'LIMIT'],
  w4_nogold: ['Altın jetpeydi', 'Oltin yetmaydi', 'Не хватает золота', 'Not enough gold'],
  w4_capUp: ['Jeńis! Kúsheytiw shegi endi {c}-dáreje', 'G\'alaba! Kuchaytirish chegarasi endi {c}-daraja', 'Победа! Предел улучшений теперь {c}', 'Victory! The upgrade limit is now level {c}'],
  w4_close: ['◂ Artqa', '◂ Orqaga', '◂ Назад', '◂ Back'],
  w4_amuR: ['Tumar ele tolmadı', 'Tumor hali to\'lmadi', 'Амулет ещё не заряжен', 'The amulet is not charged yet'],
  f3o_7_1: ['Dushpan lagerine shawıp jetiń hám onı talqanlań', 'Dushman qarorgohiga chopib yeting va uni tor-mor qiling', 'Доскачите до вражеского лагеря и разгромите его', 'Ride to the enemy camp and crush it'],
  w4_dismount: ['Atlardan túsiń — lagerge hújim!', 'Otlardan tushing — qarorgohga hujum!', 'Спешиться — в атаку на лагерь!', 'Dismount — attack the camp!'],
  w4_hold_o: ['Diywaldı uslap turıń — xalıq qalaǵa kirip alsın!', 'Devorni ushlab turing — xalq shaharga kirib olsin!', 'Держите стену — пусть люди успеют уйти в город!', 'Hold the wall — let the townsfolk get into the town!'],
  w4_hold_hud: ['Qalaǵa kirgen xalıq: {n}/{m}', 'Shaharga kirgan xalq: {n}/{m}', 'Жителей в городе: {n}/{m}', 'Townsfolk inside: {n}/{m}'],
  w4_hold_lost: ['Dushpan ótip ketti — bir adam qutıla almadı!', 'Dushman o\'tib ketdi — bir kishi qutula olmadi!', 'Враг прорвался — один житель не спасся!', 'A raider broke through — one townsman did not make it!'],
  w4_hold_win: ['Xalıq qalaǵa kirdi. Sarkop dárwazası jabıldı!', 'Xalq shaharga kirdi. Sarkop darvozasi yopildi!', 'Люди в городе. Ворота Саркопа закрыты!', 'The people are inside. The gate of Sarkop is shut!'],
  w4_well: ['Qudıq qasındaǵı qorǵanıs', 'Quduq yonidagi mudofaa', 'Оборона у колодца', 'Defence at the well'],
  w4_well2: ['Dushpan eki tárepten kiyatır — kárwandı qorǵań!', 'Dushman ikki tomondan kelmoqda — karvonni himoya qiling!', 'Враг идёт с двух сторон — защитите караван!', 'The enemy comes from both sides — defend the caravan!'],
  w4_well_w: ['Eki tárepten hújim! {n}/{m}', 'Ikki tomondan hujum! {n}/{m}', 'Атака с двух сторон! {n}/{m}', 'Attack from both sides! {n}/{m}'],
  w4_stag: ['Esenkiredi!', 'Gangidi!', 'Оглушён!', 'Staggered!'],
  w4_finish: ['Sońǵı soqqı — ⚔ basıń!', 'So\'nggi zarba — ⚔ ni bosing!', 'Добивание — жмите ⚔!', 'Finisher — press ⚔!'],
  w4_coin: ['Áyyemgi teńge {n}/{m}', 'Qadimiy tanga {n}/{m}', 'Древняя монета {n}/{m}', 'Ancient coin {n}/{m}'],
  w4_coins: ['Áyyemgi teńgeler: {n}/{m}', 'Qadimiy tangalar: {n}/{m}', 'Древние монеты: {n}/{m}', 'Ancient coins: {n}/{m}'],
  w4_chest: ['Keyingi juldız sandıǵına: ★ {n}', 'Keyingi yulduz sandig\'igacha: ★ {n}', 'До следующего звёздного сундука: ★ {n}', 'Next star chest in: ★ {n}'],
  w_qd: ['Qum sawıtı qılısh soqqısın jutadı. Tumar tolǵanda 🔺 basıń yamasa soqqısınan ➤ penen 3 ret qashıń — sawıtı jarıladı!', 'Qum zirhi qilich zarbasini yutadi. Tumor to\'lganda 🔺 ni bosing yoki zarbasidan ➤ bilan 3 marta qoching — zirhi yoriladi!', 'Песчаная броня глотает удары. Жмите 🔺, когда амулет заряжен, или трижды уйдите ➤ от его удара — броня треснет!', 'The sand armour swallows your blade. Press 🔺 when the amulet is charged, or dodge his strike with ➤ three times — the armour cracks!'],
  w_ja: ['Jalladtıń shınjırları ápiwayı soqqını qaytaradı. Tumar tolǵanda 🔺 basıń yamasa soqqısınan ➤ penen 3 ret qashıń — ol esenkireydi!', 'Jallodning zanjirlari oddiy zarbani qaytaradi. Tumor to\'lganda 🔺 ni bosing yoki zarbasidan ➤ bilan 3 marta qoching — u gangiydi!', 'Цепи отражают удары. Жмите 🔺, когда амулет заряжен, или трижды уйдите ➤ от его удара — он будет оглушён!', 'The chains deflect blows. Press 🔺 when the amulet is charged, or dodge his strike with ➤ three times — he is stunned!'],
  w_ay: ['Aydarha suw ishinde jeńilmeydi. Tumar tolǵanda 🔺 basıń — Shınjır onı jaǵaǵa tartıp shıǵaradı!', 'Aydarho suv ichida yengilmas. Tumor to\'lganda 🔺 ni bosing — Zanjir uni qirg\'oqqa tortib chiqaradi!', 'В воде Айдарха неуязвим. Жмите 🔺, когда амулет заряжен, — Цепь вытащит его на берег!', 'Aydarho is invulnerable in the water. Press 🔺 when the amulet is charged — the Chain drags it ashore!'],
  w_qu: ['Qunqardıń otlı denesi qılıshtı ótpes etedi. Tumar tolǵanda 🔺 basıń yamasa soqqısınan ➤ penen 3 ret qashıń — sonda hújim etiń!', 'Qunqarning olovli tanasi qilichni o\'tmas qiladi. Tumor to\'lganda 🔺 ni bosing yoki zarbasidan ➤ bilan 3 marta qoching — shunda hujum qiling!', 'Огонь Кункара тупит меч. Жмите 🔺, когда амулет заряжен, или трижды уйдите ➤ от его удара — и бейте!', 'Qunqar\'s fire dulls your blade. Press 🔺 when the amulet is charged, or dodge his strike with ➤ three times — then strike!'],
  w_qg: ['Qarǵashıq altı arshın dáw — ápiwayı soqqı oǵan shıbın shaqqanday. Tumar tolǵanda 🔺 basıń yamasa soqqısınan ➤ penen 3 ret qashıń!', 'Qarg\'ashiq olti arshinli dev — oddiy zarba unga chivin chaqqandek. Tumor to\'lganda 🔺 ni bosing yoki zarbasidan ➤ bilan 3 marta qoching!', 'Каргашык — великан в шесть аршин. Жмите 🔺, когда амулет заряжен, или трижды уйдите ➤ от его удара!', 'Qargashiq is a six-arshin giant. Press 🔺 when the amulet is charged, or dodge his strike with ➤ three times!'],
  o_helm: ['Altın dubılǵanı shınjır menen julıp alıń — Surtaysha qasında ⚔ basıń', 'Tilla dubulg\'ani zanjir bilan yulib oling — Surtaysha yonida ⚔ ni bosing', 'Сорвите золотой шлем цепью — жмите ⚔ рядом с Суртайшой', 'Tear off the golden helmet with the chain — press ⚔ near Surtaysha'],
  o_totem: ['Qanlı totemlerdi buzıń — totem qasında ⚔ basıń', 'Qonli totemlarni buzing — totem yonida ⚔ ni bosing', 'Разбейте кровавые тотемы — жмите ⚔ у тотема', 'Smash the blood totems — press ⚔ next to a totem'],
  v3h_phal: ['Nayzagerlerdi aldınan buzıp bolmaydı — qaptalınan urıń yamasa ⚔ basıp turıp aylanıp soǵıń', 'Nayzachilarni old tomondan yorib bo\'lmaydi — yonidan uring yoki ⚔ ni bosib turib aylanib uring', 'Копейщиков не пробить в лоб — бейте с фланга или держите ⚔ для удара с разворота', 'Spearmen can\'t be broken from the front — strike their flank or hold ⚔ for the spinning strike'],
  n_bash: ['Qalqan soqqısı', 'Qalqon zarbasi', 'Удар щитом', 'Shield Bash'],
  n_cry: ['Uran', 'Jang chaqirig\'i', 'Боевой клич', 'War Cry'],
  n_thrust: ['Nayza soqqısı', 'Nayza zarbasi', 'Удар копьём', 'Spear Thrust'],
  n_sweep: ['Nayza aylanbası', 'Nayza aylanmasi', 'Круговой удар', 'Spear Sweep'],
  n_javelin: ['Nayza ılaqtırıw', 'Nayza otish', 'Бросок копья', 'Javelin'],
  n_cleave: ['Awır soqqı', 'Og\'ir zarba', 'Тяжёлый удар', 'Heavy Cleave'],
  w4_power: ['Usınıs etilgen kúsh: {s}', 'Tavsiya etilgan kuch: {s}', 'Рекомендуемая сила: {s}', 'Recommended power: {s}'],
  w4_pw_ok: ['jetkilikli', 'yetarli', 'достаточно', 'enough'],
  w4_pw_mid: ['shegarada', 'chegarada', 'на грани', 'borderline'],
  w4_pw_low: ['kúsheytiń!', 'kuchaytiring!', 'усильтесь!', 'upgrade!'],
  w4_canup: ['Kúsheytiw múmkin!', 'Kuchaytirish mumkin!', 'Можно усилиться!', 'Upgrade available!'],
  w4_e_hero: ['Gúlayımǵa zıyan −{n}%', 'Guloyimga zarar −{n}%', 'Урон по Гулаим −{n}%', 'Damage to Gulayim −{n}%'],
  w4_ms1: ['Gúlayım! Men Sarkoptan shabarmanman… Qıran tawına toqtamay shawıp keldim. Tań sáhárde Surtaysha qırq mıń láshker menen Sarkopqa hújim etti!', 'Guloyim! Men Sarkopdan choparman… Qiron tog\'iga to\'xtamay chopib keldim. Tong saharda Surtaysha qirq ming lashkar bilan Sarkopga hujum qildi!', 'Гулаим! Я гонец из Саркопа… Скакал к горе Кыран без остановки. На рассвете Суртайша с сорокатысячным войском напал на Саркоп!', 'Gulayim! I am a messenger from Sarkop… I rode to Mount Qiran without a halt. At dawn Surtaysha attacked Sarkop with forty thousand warriors!'],
  w4_ms_gu1: ['Ákem… Allayar bay qay jerde? Sóyle!', 'Otam… Allayar bay qayerda? Gapir!', 'Отец… где Аллаяр-бай? Говори!', 'My father… where is Allayar Bay? Speak!'],
  w4_ms2: ['Allayar bay altı ulı menen dárwaza aldında turdı. Xalıq qalaǵa kirip alǵansha sheginbedi…', 'Allayar bay olti o\'g\'li bilan darvoza oldida turdi. Xalq shaharga kirib olguncha chekinmadi…', 'Аллаяр-бай с шестью сыновьями встал у ворот. Он не отступил, пока люди не укрылись в городе…', 'Allayar Bay stood at the gate with his six sons. He did not step back until the people were inside…'],
  w4_ms3: ['Keyin Surtayshanıń ózi shıqtı. Men kórgenimdi aytıp bereyin…', 'Keyin Surtayshaning o\'zi chiqdi. Ko\'rganimni aytib beray…', 'Потом вышел сам Суртайша. Я расскажу, что видел…', 'Then Surtaysha himself came forth. Let me tell you what I saw…'],
  w4_ms_gu2: ['Qızlar, atlarǵa minińler! Sarkopqa!', 'Qizlar, otlarga mining! Sarkopga!', 'Девушки, по коням! В Саркоп!', 'Maidens, mount up! To Sarkop!'],
  w4_tale: ['Shabarmannıń gúrrińi', 'Choparning hikoyasi', 'Рассказ гонца', 'The messenger\'s tale'],
  w4_flash: ['Tań sáhárde Sarkopta…', 'Tong saharda Sarkopda…', 'На рассвете в Саркопе…', 'At dawn in Sarkop…'],
  w4_play_al: ['Allayar bay bolıp oynaysız', 'Allayar bay bo\'lib o\'ynaysiz', 'Вы играете за Аллаяр-бая', 'You play as Allayar Bay'],
  w4_sarkop: ['Sarkop batırları hám Allayardıń altı ulı', 'Sarkop botirlari va Allayarning olti o\'g\'li', 'Воины Саркопа и шестеро сыновей Аллаяра', 'The warriors of Sarkop and Allayar\'s six sons'],
  w4_loading: ['Júklenip atır…', 'Yuklanmoqda…', 'Загрузка…', 'Loading…'],
  w4_n_siege: ['Qashal qamalı', 'Qashal qamali', 'Осада Кашала', 'Siege of Qashal'],
  w4o_siege: ['Qorǵandı qamań: diywaldaǵı sadaqshılardı atıń, dárwaza buzılǵan soń eki noqattı iyeleń', 'Qo\'rg\'onni qamal qiling: devordagi kamonchilarni oting, darvoza buzilgach ikki nuqtani egallang', 'Осадите крепость: сбейте лучников со стены, после пролома ворот захватите две точки', 'Besiege the fortress: shoot the archers off the wall, then take two points once the gate is breached'],
  w4_wave: ['Tolqın {n}/{m}', 'To\'lqin {n}/{m}', 'Волна {n}/{m}', 'Wave {n}/{m}'],
  w4_sg_left: ['Dushpan: {n}', 'Dushman: {n}', 'Врагов: {n}', 'Enemies: {n}'],
  w4_sg_hud1: ['Diywaldaǵı sadaqshılar: {n}', 'Devordagi kamonchilar: {n}', 'Лучники на стене: {n}', 'Archers on the wall: {n}'],
  w4_sg_cat: ['Manjanıqlarımız diywaldı urıp atır! Qorǵannan shıqqan dushpandı jeńiń', 'Manjaniqlarimiz devorni urmoqda! Qo\'rg\'ondan chiqqan dushmanni yenging', 'Наши катапульты бьют по стене! Разбейте вышедший из крепости отряд', 'Our catapults are pounding the wall! Defeat the sortie from the fortress'],
  w4_sg_arch: ['Diywaldaǵı sadaqshılardı ⚔ penen atıń — alıstan Gúlayım sadaqtan atadı', 'Devordagi kamonchilarni ⚔ bilan oting — uzoqdan Guloyim kamondan otadi', 'Сбейте лучников со стены ⚔ — издали Гулаим стреляет из лука', 'Shoot the archers off the wall with ⚔ — from afar Gulayim uses her bow'],
  w4_sg_gate: ['Manjanıqlar dárwazanı urıp atır!', 'Manjaniqlar darvozani urmoqda!', 'Катапульты бьют по воротам!', 'The catapults are hitting the gate!'],
  w4_sg_breach: ['Dárwaza buzıldı! Alǵa!', 'Darvoza buzildi! Olg\'a!', 'Ворота пробиты! Вперёд!', 'The gate is breached! Forward!'],
  w4_sg_pts: ['Noqatlardı iyeleń — júzbasılardı jeńiń ({n}/{m})', 'Nuqtalarni egallang — yuzboshilarni yenging ({n}/{m})', 'Захватите точки — победите сотников ({n}/{m})', 'Capture the points — defeat the captains ({n}/{m})'],
  w4_sg_pt: ['Noqat iyelendi: {n}/{m}', 'Nuqta egallandi: {n}/{m}', 'Точка захвачена: {n}/{m}', 'Point captured: {n}/{m}'],
  w4_qbek: ['Qorǵan begi', 'Qo\'rg\'on begi', 'Бек крепости', 'Lord of the fortress'],
  w4_qbek_t: ['Qashal qorǵanınıń basshısı', 'Qashal qo\'rg\'onining boshlig\'i', 'Начальник крепости Кашал', 'Commander of Qashal fortress'],
  w4_sg_win: ['Qashal qorǵanı alındı!', 'Qashal qo\'rg\'oni olindi!', 'Крепость Кашал взята!', 'Qashal fortress is taken!'],
  w4_n_yurt: ['Dushpan lageri', 'Dushman qarorgohi', 'Вражеский лагерь', 'Enemy camp'],
  w4_n_tower: ['Qarawıl minarası', 'Qorovul minorasi', 'Сторожевая башня', 'Watchtower'],
  w4_n_ford: ['Dárya ótkeli', 'Daryo kechuvi', 'Речной брод', 'River ford'],
  w4o_camp: ['Lagerdiń áskerlerin hám olardıń júzbasısın jeńiń', 'Qarorgoh askarlarini va ularning yuzboshisini yenging', 'Разбейте воинов лагеря и их сотника', 'Defeat the camp\'s soldiers and their captain'],
  w4_hud_camp: ['Dushpan: {n}/{m}', 'Dushman: {n}/{m}', 'Враг: {n}/{m}', 'Enemy: {n}/{m}'],
  w4_camp_win: ['Lager tazalandı!', 'Qarorgoh tozalandi!', 'Лагерь очищен!', 'Camp cleared!'],
  w4_camp_out: ['Shatırlardan jańa áskerler shıqtı!', 'Chodirlardan yangi askarlar chiqdi!', 'Из шатров выходят новые воины!', 'More soldiers pour out of the tents!'],
  w4_camps_first: ['Áwele joldaǵı lagerlerdi tazalań', 'Avval yo\'ldagi qarorgohlarni tozalang', 'Сначала очистите лагеря на пути', 'Clear the camps on the road first'],
  w4_soldiers: ['{n} ásker', '{n} askar', '{n} воинов', '{n} soldiers'],
  w4_cav: ['Atlı áskerler', 'Otliq askarlar', 'Конница', 'Cavalry'],
  // tutorial (0-0): the 3-button scheme
  tu4_atk: ['⚔ HÚJIM túymesin basıń — bir siltew qasıńdaǵı bir neshe quwırshaqqa tiyedi (3 soqqı)', '⚔ HUJUM tugmasini bosing — bir siltash yoningdagi bir nechta qo\'g\'irchoqqa tegadi (3 zarba)', 'Нажимайте ⚔ АТАКА — один взмах задевает несколько чучел рядом (3 удара)', 'Press ⚔ ATTACK — one swing hits several dummies next to you (3 hits)'],
  tu4_spin: ['Qalqanlı quwırshaq: ⚔ túymesin BASIP TURIŃ — aylanıp kúshli soqqı beresiz', 'Qalqonli qo\'g\'irchoq: ⚔ ni BOSIB TURING — aylanib kuchli zarba berasiz', 'Чучело со щитом: ДЕРЖИТЕ ⚔ — сильный удар с разворота', 'Shield dummy: HOLD ⚔ — a strong spinning strike'],
  tu4_dodge: ['Jerdegi qızıl sheńberden qashıń: ➤ túymesin basıń (2 ret)', 'Yerdagi qizil doiradan qoching: ➤ ni bosing (2 marta)', 'Уходите из красного круга на земле: жмите ➤ (2 раза)', 'Get out of the red circle on the ground: press ➤ (2 times)'],
  tu4_parry: ['{n} qılısh kótergende ➤ túymesin basıń — soqqını qaytarıp, óziń soǵasań (2 ret)', '{n} qilich ko\'targanda ➤ ni bosing — zarbani qaytarib, o\'zing urasan (2 marta)', 'Когда {n} замахнётся — жмите ➤: парирование и ответный удар (2 раза)', 'When {n} winds up — press ➤: parry and counter-strike (2 times)'],
  tu4_bow: ['Nıshanalar alısta — ⚔ túymesin basıń: sadaqtan bir neshe oq atıladı', 'Nishonlar uzoqda — ⚔ ni bosing: kamondan bir nechta o\'q otiladi', 'Мишени далеко — жмите ⚔: из лука летит залп стрел', 'The targets are far — press ⚔: a volley of arrows flies from the bow'],
  tu4_amu: ['Tumar tolıp jarqıradı — 🔺 TUMAR túymesin basıń!', 'Tumor to\'lib yarqiradi — 🔺 TUMOR tugmasini bosing!', 'Амулет заряжен и сияет — жмите 🔺 АМУЛЕТ!', 'The amulet is charged and glowing — press 🔺 AMULET!'],
  tu4_p_amu: ['Kórdiń be? Tumar ózi kerekli kúshti tańlaydı!', 'Ko\'rdingmi? Tumor o\'zi kerakli kuchni tanlaydi!', 'Видела? Амулет сам выбирает нужную силу!', 'See? The amulet picks the right power by itself!'],
  tu4_p_bow: ['Alıstaǵı nıshanaǵa da tiydi!', 'Uzoqdagi nishonga ham tegdi!', 'Даже дальние мишени поражены!', 'Even the far targets are hit!'],
  tu4_p_dodge: ['Sheńberden shıqtıń — tas tiymedi!', 'Doiradan chiqding — tosh tegmadi!', 'Ты вышла из круга — камень мимо!', 'You left the circle — the stone missed!'],
  tu4_p_parry: ['Qaytarıp, ózi soqtı! Barekelle!', 'Qaytarib, o\'zi urdi! Barakalla!', 'Отбила и сама ударила! Молодец!', 'Parried and struck back! Well done!'],
  tu4_demo_parry: ['Qara: qılısh kóterilgende ➤ — men qaytarıp, ózim soǵaman', 'Qara: qilich ko\'tarilganda ➤ — men qaytarib, o\'zim uraman', 'Смотри: замах — ➤ — я отбиваю и бью сама', 'Watch: wind-up — ➤ — I parry and strike back'],
  // hints that named removed buttons (1–5, ▼, K) now describe the 3-button scheme
  h_attack: ['⚔ HÚJIM: jaqındaǵı dushpanǵa — qılısh, alıstaǵıǵa — sadaq; BASIP TURSAŃIZ — aylanıp soǵasız', '⚔ HUJUM: yaqindagi dushmanga — qilich, uzoqdagiga — kamon; BOSIB TURSANGIZ — aylanib urasiz', '⚔ АТАКА: вблизи — меч, вдали — лук; ДЕРЖИТЕ — удар с разворота', '⚔ ATTACK: near — sword, far — bow; HOLD — spinning strike'],
  h_attack_al: ['⚔ HÚJIM: jaqındaǵı dushpandı qılısh penen urıń; BASIP TURSAŃIZ — aylanıp soǵasız', '⚔ HUJUM: yaqindagi dushmanni qilich bilan uring; BOSIB TURSANGIZ — aylanib urasiz', '⚔ АТАКА: рубите ближнего врага мечом; ДЕРЖИТЕ — удар с разворота', '⚔ ATTACK: cut down the nearest foe with your sword; HOLD — spinning strike'],   /* 0-1 Allayar: no bow */
  h_dodge: ['Qızıl sheńberden shıǵıń! ➤ — shetke sekiriw; dushpan qılısh kótergende ➤ — soqqını qaytarıw', 'Qizil doiradan chiqing! ➤ — chetga sakrash; dushman qilich ko\'targanda ➤ — zarbani qaytarish', 'Уходите из красного круга! ➤ — отскок; при замахе врага ➤ — парирование', 'Get out of the red circle! ➤ — dodge; when an enemy winds up, ➤ — parry'],
  h_skill: ['Tumar tolǵanda 🔺 basıń — ol jaǵdayǵa qaray kerekli kúshti ózi tańlaydı', 'Tumor to\'lganda 🔺 ni bosing — u vaziyatga qarab kerakli kuchni o\'zi tanlaydi', 'Когда амулет заряжен — жмите 🔺: он сам выберет нужную силу', 'When the amulet is charged, press 🔺 — it picks the right power itself'],
  h_skill5: ['Qasqır shaqqanlıǵı endi tumarda: kúshli dushpan qasıńda bolsa 🔺 basıń', 'Bo\'ri chaqqonligi endi tumorda: kuchli dushman yoningda bo\'lsa 🔺 ni bosing', 'Волчья ловкость теперь в амулете: жмите 🔺 рядом с сильным врагом', 'Wolf agility now lives in the amulet: press 🔺 next to a strong enemy'],
  h_ulti: ['Tumar tolıp jarqıradı! 🔺 basıń — «Qırq qız» shaqırıǵı', 'Tumor to\'lib yarqiradi! 🔺 ni bosing — «Qirq qiz» chaqirig\'i', 'Амулет сияет! Жмите 🔺 — зов «Сорока девушек»', 'The amulet glows! Press 🔺 — the call of the Forty Maidens'],
  o_gap: ['Jardıń shetine barıp alǵa júriń — qasqır bolıp sekirip ótesiz', 'Jarning chetiga borib oldinga yuring — bo\'ri bo\'lib sakrab o\'tasiz', 'Подойдите к краю обрыва и идите вперёд — перепрыгнете волком', 'Walk to the edge of the ravine and keep going — you leap over as a wolf'],
  h_leap: ['Qazıqlı tosıqlardı aylanıp ótiń — dushpandı ⚔ penen jeńiń', 'Qoziqli to\'siqlarni aylanib o\'ting — dushmanni ⚔ bilan yenging', 'Обходите частоколы — врагов бейте ⚔', 'Go around the stake barriers — beat the enemy with ⚔'],
  h_shield: ['Qanlı jamǵır! Tumar tolǵan bolsa 🔺 — Suw qalqanı saqlaydı; bolmasa ➤ menen qashıń', 'Qonli yomg\'ir! Tumor to\'lgan bo\'lsa 🔺 — Suv qalqoni saqlaydi; bo\'lmasa ➤ bilan qoching', 'Кровавый дождь! Амулет заряжен — 🔺, Водный щит защитит; иначе уходите ➤', 'Blood rain! If the amulet is charged press 🔺 — the Water Shield protects; otherwise dodge with ➤'],
  h_gate: ['Dárwazanıń qasında ⚔ basıń — Gúlayım Jer soqqısın ózi qollanadı', 'Darvoza yonida ⚔ ni bosing — Guloyim Yer zarbasini o\'zi qo\'llaydi', 'У ворот жмите ⚔ — Гулаим сама применит Удар земли', 'Next to the gate press ⚔ — Gulayim uses the Earth Slam by herself'],
  h_helm: ['Dubılǵaǵa qılısh ótpeydi. Surtaysha qasıńda ⚔ basıń — Shınjır ózi atıladı; úsh ret tiygizip, dubılǵasın julıp alıń', 'Dubulg\'aga qilich o\'tmaydi. Surtaysha yoningda ⚔ ni bosing — Zanjir o\'zi otiladi; uch marta tegizib, dubulg\'asini yulib oling', 'Меч не берёт шлем. Жмите ⚔ рядом с Суртайшой — Цепь полетит сама; три попадания сорвут шлем', 'The sword cannot pierce the helmet. Press ⚔ near Surtaysha — the Chain flies by itself; three hits tear the helmet off'],
  h_totem: ['Totemler Surtayshaǵa kúsh hám dawa berip atır — totemniń qasında ⚔ basıń: Jer soqqısı olardı qıyratadı', 'Totemlar Surtayshaga kuch va shifo bermoqda — totem yonida ⚔ ni bosing: Yer zarbasi ularni qulatadi', 'Тотемы дают Суртайше силу и лечение — жмите ⚔ у тотема: Удар земли их разрушит', 'The totems feed Surtaysha strength and healing — press ⚔ next to a totem: the Earth Slam smashes it'],
  pw6d: ['Jerge urıp átiraptaǵılardı esenkiretedi (tumar; tas dárwaza hám totem qasında ⚔)', 'Yerga urib atrofdagilarni gangitadi (tumor; tosh darvoza va totem yonida ⚔)', 'Удар о землю оглушает всех вокруг (амулет; у ворот и тотемов — ⚔)', 'Slams the ground, stunning everyone around (amulet; ⚔ at stone gates and totems)'],
  pw7d: ['Dushpandı tartıp aladı (tumar; Surtayshanıń dubılǵasına ⚔)', 'Dushmanni tortib oladi (tumor; Surtayshaning dubulg\'asiga ⚔)', 'Притягивает врага (амулет; по шлему Суртайши — ⚔)', 'Pulls an enemy in (amulet; ⚔ against Surtaysha\'s helmet)'],
  pw8d: ['Qanlı sıyqır hám oqlardan saqlaydı (tumar 🔺)', 'Qonli sehr va o\'qlardan saqlaydi (tumor 🔺)', 'Защищает от кровавой магии и стрел (амулет 🔺)', 'Protects from blood magic and arrows (amulet 🔺)'],
  pw9d: ['Qısqa waqıt dáwge aylanıw (tumar 🔺)', 'Qisqa vaqt devga aylanish (tumor 🔺)', 'Ненадолго превращает в дэва (амулет 🔺)', 'Turns you into a dev for a short time (amulet 🔺)'],
  pw0d: ['Arwaq-attı jiberiw (tumar 🔺)', 'Arvoh-otni yuborish (tumor 🔺)', 'Призывает коня-призрака (амулет 🔺)', 'Sends the ghost horse (amulet 🔺)'],
  tu4_ctl: ['⚔ hújim · ➤ qashıw / qaytarıw · 🔺 tumar', '⚔ hujum · ➤ qochish / qaytarish · 🔺 tumor', '⚔ атака · ➤ уклон / парирование · 🔺 амулет', '⚔ attack · ➤ dodge / parry · 🔺 amulet'],
};
const LI = { qq: 0, uz: 1, ru: 2, en: 3 };
for (const k in TX) for (const lg in LI) { if (!L[lg]) continue; L[lg][k] = TX[k][LI[lg]]; }
const tt = (k, v) => t(k, v);

// ---------------------------------------------------------------- save
const KEY = 'qq_w4';
const fresh = () => ({ v: 1, men: 0, best: {}, up: { sword: 0, bow: 0, armor: 0, shield: 0, arch: 0 }, lostAll: 0, capSeen: 1, bossPaid: {}, coins: {} });
const W = (() => { let s = null; try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { } const f = fresh(); if (!s || typeof s !== 'object') s = f; for (const k in f) if (s[k] === undefined) s[k] = f[k]; for (const k in f.up) if (typeof s.up[k] !== 'number') s.up[k] = 0; return s; })();
function save() { try { localStorage.setItem(KEY, JSON.stringify(W)); } catch (e) { } }
// one upgrade system: the old shop's sword / maidens levels move into the new tracks once (no double bonus)
if (!W.mig) { W.mig = 1; try { if (SAVE.up.sword) { W.up.sword = Math.max(W.up.sword, SAVE.up.sword); SAVE.up.sword = 0; } if (SAVE.up.maid) { W.up.armor = Math.max(W.up.armor, SAVE.up.maid); SAVE.up.maid = 0; } saveGame(); } catch (e) { } save(); }
const stars = () => { try { return JSON.parse(localStorage.getItem('qq_stars') || '{}') || {}; } catch (e) { return {}; } };
const legacyCh = () => { try { return localStorage.getItem('qq_prog') ? (+localStorage.getItem('qq_ch') || 1) : 1; } catch (e) { return 1; } };
// chapter whose cap applies = 1 + chapter bosses beaten in a row
function capCh() { const S = stars(); let c = 1; while (c < 7 && ((c + '-4') in S || legacyCh() > c)) c++; return c; }
const capOf = c => 2 * c + 1;   // ch1 3, ch2 5, ch3 7 … ch7 15
const cap = () => capOf(capCh());
const lvl = k => Math.min(W.up[k] | 0, cap());
// effects
const swordK = () => 1 + .10 * lvl('sword');
const bowK = () => 1 + .12 * lvl('bow');
const arrowsN = () => 3 + (lvl('bow') >= 2 ? 1 : 0);
const armorK = () => 1 + .12 * lvl('armor');
const shieldK = () => 1 + .12 * lvl('shield');
const archN = () => Math.min(5, lvl('arch'));
// expected upgrade level in chapter c = 85 % of its cap: enemies are tuned for it (at the cap she is a bit stronger, far below it the chapter is hard)
const expLv = c => .85 * capOf(Math.max(1, c));
const foeHpK = c => c > 0 ? 1 + .085 * expLv(c) : 1;
const foeDmK = c => c > 0 ? 1 + .05 * expLv(c) : 1;
// under-upgrade penalty (balance pass): the enemy is tuned for ~85 % of the chapter cap; every level the sword + armour average is BELOW that makes him hit 22 % harder (max x2.6) and gives him 10 % more HP.
// ch1 at level 0: dmg x1.56, HP x1.26; ch3 at level 0: dmg x2.3, HP x1.6; at 85-100 % of the cap: no penalty.
// chapter bosses: [HP x, damage x] on top of the chapter curve — fitted with the QA sim bot so that at the cap the fight lasts ~90–150 s and she ends between 30 and 70 % HP (table in wave4_log)
const BOSSHP = 3, DEFD = .35, BOSSK = { qashqir: [5, .95], qumdev: [2.8, .45], jallod: [1.9, .55], aydarho: [2.2, .5], qunqar: [1.35, .7], qargashiq: [2.3, .75] };   /* 2c: at the cap the bot ended 66-76 % HP / 64-73 s in 1-4, 4-4, 5-4, 6-4 -> harder */   // tuned with the QA sim bot (see wave4_log balance table)
const defi = c => c > 0 ? Math.max(0, expLv(c) - (lvl('sword') + lvl('armor')) / 2) : 0;
const COSTB = { sword: 60, bow: 60, armor: 50, shield: 50, arch: 70 };
const cost = (k, l) => Math.round(COSTB[k] * (1 + .6 * (l >= 13 ? l - 7 : l)) / 5) * 5;   // the last chapter has no boss purse before it: its two levels are priced so that chapter 7 pays ~90 % of them (agents/w4/econ.js)

// ---------------------------------------------------------------- unit types: warriors (rescued batırs) and archer maidens
Object.assign(T, {
  w4bat: { ...T.son, like: 'son', mdl: 'son', follow: true, hp: 420, dmg: [11, 16], team: 'ally', name: 'w4_bat', string: 2, block: .25 },
  w4arc: { ...T.qiz, like: 'qiz', mdl: 'qiz', wpn: 'bow', ranged: true, keep: 9, windup: .6, cd: 2.6, dmg: [9, 13], hp: 360, follow: true, team: 'ally', name: 'w4_arc', string: 1, block: 0 },
});

// ---------------------------------------------------------------- helpers
const P = () => G.player;
const C = () => G.w3 || null;
const busy = () => G.paused || G.freeze || G.qte || !!G.flying;
const archOn = () => { const a = $('arch'); return !!(a && a.classList.contains('on')); };
const hostileE = e => !e.dead && !e.gone && !e.bg && e.team !== 'npc' && e.team !== 'ally' && e.team !== undefined ? true : (!e.dead && !e.gone && !e.bg && e.team === 'enemy');
const isFoe = e => !!e && !e.dead && !e.gone && !e.bg && e.team === 'enemy';
const misId = () => (G.mis && G.mis.id) || '';
const chap = () => (G.mis && G.mis.c) || 0;
// segment p->q blocked by a solid box (walls, closed gates)? ravines and switched-off boxes do not block arrows
function losOK(p, q) { for (const b of G.colB || []) { if (!b || b.off || b.ravine) continue; const x1 = b.x1 + .15, x2 = b.x2 - .15, z1 = b.z1 + .15, z2 = b.z2 - .15; if (x2 <= x1 || z2 <= z1) continue;
    if ((p.x > x1 && p.x < x2 && p.z > z1 && p.z < z2) || (q.x > x1 && q.x < x2 && q.z > z1 && q.z < z2)) continue;
    let t0 = 0, t1 = 1; const dx = q.x - p.x, dz = q.z - p.z; let ok = true;
    for (const [d, a, lo, hi] of [[dx, p.x, x1, x2], [dz, p.z, z1, z2]]) { if (Math.abs(d) < 1e-6) { if (a < lo || a > hi) { ok = false; break; } } else { let u = (lo - a) / d, v = (hi - a) / d; if (u > v) [u, v] = [v, u]; t0 = Math.max(t0, u); t1 = Math.min(t1, v); if (t0 > t1) { ok = false; break; } } }
    if (ok) return false; }
  return true; }
function dirOf(p) { const c = C(); const s = c && c.stickDir ? c.stickDir() : null; return s || { x: Math.sin(p.rot), z: Math.cos(p.rot) }; }

// ================================================================ A) CONTROLS
// ---- attack: near = sword combo (engine startAtk via doAct('A')), far = bow volley, hold = spinning strong strike
// QA: can her sword reach him? not across a closed gate, not up on a wall / tower, not through a wall
function unreach(p, e) { return (G.limitZ > -1e8 && e.z < G.limitZ + .3 && p.z > G.limitZ) || (e.y || 0) > 1.6 || !losOK(p, e); }
function rangedTargets(p, n) { const f = dirOf(p), out = [];
  for (const e of G.ents) { if (!isFoe(e)) continue; const dx = e.x - p.x, dz = e.z - p.z, d = hyp(dx, dz); if (d > 30) continue; const ur = unreach(p, e); if (d < (ur ? 1.5 : 6.8)) continue; if ((e.asleep || (e.farT || 0) < -1e8) && !ur && d > 16) continue;   /* sleepers: only the near or unreachable ones (an arrow wakes their post) */ const cs = (dx * f.x + dz * f.z) / (d || 1); if (cs < .34) continue; if (!losOK(p, e) && !((e.y || 0) > 1.6)) continue;
    let s = d - cs * 4 - (e.d.ranged ? 4 : 0) - (e.hunt || e.lead ? 3 : 0) - (e === G.boss ? 3 : 0); out.push([s, e]); }
  out.sort((a, b) => a[0] - b[0]); return out.slice(0, n).map(a => a[1]); }
function meleeTarget(p) { const c = C(); if (!c || !c.aim) return null; const r0 = p.rot, l0 = p.lock, la = p.lockAt; let e = c.aim(p, 6.5); p.rot = r0; if (e && unreach(p, e)) { e = null; if (p.hl && unreach(p, p.hl)) p.hl = null; } if (!e) { p.lock = l0 && !unreach(p, l0) ? l0 : null; p.lockAt = la; } return e; }   /* an unreachable target is never a melee target: the volley takes it */
function autoLock(p, e) { if (!e || e.dead) return; if ((e === G.boss || e.hunt || e.lead || (e.d && (e.d.heavy || e.d.elite))) && p.hl !== e) { p.hl = e; p.lock = e; p.lockAt = G.time; ringFx(e.x, e.z, (e.r || .6) + 1, 0xffd050); } }
function attack() { const p = P(), c = C(); if (!p || p.dead || !c) return; if (G.qte || busy()) { doAct('A'); return; }
  if (p.mounted) { doAct('A'); return; }
  // contextual: stone gate / totems (slam-only) next to her -> Earth slam; Surtaysha's helmet -> chain (both when unlocked; their own cooldowns)
  const PW = G.powers || {}, sk = G.sk || {}, free0 = !p.act || c.canCancel(p.act);
  const so = PW[6] && (G.breakables || []).find(b => !b.dead && b.only === 'slam' && hyp(b.x - p.x, b.z - p.z) < (b.rad || 1) + 3.2);
  const so2 = so || (G.breakables || []).find(b => !b.dead && b.only === 'slam' && hyp(b.x - p.x, b.z - p.z) < (b.rad || 1) + 3.4);
  if (so2 && free0 && G.time > (attack.brT || 0)) { attack.brT = G.time + .5; p.rot = Math.atan2(so2.x - p.x, so2.z - p.z); doAct('A'); setTimeout(() => { try { if (!so2.dead) { so2.hit('slam'); ringFx(so2.x, so2.z, (so2.rad || 1) + 1.2, 0xffc060); burst(so2.x, 1.2, so2.z, 0xc8a070, 2, true); if (G.feel) G.feel.trauma = Math.max(G.feel.trauma || 0, .35); } } catch (e) { } }, 220); return; }   /* QA 2b: totems / stone gates break under plain ⚔ */
  const hm = PW[7] && G.ents.find(e => isFoe(e) && e.onChain && e.helm > 0 && hyp(e.x - p.x, e.z - p.z) < 14);
  if (hm && free0 && sk[7] && sk[7].cd <= 0) { sk[7].on = true; p.act = null; p.rot = Math.atan2(hm.x - p.x, hm.z - p.z); doAct(2); return; }
  const near = meleeTarget(p);
  if (p.act && p.act.w4v && p.act.w4v.fired < p.act.w4v.n) return;   /* a volley in flight is never restarted by a repeated tap (fast tapping used to reset it before the first arrow: no arrows at all) */
  if (!near) { const a = p.act; const free = !a || a.kind === 'atk' && a.hit || (c.canCancel && c.canCancel(a) && a.kind !== 'block'); const tgs = free ? rangedTargets(p, arrowsN()) : [];
    if (tgs.length) { volley(p, tgs); return; } }
  doAct('A'); const tg = p.act && p.act.kind === 'atk' ? (p.lock && !p.lock.dead ? p.lock : null) : null; if (tg && hyp(tg.x - p.x, tg.z - p.z) < 8) autoLock(p, tg); }
function volley(p, tgs) { if (p.guard && C().w3Lock) { p.guard = false; } p.queued = false; p.combo = 0; const e0 = tgs[0]; p.rot = Math.atan2(e0.x - p.x, e0.z - p.z);
  const a = { kind: 'cast', t: 0, dur: .52, w4v: { tgs, n: arrowsN(), fired: 0 } }; p.act = a; p.play('1H_Ranged_Shoot', { once: true, force: true, dur: .52 }); try { Sfx.bowDraw && Sfx.bowDraw(); Sfx.arrow && Sfx.arrow(); } catch (e) { }
  autoLock(p, e0); G.stats.volley = (G.stats.volley || 0) + 1; }
function arrowDmg(p) { const d = p.d.dmg || [20, 30]; let k = (G.dmgBoost || 1); try { if (window.__META && __META.pdMul) k *= __META.pdMul('rain'); } catch (e) { } return rnd(d[0], d[1]) * .85 * k * bowK() * (p.wolfT > 0 ? 1.25 : 1); }
function volleyTick(p) { const a = p && p.act; if (!a || !a.w4v) return; const v = a.w4v; while (v.fired < v.n && a.t >= .2 + v.fired * .055) { const i = v.fired++; const live = v.tgs.filter(e => !e.dead); const e = live.length ? live[i % live.length] : null; let tg;
    if (e) { tg = i < live.length ? e : { x: e.x + rnd(-.6, .6), z: e.z + rnd(-.6, .6) }; } else tg = { x: p.x + Math.sin(p.rot) * 20, z: p.z + Math.cos(p.rot) * 20 };
    shoot(p, tg, arrowDmg(p), false); const q = G.proj[G.proj.length - 1]; if (q) { q.m.scale.set(1.7, 1.7, 2.1); q.m.material.color.set(0xfff0c8); q.vx *= 1.55; q.vz *= 1.55; q.life = 2.4; q.w4 = 1; q.m.position.y = 1.5; } sparks(p.x + Math.sin(p.rot) * .7, 1.5, p.z + Math.cos(p.rot) * .7, 0xfff0c0, 3, 3); } }
// hold: spinning strong strike (engine heavy 'sweep' = 2H spin, breaks guards)
function strong() { const p = P(), c = C(); if (!p || p.dead || !c || busy() || p.mounted) return; const a = p.act; if (a && !(a.kind === 'atk' || c.canCancel(a))) return; if (a && a.kind === 'block') p.guard = false; p.act = null; p.combo = 2; c.startHeavy(p); }
// ---- dodge: parry + counter when an enemy is winding up a blockable strike at her, else the engine's dodge (double tap = roll)
function threat(p) { let best = null, bd = 1e9;
  for (const e of G.ents) { if (!isFoe(e) || e.asleep || e.stagger > 0) continue; const d = hyp(e.x - p.x, e.z - p.z) - (e.r || .5) - (p.r || .5); let ok = false, reach = 0;
    const big = e.d.heavy || e.w4cap || e === G.boss;   /* bosses / captains: the parry window is the last 35 % of the wind-up only — earlier presses are plain dodges */
    if (e.km && e.km.ph === 0) { if (e.km.D && e.km.D.ub) continue; ok = (e.km.tg === p || d < 3) && e.km.t >= e.km.wd * (big ? .62 : .3); reach = 6.5; }
    else if (e.state === 'windup' && !e.d.ranged) { if (e.d.slam) continue; ok = (e.tg === p || d < (e.d.range || 2) + .8) && e.tm <= e.wd * (big ? .35 : .7);   // parry window: the last 70 % of the wind-up (pressed earlier = a plain dodge)
      reach = (e.d.range || 2) + 1.8 + (e.d.lane ? 1.2 : 0); }
    if (!ok || d > reach) continue; if (d < bd) { bd = d; best = e; } }
  return best; }
// bench #12 boss rules: three parries / dodges timed into the boss's wind-ups stagger him for 2.4 s (an opening); at 6 % HP he reels and the next hit is the finisher
function bossEvade(p) { const b = G.boss; if (!b || b.dead || b.team !== 'enemy' || b.yield || G.time < (b.w4evT || 0)) return; const wind = b.state === 'windup' || (b.km && b.km.ph === 0); if (!wind || hyp(b.x - p.x, b.z - p.z) - (b.r || 1) > 7) return;
  b.w4evT = G.time + .9; if (!b.poiseMax || b.brokenT > 0 || G.time < (b.pzImm || 0)) return;   // one system: the engine's poise bar. A dodge timed into his wind-up chips 34 % of it (like a parry); the break is the 2.4 s stagger
  b.poise -= b.poiseMax * .34; b.poiseAt = G.time; num(b, '💢', 'c'); if (b.poise <= 0) { b.poise = 1; b.w4brk = 1; } }
// finisher: slow-mo + impact through the animation agent's feel system (G.feel.trauma / G.hitStop — no second shake table) + a 0.9 s camera push-in on the boss
function finisherFx(b) { G.slow = Math.max(G.slow || 0, .9); flash(.35); try { Sfx.big(); Sfx.hit('heavy', { x: b.x, z: b.z }); Sfx.bark && Sfx.bark('maid', 'kill', { x: b.x, z: b.z }); } catch (e) { } try { if (G.feel) G.feel.trauma = Math.max(G.feel.trauma || 0, .85); else G.shake = Math.max(G.shake || 0, .5); G.hitStop = Math.max(G.hitStop || 0, .1); } catch (e) { }
  try { const prev = G.camFn, t0 = performance.now(), tx = b.x, tz = b.z, ty = (b.h || 2) * .6; G.camFn = (cam, dt) => { if (prev) { try { prev(cam, dt); } catch (e) { } } const u = (performance.now() - t0) / 900; if (u >= 1) { G.camFn = prev || null; return; } const k = Math.sin(Math.min(1, u) * Math.PI) * .32; cam.position.x += (tx - cam.position.x) * k; cam.position.z += (tz - cam.position.z) * k; cam.position.y += (ty + 3 - cam.position.y) * k * .6; cam.lookAt(tx, ty, tz); }; } catch (e) { } }
// QA (3): boss weak points with three buttons. Whatever the old fight asked for (Earth Slam, Chain, Water Shield, Dev Strength, Wolf's Leap), the AMULET now does it: pressing 🔺 near the boss — or dodging three of his strikes —
// opens his weak spot for 7 s (his own onSlam / onChain / onLeap script runs, so the dragon is still dragged ashore etc.). No fight stays at the 0.35x resist for long.
function openBoss(b, sec = 7) { if (!b || b.dead || !b.weak) return false; b.w4open = G.time + sec; try { if (b.onChain) b.onChain(); else if (b.onSlam) b.onSlam(); else if (b.onLeap) b.onLeap(); else { b.openT = Math.max(b.openT || 0, sec); flash(.25); ringFx(b.x, b.z, 4, 0xffe080); hintRaw(t('w_open')); } } catch (e) { } G.stats.w4open = (G.stats.w4open || 0) + 1; return true; }
function weakWrap(b) { if (!b || b.w4wk || typeof b.weak !== 'function') return; b.w4wk = 1; const w0 = b.weak; b.weak = (...a) => (b.w4open > G.time ? Math.max(1.6, w0(...a)) : w0(...a)); }
function bossTick() { weakWrap(G.boss); const b = G.boss, M = G.mis;
  if (b && !b.dead) { if (b.w4brk && !(b.brokenT > 0)) { b.w4brk = 0; try { b.damage(1, P(), { pz: 1e6, nf: 1, silent: 1 }); } catch (e) { } }   /* finish the poise through the engine (breakPoise) */
    const br = b.brokenT > 0; if (br && !b.w4brOn) { num(b, '💫 ' + tt('w4_stag'), 'c'); G.stats.w4stag = (G.stats.w4stag || 0) + 1; openBoss(b, 6); } b.w4brOn = br; } if (!b || b.dead || !M || !M.started || /^(0-0|0-2|2-2|7-4)$/.test(M.id) || b.yield || b.invuln || b.team !== 'enemy' || b.maxHp > 1e6) return;
  if (b.w4fin === undefined) { if (b.hp > 0 && b.hp < b.maxHp * .06) { b.w4fin = b.hp; b.w4finT = G.time + 5; b.stagger = 5; try { b.clearTele(); } catch (e) { } b.km = null; b.state = 'chase'; b.play('Hit_A', { once: true, force: true }); hintRaw('⚔ ' + tt('w4_finish')); num(b, '⚔', 'c'); ringFx(b.x, b.z, (b.r || 1) + 1.8, 0xff5030); } }
  else if (b.w4fin > 0) { if (b.hp < b.w4fin - .5) { b.w4fin = -1; finisherFx(b); G.stats.w4fin = (G.stats.w4fin || 0) + 1; b.die(); } else if (G.time > b.w4finT) b.w4fin = -1; } }
function dodge() { const p = P(), c = C(); if (!p || p.dead || !c) return; if (busy()) return; if (!p.mounted) bossEvade(p);
  const e = p.mounted ? null : threat(p), a = p.act;
  if (e && (!a || c.canCancel(a) || a.kind === 'dodge' || a.kind === 'hvy')) {
    if (p.guard) p.guard = false; c.parry(p, e); e.state = 'chase'; e.tm = 0; try { e.clearTele(); } catch (er) { } if (e.km) { e.km = null; }
    p.act = null; p.rot = Math.atan2(e.x - p.x, e.z - p.z); c.startAtk(p); G.stats.w4parry = (G.stats.w4parry || 0) + 1; return; }
  doAct('D'); }
// ---- amulet: one button, the game picks the power for the situation
function enemiesWithin(p, r) { return G.ents.filter(e => isFoe(e) && !e.asleep && hyp(e.x - p.x, e.z - p.z) < r + (e.r || .5)); }
function pickPower(p) { const PW = G.powers || {}, h = G.hero, n7 = enemiesWithin(p, 7.5).length, all = enemiesWithin(p, 30), tough = all.find(e => (e === G.boss || (e.d && (e.d.heavy || e.d.elite)) || e.hunt) && hyp(e.x - p.x, e.z - p.z) < 9), far = all.filter(e => hyp(e.x - p.x, e.z - p.z) > 8 && hyp(e.x - p.x, e.z - p.z) < 22).length;
  if (!all.length) return null;
  if (h === 'allayar') return tough ? 3 : n7 >= 2 ? 2 : 1;
  if (h === 'sarbinaz') return n7 >= 3 ? 2 : (tough || n7) ? 1 : 5;
  if (PW[8] && (n7 >= 3 || tough)) return 8;
  if (tough) return 5;
  if (n7 >= 3 || all.length >= 6) return 4;
  if (far >= 2) return 2;
  if (n7) return 5;
  return 4; }
const PNAME = { 1: 'k1', 2: 'k2', 3: 'k3', 4: 'k4', 5: 'k5', 6: 'pw6', 7: 'pw7', 8: 'pw8', 9: 'pw9', 0: 'pw0' };
const HNAME = { allayar: { 1: 'n_bash', 2: 'n_cry', 3: 'n_cleave' }, sarbinaz: { 1: 'n_thrust', 2: 'n_sweep', 5: 'n_javelin' } };
function amulet() { const p = P(), c = C(); const why = r => { amulet.why = r + '@' + (G.time || 0).toFixed(1); }; if (!p || p.dead || !c || busy()) return why('busy'); const btn = $('bP');
  if ((G.ulti || 0) < 100) { if (btn) { btn.classList.remove('w4no'); void btn.offsetWidth; btn.classList.add('w4no'); } if (G.time > (amulet.nt || 0)) { amulet.nt = G.time + 1.5; num(p, Math.round(G.ulti || 0) + '%', 'n'); } return why('gauge'); }
  const a = p.act; if (a && !(a.kind === 'atk' || c.canCancel(a))) return why('act:' + a.kind);
  let k = pickPower(p); if (k == null) { if (G.time > (amulet.nt || 0)) { amulet.nt = G.time + 1.5; num(p, '🔺', 'n'); } return why('none'); }
  const PW = G.powers || {}; if (k === 1 && PW[6]) k = 6; if (k === 2 && PW[7]) k = 7;
  const sk = G.sk || {}; for (const q of [k, k === 6 ? 1 : k === 7 ? 2 : k]) if (sk[q]) { sk[q].on = true; sk[q].cd = 0; }
  if (p.act && p.act.kind === 'block') p.guard = false; p.act = null;
  const u0 = G.ulti; doAct(k === 6 ? 1 : k === 7 ? 2 : k);
  const used = !!p.act || G.ulti < u0 || k === 8;
  if (!used) return why('fail:' + k); G.ulti = 0; try { const hl = Math.round(p.maxHp * .12); if (p.hp < p.maxHp) { p.hp = Math.min(p.maxHp, p.hp + hl); num(p, '+' + hl, 'h'); } } catch (e) { }   /* the amulet also mends her: +12 % HP */ { const b = G.boss; if (b && !b.dead && b.weak && hyp(b.x - p.x, b.z - p.z) < 32) openBoss(b, 7); } const nm = (HNAME[G.hero] && HNAME[G.hero][k]) ? t(HNAME[G.hero][k]) : t(PNAME[k]); num(p, '🔺 ' + nm, 'c'); try { Sfx.power && Sfx.power(); } catch (e) { } G.stats.amulet = (G.stats.amulet || 0) + 1; G.stats.amuK = k; why('ok:' + k); }
// ---- contextual: wolf leap over a ravine when she walks into its edge (no button)
function ravineAhead(p) { if (G.ravineAhead) return true; for (const b of G.colB || []) if (b && b.ravine && !b.off && b.z2 < p.z + .5 && b.z2 > p.z - 3.2 && p.x > b.x1 - 1 && p.x < b.x2 + 1) return true; return false; }
let ravT = 0;
function ctxTick(dt) { const p = P(); if (!p || p.dead || busy() || p.mounted || archOn()) { ravT = 0; return; } const s = C() && C().stickDir ? C().stickDir() : null;
  const edge = G.colB && G.colB.some(b => b && b.ravine && !b.off && b.z2 < p.z + .5 && b.z2 > p.z - 2.6 && p.x > b.x1 - 1 && p.x < b.x2 + 1);
  if (edge && s && s.z < -.5 && !p.act && !enemiesWithin(p, 8).length) { ravT += dt; if (ravT > .25) { ravT = 0; const sk = G.sk && G.sk[5]; if (sk) { sk.on = true; sk.cd = 0; } p.rot = Math.PI; doAct(5); } } else ravT = 0; }

// ---- HUD: three buttons (+ joystick, pause). The other skill buttons stay in the DOM (hidden) so old code paths keep working
const CSS = `
#btns .ab:not(#bA):not(#bD):not(#bP){display:none!important}
#btns #bA{width:86px;height:86px;right:18px;bottom:22px}
#btns #bD{width:64px;height:64px;right:122px;bottom:10px}
#btns #bP{width:62px;height:62px;right:34px;bottom:124px;display:flex}
#bP{position:absolute;border-radius:50%;border:3px solid transparent;background:radial-gradient(circle at 35% 30%,#3a2a60,#120c26) padding-box,var(--rim,#c9a14a) border-box;display:flex;align-items:center;justify-content:center;pointer-events:auto;cursor:pointer;box-shadow:0 4px 9px rgba(0,0,0,.7);font-size:0;overflow:visible}
#bP:before{display:none}
#bP .g{position:absolute;inset:3px;border-radius:50%;background:conic-gradient(rgba(255,196,70,.55) calc(var(--p,0)*1%),rgba(0,0,0,0) 0);pointer-events:none}
#bP svg.amu{display:block!important;position:relative;z-index:1;width:58%;height:58%}
#bP.full{box-shadow:0 0 0 3px #ffd060,0 0 24px 9px rgba(255,190,60,.9);animation:w4glow .9s ease-in-out infinite}
#bP.full .g{background:radial-gradient(circle,rgba(255,220,120,.55),rgba(255,160,40,.15) 70%)}
@keyframes w4glow{0%,100%{filter:brightness(1)}50%{filter:brightness(1.45)}}
#bP.w4no{animation:w4shk .35s}@keyframes w4shk{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
#bP .k{position:absolute;bottom:-2px;right:-2px;min-width:15px;height:15px;padding:0 3px;border-radius:8px;background:rgba(10,12,30,.9);box-shadow:0 0 0 1px rgba(232,189,98,.7);color:#ffd970;font:700 9px/15px sans-serif;text-align:center;z-index:2}
@media (pointer:coarse){#bP .k{display:none}}
#bD .k{display:block}
#w4army{position:absolute;left:12px;top:92px;z-index:6;pointer-events:none;font:800 12px/1.2 system-ui,sans-serif;color:#ffe9b0;text-shadow:0 1px 3px #000;background:rgba(0,0,0,.38);padding:3px 8px;border-radius:8px;display:none;white-space:nowrap}
#w4ctl{position:absolute;left:50%;bottom:6px;transform:translateX(-50%);z-index:5;pointer-events:none;font:700 11px system-ui,sans-serif;color:rgba(255,236,190,.85);text-shadow:0 1px 2px #000;display:none;white-space:nowrap}
`;
function hudInit() { if ($('w4css')) return; const st = document.createElement('style'); st.id = 'w4css'; st.textContent = CSS; document.head.appendChild(st);
  const btns = $('btns'); if (!btns) return; let b = $('bP'); if (!b) { b = document.createElement('div'); b.id = 'bP'; b.className = 'ab w4'; b.innerHTML = '<i class="g"></i>' + AMU_SVG + '<span class="k">E</span>'; btns.appendChild(b); }
  const pd = (el, fn) => el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); fn(e); }, true);
  // ATTACK: tap = attack, hold = spinning strike (the engine's own handlers on #bA are bypassed)
  const bA = $('bA'); let hold = 0, holdT = null; pd(bA, e => { try { bA.setPointerCapture(e.pointerId); } catch (er) { } bA.classList.add('dn'); press('A'); hold = performance.now(); clearTimeout(holdT); holdT = setTimeout(() => { if (hold) { hold = 0; strong(); } }, 300); });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) bA.addEventListener(ev, e => { e.stopImmediatePropagation(); hold = 0; clearTimeout(holdT); bA.classList.remove('dn'); }, true);
  const bD = $('bD'); const fb = el => { el.classList.add('dn'); setTimeout(() => el.classList.remove('dn'), 110); }; pd(bD, () => { fb(bD); press('D'); }); pd(b, () => { fb(b); amulet(); });
  const ar = document.createElement('div'); ar.id = 'w4army'; ($('hud') || document.body).appendChild(ar);
  const ct = document.createElement('div'); ct.id = 'w4ctl'; ($('hud') || document.body).appendChild(ct); }
// desktop: left mouse = attack (hold = spin), Space = dodge, E = amulet; J/K/Shift keep working; Q/F/Tab/1–0 are silently ignored or mapped
let mHold = 0, mT = null;
addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.button !== 0 || e.target !== $('c') || archOn() || !P() || G.paused) return; press('A'); mHold = performance.now(); clearTimeout(mT); mT = setTimeout(() => { if (mHold) { mHold = 0; strong(); } }, 300); });
addEventListener('pointerup', e => { if (e.pointerType === 'mouse') { mHold = 0; clearTimeout(mT); } });
let kHold = 0, kT = null;
addEventListener('keydown', e => { if (archOn() || !P() || $('dlg') && $('dlg').classList.contains('on')) return; const c = e.code;
  if (c === 'Space' || c === 'KeyK' || c === 'ShiftLeft') { e.preventDefault(); e.stopImmediatePropagation(); if (e.repeat) return; if (G.qte) { doAct('A'); return; } press('D'); return; }
  if (c === 'KeyE' || c === 'KeyU' || c === 'Digit4') { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) amulet(); return; }
  if (c === 'KeyJ') { e.preventDefault(); e.stopImmediatePropagation(); if (e.repeat) return; press('A'); kHold = performance.now(); clearTimeout(kT); kT = setTimeout(() => { if (kHold) { kHold = 0; strong(); } }, 300); return; }
  if (/^Digit[0-9]$/.test(c) || c === 'KeyQ' || c === 'KeyI' || c === 'KeyF' || c === 'KeyR' || c === 'Tab' || c === 'KeyL' || c === 'KeyX' || c === 'KeyH') { e.stopImmediatePropagation(); if (c === 'Tab') e.preventDefault(); } }, true);
addEventListener('keyup', e => { if (e.code === 'KeyJ') { kHold = 0; clearTimeout(kT); } });
// bench #9: 150 ms input buffer — a ⚔ / ➤ press during an action that cannot be cancelled yet is not dropped, it fires at the first possible frame
let buf = null;
function canStart(k) { const p = P(), c = C(); if (!p || p.dead || !c || busy()) return false; const a = p.act; if (!a) return true; try { return k === 'A' ? (a.kind === 'atk' || !!c.canCancel(a)) : (a.kind === 'dodge' || !!c.canCancel(a)); } catch (e) { return true; } }
function press(k) { const p = P(); G.stats && (G.stats.w4tap = (G.stats.w4tap || 0) + 1); if (!p || G.qte || p.mounted || canStart(k)) { buf = null; k === 'A' ? attack() : dodge(); return; } buf = { k, t: performance.now() }; }
function bufTick() { if (!buf) return; if (performance.now() - buf.t > 150) { buf = null; return; } if (canStart(buf.k)) { const k = buf.k; buf = null; G.stats && (G.stats.w4buf = (G.stats.w4buf || 0) + 1); k === 'A' ? attack() : dodge(); } }
function hudTick() { const b = $('bP'); if (!b) return; const u = clamp(G.ulti || 0, 0, 100); b.style.setProperty('--p', u.toFixed(0)); b.classList.toggle('full', u >= 100); }

// ================================================================ B) ARMY + ENEMY SCALING
const NOARMY = /^(0-0|0-1|0-2|3-1|2-1|4-1|.*-S)$/;   // 7-1: no host while riding (mounted check below), it joins for the battle on foot
const RUN = { m: null, bodies: [], arcs: [], rep: 0, lost: 0, start: 0, pDead: false };
// the maidens' armour track also protects the heroine: -2.5 % damage taken per level (max -40 %); the hero's HP itself never grew while enemy damage does every chapter
const heroDefK = () => 1 - Math.min(.4, .025 * lvl('armor'));
function heroGuard(p) { if (!p || p.w4def) return; p.w4def = 1; const d0 = p.damage.bind(p); p.damage = (amt, src, op) => d0(typeof amt === 'number' && src && src.team === 'enemy' ? amt * heroDefK() : amt, src, op); }
function armyStart() { const M = G.mis, p = P(); try { heroGuard(p); } catch (e) { } if (!M || !p || RUN.m === M) return; RUN.m = M; RUN.bodies = []; RUN.arcs = []; RUN.lost = 0; RUN.rep = 0; try { coinsStart(M); } catch (e) { console.warn('[w4 coins]', e); }
  const id = M.id || ''; if (NOARMY.test(id) || p.mounted) { chip(); return; }
  const men = W.men | 0, nb = men > 0 ? Math.min(6, Math.ceil(men / 6)) : 0; RUN.rep = nb ? men / nb : 0;
  /* allies lag fix: the host forms up behind her but on HER side of any wall behind the start (1-1: the city wall at z 12.2 trapped every body spawned at p.z + 9 — 58-74 % "ally > 22 m") */
  let lim = p.z + 14; for (const c of G.colB || []) if (!c.off && c.z1 > p.z + .5 && c.z1 < lim && c.x1 < p.x + 5 && c.x2 > p.x - 5) lim = c.z1;
  const z0 = p.z + clamp(lim - p.z - 5.6, 2, 9), x0 = clamp(p.x, -4, 4);
  for (let i = 0; i < nb; i++) spawnBat(clamp(x0 + (i % 3 - 1) * 1.7, -G.W + 1, G.W - 1), z0 + Math.floor(i / 3) * 1.6);
  const na = archN(); for (let i = 0; i < na; i++) spawnArc(clamp(x0 + (i - (na - 1) / 2) * 1.5, -G.W + 1, G.W - 1), Math.min(z0 + 3.4, lim - .7));
  const foe = foeCount(M); chip(); setTimeout(() => { try { if (G.mis === M) hintRaw('⚔ ' + tt('w4_foe', { n: foe })); } catch (e) { } }, 600); }   /* the host itself is shown once, in the left chip */
function spawnBat(x, z) { const e = spawn('w4bat', x, z, 'ally', true); e.spawnT = 0; e.o.scale.setScalar(e.vs || e.d.scale || 1); e.rot = Math.PI;
  e.maxHp = e.hp = Math.round(e.maxHp * shieldK()); e.d = { ...e.d, block: Math.min(.6, .25 + .03 * lvl('shield')) }; e.w4b = 1; RUN.bodies.push(e); return e; }
function spawnArc(x, z) { const e = spawn('w4arc', x, z, 'ally', true); e.spawnT = 0; e.o.scale.setScalar(e.vs || e.d.scale || 1); e.rot = Math.PI; e.maxHp = e.hp = Math.round(e.maxHp * armorK()); e.w4a = 1; RUN.arcs.push(e); return e; }
// QA 5-C1: after a death + retry the chip read "+ 0 batır" for the rest of the mission (every body had fallen before she died and the retry never brought them back; onEnd then also struck all of them off W.men).
// A retry rewinds the fight: the fallen host bodies come back behind her (off-screen spots when possible) and the losses of the failed attempt are forgiven.
function armyRetry() { const M = G.mis, p = P(); if (!M || RUN.m !== M || !p || NOARMY.test(M.id || '') || p.mounted) return; const nb = RUN.bodies.filter(e => e.dead).length, na = RUN.arcs.filter(e => e.dead).length; if (!nb && !na) { RUN.lost = 0; return; }
  RUN.bodies = RUN.bodies.filter(e => !e.dead); RUN.arcs = RUN.arcs.filter(e => !e.dead); RUN.lost = 0;
  let lim = p.z + 14; for (const c of G.colB || []) if (!c.off && c.z1 > p.z + .5 && c.z1 < lim && c.x1 < p.x + 5 && c.x2 > p.x - 5) lim = c.z1; const z0 = Math.min(p.z + 5, lim - 1.4), x0 = clamp(p.x, -4, 4);
  for (let i = 0; i < nb; i++) spawnBat(clamp(x0 + (i % 3 - 1) * 1.7, -G.W + 1, G.W - 1), z0 + Math.floor(i / 3) * .9);
  for (let i = 0; i < na; i++) spawnArc(clamp(x0 + (i - (na - 1) / 2) * 1.5, -G.W + 1, G.W - 1), Math.min(z0 + 1.8, lim - .7)); chip(); }
function foeCount(M) { const c = M.c || 1; const bodies = G.ents.filter(e => e.team === 'enemy' && !e.dead && !e.bg).length; const ours = 40 + (W.men | 0); return Math.max(Math.round(ours * (1.15 + .05 * c)), bodies * 3); }
function chip() { const el = $('w4army'); if (!el) return; { const M0 = G.mis; if (M0 && /^(0-1|0-2)$/.test(M0.id || '') && M0.started && P() && !G.paused && !G.flying && $('hud') && $('hud').classList.contains('on')) { el.style.display = 'block'; const s0 = '⚔ ' + tt('w4_sarkop'); if (el.textContent !== s0) el.textContent = s0; return; } } const M = G.mis, on = !!(M && M.started && P() && !G.paused && !G.flying && $('hud') && $('hud').classList.contains('on') && !archOn() && !NOARMY.test(M.id || ''));
  el.style.display = on ? 'block' : 'none'; if (!on) return; const alive = Math.max(0, Math.round((W.men | 0) - RUN.lost)); const s = '⚔ ' + tt('w4_army', { q: 40, b: alive }); if (el.textContent !== s) el.textContent = s; }
// per-entity adjustments, once: enemy power curve per chapter, maidens' armour, captains' poise
function entTick() { const M = G.mis; if (!M) return; const c = M.c || 0, tut = M.id === '0-0';
  for (const e of G.ents) { if (e.w4s || e.dead) continue; e.w4s = 1;
    if (e.team === 'enemy' && !tut && c > 0 && !e.prop && e.maxHp < 1e6) { const df = defi(c), hk = foeHpK(c) * (1 + .07 * df); e.maxHp = Math.round(e.maxHp * hk); e.hp = Math.round(e.hp * hk); e.dmgMul = (e.dmgMul || 1) * foeDmK(c) * Math.min(2.2, 1 + DEFD * df); }
    else if (e.team === 'ally' && e !== P() && (e.type === 'qiz') && !tut) { e.maxHp = Math.round(e.maxHp * armorK()); e.hp = Math.round(e.hp * armorK()); } }
  { const b = G.boss; if (b && !b.dead && !b.w4b && c > 0 && b.team === 'enemy' && b.d && b.d.heavy && !/^(0-2|2-2|7-4)$/.test(M.id || '') && G.time > (b.w4see || (b.w4see = G.time + .6))) { b.w4b = 1;   /* 0.6 s after he appears: the mission's own onBoss() has set his HP by then */ b.d = { ...b.d, cd: (b.d.cd || 2) * .7, windup: (b.d.windup || 1) * .9 }; { const K = BOSSK[b.type] || [(!b.weak && !b.weakHint) ? BOSSHP : 1.6, .8], fr = b.hp / b.maxHp; b.maxHp = Math.round(b.maxHp * K[0]); b.hp = Math.round(b.maxHp * fr); b.dmgMul = (b.dmgMul || 1) * K[1]; } }
    if (b && !b.dead && !b.w4d && M.id === '7-4' && b.team === 'enemy') { b.w4d = 1; b.dmgMul = (b.dmgMul || 1) * .7; }   /* Surtaysha: scripted phases untouched, only his damage (1 death / 6 % HP left at the cap) */
    // QA pass 2: champions (duel) and captains are not stun-locked by ⚔ spam — elite hyper-armour (flinch only with broken poise), a poise bar, more HP (25–40 s fights)
    const caps = (M.hunt || []).slice(); if (b && !b.dead && b.team === 'enemy' && b.d && !b.d.heavy && !/^(0-0)$/.test(M.id || '')) caps.push(b);   /* 2-2 Bayimbet (non-lethal duel) included: he fell in 6 s */
    for (const h of caps) if (h && !h.dead && !h.w4cap && h.team === 'enemy' && !tut) { h.w4cap = 1; const k = h === b ? 5.5 : 2.2; h.maxHp = Math.round(h.maxHp * k); h.hp = Math.round(h.hp * k); h.d = { ...h.d, elite: true }; const pm = Math.max(h.poiseMax || 0, clamp(h.maxHp * .22, 160, 900)); h.poiseMax = pm; h.poise = pm; h.dmgMul = (h.dmgMul || 1) * 1.15; }
    for (const e of G.ents) if (!e.w4h && e.rig && e.rig.proc === 'wolf') { e.w4h = 1; e.h = 1.5 * (e.d.vsK || 1); } }   /* quadruped wolf: HP bar height */
  for (const h of M.hunt || []) if (!h.w4p && !h.dead) { h.w4p = 1; const pm = (h.poiseMax || 80) * (1 + .2 * c); h.poiseMax = pm; h.poise = pm; }
  for (const e of RUN.bodies) if (e.dead && !e.w4dead) { e.w4dead = 1; RUN.lost += RUN.rep; } }
// mission end (META hook): rescued warriors join, fallen ones are lost; a chapter boss pays the reward that opens the next cap
function onEnd(id, k) { const M = G.mis; if (!M || M.w4end) return; M.w4end = true; const m = M.m || {}; let msg = [];
  const lost = Math.min(W.men | 0, Math.round(RUN.m === M ? RUN.lost : 0)); if (lost > 0) { W.men -= lost; W.lostAll = (W.lostAll | 0) + lost; msg.push(tt('w4_lost', { n: lost })); }
  try { const L0 = (M.res || []); let tot = 0, sv = 0; for (const g of L0) for (const c of g.ps || []) { tot++; if (c.saved) sv++; } if (tot > 0 && sv > 0) { const gain = clamp(Math.round(10 + 20 * sv / tot), 10, 30), prev = W.best[id] | 0; if (gain > prev) { W.best[id] = gain; W.men += gain - prev; msg.push(tt('w4_join', { n: gain - prev })); } } } catch (e) { }
  if (m.boss && !W.bossPaid[id]) { W.bossPaid[id] = 1; const c0 = cap(); setTimeout(() => { try { addGold(200 + 100 * (m.c || 1)); const c1 = capOf(Math.min(7, (m.c || 1) + 1)); toastW(tt('w4_capUp', { c: Math.max(c0, c1) })); } catch (e) { } }, 50); }
  save(); setTimeout(() => { for (const s of msg) toastW(s); const ex = []; try { if (!/^(0-0|.*-S)$/.test(id)) ex.push('🪙 ' + tt('w4_coins', { n: bits((W.coins || {})[id] | 0), m: 3 })); const cn = window.__META && __META.chestNext ? __META.chestNext() : 0; if (cn > 0) ex.push(tt('w4_chest', { n: cn })); } catch (e) { } endRow(msg.concat(ex)); }, 400); }
// bench #19: three ancient coins stand at the roadside in every mission (+15 gold each, remembered per mission in qq_w4.coins); the end screen lists them and the stars missing for the next chest
const COINS = [], bits = v => (v & 1) + (v >> 1 & 1) + (v >> 2 & 1);
function coinsStart(M) { for (const c of COINS) { try { world.remove(c.g); } catch (e) { } } COINS.length = 0; const p = P(); if (!M || !p || /^(0-0|.*-S)$/.test(M.id || '')) return; if (!W.coins || typeof W.coins !== 'object') W.coins = {}; const got = W.coins[M.id] | 0, k = p.mounted ? 2.2 : 1;
  [[-1, 24], [1, 55], [-1, 88]].forEach(([sd, dz], i) => { if (got & (1 << i)) return; const x = sd * 5.6, z = p.z - dz * k; const g = new THREE.Mesh(new THREE.CylinderGeometry(.36, .36, .07, 14), new THREE.MeshStandardMaterial({ color: 0xffc83a, metalness: .8, roughness: .3, emissive: 0x7a5200 })); g.rotation.x = Math.PI / 2; g.position.set(x, 1, z); g.castShadow = true; world.add(g); COINS.push({ g, x, z, i, id: M.id }); }); }
function coinTick(dt) { const p = P(); if (!p || !COINS.length) return; for (let k = COINS.length - 1; k >= 0; k--) { const c = COINS[k]; if (!c.g.parent) { COINS.splice(k, 1); continue; } c.g.rotation.z += dt * 3; c.g.position.y = 1 + Math.sin((G.time || 0) * 3 + c.i) * .12;
    if (hyp(p.x - c.x, p.z - c.z) < 2.1) { world.remove(c.g); COINS.splice(k, 1); W.coins[c.id] = (W.coins[c.id] | 0) | (1 << c.i); save(); try { addGold(15, c.x, c.z); Sfx.pick && Sfx.pick(); } catch (e) { } ringFx(c.x, c.z, 1.6, 0xffd050); num(p, '🪙 ' + tt('w4_coin', { n: bits(W.coins[c.id]), m: 3 }), 'c'); } } }
function toastW(s) { try { hintRaw(s); } catch (e) { } }
function endRow(msg) { const stl = $('stl'); if (!stl) return; let r = $('w4end'); if (!r) { r = document.createElement('div'); r.id = 'w4end'; r.style.cssText = 'color:#ffe08a;font-weight:700'; stl.appendChild(r); } r.textContent = msg.join(' · '); }
function hookMeta() { const M = window.__META; if (!M || M.w4) return !!M; const f = M.missionEnd; M.missionEnd = (id, k) => { try { onEnd(id, k); } catch (e) { console.warn('[w4 end]', e); } return f && f(id, k); };
  const pm = M.pdMul; if (pm) M.pdMul = kk => { const p = P(), a = p && p.act; const ranged = kk === 'rain' || kk === 'chain' || kk === 'javelin' || (a && /^(cast|chain|javelin)$/.test(a.kind)); return pm(kk) * (ranged ? 1 : swordK()); };
  M.w4 = true; return true; }

// ---- catapult cart (chapter 5+): a cart with a throwing arm; lobs a stone at her, red circle on the ground first (dodge it)
const ROCKS = [];
T.w4cat = { ...T.askar, like: 'askar', mdl: 'askar', name: 'w4_manj', block: 0, armor: .2, poise: 0, ranged: true, keep: 30 };   // own type: no soldier kit moves (the hidden body must not fight)
const CATS = [];
function catapult(x, z) { const e = spawn('w4cat', x, z, 'enemy', true); CATS.push(e); e.spawnT = 0; e.o.scale.setScalar(e.vs || e.d.scale || 1); e.o.traverse(m => { if (m.isMesh || m.isSkinnedMesh) m.visible = false; });
  const g = new THREE.Group(), k = 1 / (e.vs || e.d.scale || 1); const MXB = window.__MXB; let arm, cup, mx = null; try { if (MXB) mx = MXB.put(g, 'catapult', 0, 0, 0, 'enemy'); } catch (er) { mx = null; }
  if (mx && mx.userData && mx.userData.arm) { arm = mx.userData.arm; cup = mx.userData.cup; } else { const src = A.props && A.props.R_arava; if (src) { const c = src.clone(true); c.scale.setScalar(2.1); g.add(c); }
  const wd = new THREE.MeshStandardMaterial({ color: 0x5a3a1c, roughness: .9 }); const post = new THREE.Mesh(new THREE.BoxGeometry(.25, 1.6, .25), wd); post.position.set(0, 1.6, 0); g.add(post);
  arm = new THREE.Group(); arm.position.set(0, 2.3, 0); const beam = new THREE.Mesh(new THREE.BoxGeometry(.16, .16, 3.2), wd); beam.position.z = -.6; arm.add(beam); cup = new THREE.Mesh(new THREE.SphereGeometry(.28, 8, 6), new THREE.MeshStandardMaterial({ color: 0x777066, roughness: 1 })); cup.position.set(0, .2, -2.1); arm.add(cup); g.add(arm);
   }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.scale.setScalar(k); e.o.add(g); e.w4arm = arm; e.w4cup = cup;
  e.d = { ...e.d, name: 'w4_manj', block: 0, armor: .2, poise: 0, ranged: true, keep: 30 }; e.poiseMax = 0; e.speed = 0; e.r = 1.4; e.maxHp = e.hp = Math.round(300 * (1 + .2 * chap())); e.w4s = 1; e.w4cat = true;   /* w4s: no chapter HP curve on top (it was 3500+ HP with the ally balance) */ e.px = x; e.pz = z; e.cd = rnd(2, 4); e.rot = 0;
  e.custom = catAI; return e; }
function catAI(e, dt) { e.x = e.px; e.z = e.pz; e.kx = e.kz = 0; e.state = 'chase'; e.farT = -1e9; const p = P(); if (!p || p.dead) return true; const d = hyp(p.x - e.x, p.z - e.z); e.rot = Math.atan2(p.x - e.x, p.z - e.z);
  if (e.w4arm) e.w4arm.rotation.x = e.cock ? Math.min(.9, e.w4arm.rotation.x + dt * 2) : Math.max(-.6, e.w4arm.rotation.x - dt * 9);
  e.cd -= dt; if (e.cd > 0 || d > 40 || d < 3) { e.cock = e.cd < 1.2; return true; }
  e.cd = rnd(5, 6.5); e.cock = false; const tx = p.x + (p.vx || 0) * .5, tz = p.z + (p.vz || 0) * .5, dur = 1.7, R = 3.0;
  const tl = telegraph(tx, tz, R, dur, 0xff5522); const m = new THREE.Mesh(new THREE.SphereGeometry(.45, 10, 8), new THREE.MeshStandardMaterial({ color: 0x6e665c, roughness: 1 })); m.castShadow = true; world.add(m);
  ROCKS.push({ m, x0: e.x, z0: e.z, x1: tx, z1: tz, t: 0, dur, R, src: e, dmg: Math.round(26 * (1 + .15 * chap())) }); try { Sfx.swing && Sfx.swing(); } catch (er) { } return true; }
function rockTick(dt) { for (let i = CATS.length - 1; i >= 0; i--) { const c = CATS[i]; if (c.dead || !G.ents.includes(c)) { CATS.splice(i, 1); continue; } c.x = c.px; c.z = c.pz; c.kx = c.kz = 0; if (c.stagger > .25) c.stagger = .25; }
  for (let i = ROCKS.length - 1; i >= 0; i--) { const r = ROCKS[i]; r.t += dt; const k = Math.min(1, r.t / r.dur); r.m.position.set(r.x0 + (r.x1 - r.x0) * k, 2.4 + Math.sin(k * Math.PI) * 9 - k * 2.2 + k * (r.y1 || 0), r.z0 + (r.z1 - r.z0) * k);
    if (k >= 1) { world.remove(r.m); ROCKS.splice(i, 1); try { if (r.dmg) hitCircle(r.x1, r.z1, r.R, r.dmg, r.team || 'enemy', r.src, { ub: 1 }); if (r.cb) r.cb(); ringFx(r.x1, r.z1, r.R, 0xff7733); burst(r.x1, .4, r.z1, 0x8a7a64, 2.4, true); Sfx.big && Sfx.big(); G.shake = Math.max(G.shake || 0, .35); } catch (e) { } } } }
// our own catapult cart (siege): a prop, not a unit; lob() throws a stone for either side (ally stones hurt enemies / call cb on landing)
function catProp(x, z, ry = Math.PI) { const g = new THREE.Group(); let arm, mx = null; try { if (window.__MXB) mx = window.__MXB.put(g, 'catapult', 0, 0, 0, 'ally'); } catch (er) { mx = null; }
  if (mx && mx.userData && mx.userData.arm) arm = mx.userData.arm; else { const src = A.props && A.props.R_arava; if (src) { const c = src.clone(true); c.scale.setScalar(2.1); g.add(c); }
  const wd = new THREE.MeshStandardMaterial({ color: 0x6a4420, roughness: .9 }); const post = new THREE.Mesh(new THREE.BoxGeometry(.25, 1.6, .25), wd); post.position.set(0, 1.6, 0); g.add(post);
  arm = new THREE.Group(); arm.position.set(0, 2.3, 0); const beam = new THREE.Mesh(new THREE.BoxGeometry(.16, .16, 3.2), wd); beam.position.z = -.6; arm.add(beam); const cup = new THREE.Mesh(new THREE.SphereGeometry(.28, 8, 6), new THREE.MeshStandardMaterial({ color: 0x777066, roughness: 1 })); cup.position.set(0, .2, -2.1); arm.add(cup); g.add(arm);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(.9, .55), new THREE.MeshBasicMaterial({ color: 0x2f6fd0, side: THREE.DoubleSide })); flag.position.set(.5, 3.3, 0); const pole = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 2, 5), wd); pole.position.set(0, 2.7, .0); g.add(flag, pole);
   }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.position.set(x, 0, z); g.rotation.y = ry; world.add(g); try { G.colC.push({ x, z, r: 1.8 }); } catch (e) { }
  const c = { g, arm, x, z, cockT: 0, fire() { c.cockT = .35; try { Sfx.swing && Sfx.swing(); } catch (e) { } } }; PROPS.push(c); return c; }
const PROPS = [];
function lob(x0, z0, x1, z1, o = {}) { const dur = o.dur || 1.7, R = o.R || 3; if (o.tele !== false) telegraph(x1, z1, R, dur, o.team === 'ally' ? 0xffd060 : 0xff5522);
  const m = new THREE.Mesh(new THREE.SphereGeometry(.45, 10, 8), new THREE.MeshStandardMaterial({ color: 0x6e665c, roughness: 1 })); m.castShadow = true; world.add(m);
  ROCKS.push({ m, x0, z0, x1, z1, t: 0, dur, R, src: o.src || null, dmg: o.dmg || 0, team: o.team || 'enemy', cb: o.cb, y1: o.y1 || 0 }); }
function propTick(dt) { for (let i = PROPS.length - 1; i >= 0; i--) { const c = PROPS[i]; if (!c.g.parent) { PROPS.splice(i, 1); continue; } if (c.cockT > 0) { c.cockT -= dt; c.arm.rotation.x = Math.max(-.6, c.arm.rotation.x - dt * 9); } else c.arm.rotation.x = Math.min(.9, c.arm.rotation.x + dt * .6); } }
function cavalry(e) { try { toggleMount(e, true); e.d = { ...e.d, name: 'w4_cav' }; } catch (er) { } return e; }

// ================================================================ C) UPGRADE SCREEN
const TRK = [['sword', '🗡'], ['bow', '🏹'], ['armor', '🛡'], ['shield', '🔰'], ['arch', '🎯']];
const UPCSS = `#w4up{position:fixed;inset:0;z-index:60;display:none;flex-direction:column;align-items:center;background:radial-gradient(120% 80% at 50% -10%,rgba(60,74,160,.45),transparent 60%),radial-gradient(ellipse at 50% 120%,rgba(156,31,27,.28),transparent 55%),#10142b;color:#f3e6c8;font:600 13px/1.25 var(--fu,system-ui),sans-serif;padding:max(6px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right)) 6px max(10px,env(safe-area-inset-left));overflow:auto}
#w4up.on{display:flex}#w4up .hd{display:flex;align-items:center;gap:10px;width:100%;max-width:820px;margin:2px 0 6px}#w4up .hd h2{flex:1;margin:0;font:400 clamp(18px,3vw,24px)/1 var(--fd,serif);color:#ffd970;letter-spacing:.04em;text-align:center}
#w4up .bk{height:34px;padding:0 12px;border-radius:17px;border:1px solid rgba(255,210,120,.6);background:rgba(20,16,40,.8);color:#ffe7b8;font:700 13px var(--fu,sans-serif);cursor:pointer}
#w4up .gd{padding:5px 12px;border:1px solid rgba(255,210,120,.5);border-radius:16px;background:rgba(0,0,0,.35);color:#ffd970;font-size:15px;white-space:nowrap}
#w4up .info{width:100%;max-width:820px;font-size:12px;color:#d9c9a8;text-align:center;margin-bottom:6px}#w4up .info b{color:#ffd970}
#w4up .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:7px;width:100%;max-width:820px}
#w4up .tr{display:flex;align-items:center;gap:8px;padding:7px 9px;border-radius:12px;background:linear-gradient(180deg,rgba(40,32,70,.92),rgba(22,18,40,.92));border:1px solid rgba(255,206,110,.45)}
#w4up .ic{flex:none;width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;background:rgba(0,0,0,.35);box-shadow:inset 0 0 0 1px rgba(255,210,120,.5)}
#w4up .tx{flex:1;min-width:0}#w4up .tx b{display:block;color:#ffe7b8;font-size:13.5px}#w4up .tx small{display:block;color:#cdbb98;font-size:11.5px}
#w4up .pp{display:flex;gap:3px;margin:3px 0}#w4up .pp i{width:9px;height:9px;border-radius:50%;background:rgba(255,255,255,.12);box-shadow:inset 0 0 0 1px rgba(255,210,120,.35)}#w4up .pp i.on{background:#ffc94a}#w4up .pp i.cap{opacity:.25}
#w4up .tr{flex-wrap:wrap;align-content:flex-start}#w4up .bb{flex:1 1 100%;height:30px;margin-top:2px;border:0;border-radius:15px;background:linear-gradient(180deg,#c8402e,#7a1a10);box-shadow:inset 0 1px 0 rgba(255,220,180,.5),0 0 0 1px #ffcf6a;color:#fff4d8;font:800 13px var(--fu,sans-serif);cursor:pointer}#w4up .bb.poor{filter:grayscale(.8) brightness(.7)}#w4up .bb.done{background:linear-gradient(180deg,#3a4a8a,#1a2250);color:#cfd8ff;cursor:default}#w4up .army{width:100%;max-width:820px;text-align:center;margin:0 0 6px;color:#ffe9b0;font-weight:800}`;
let upEl = null;
function upBuild() { if (upEl) return upEl; const st = document.createElement('style'); st.textContent = UPCSS; document.head.appendChild(st);
  upEl = document.createElement('div'); upEl.id = 'w4up'; upEl.innerHTML = '<div class="hd"><button class="bk"></button><h2></h2><div class="gd"></div></div><div class="army"></div><div class="info"></div><div class="grid"></div>'; document.body.appendChild(upEl);
  const st2 = document.createElement('style'); st2.id = 'w4panecss'; st2.textContent = '.w4pane{color:#f3e6c8;font:600 13px/1.25 var(--fu,system-ui),sans-serif;display:flex;flex-direction:column;align-items:center;padding:4px 2px}' + UPCSS.split('\n').slice(1).join('\n').replace(/#w4up\.on\{display:flex\}/, '').replace(/#w4up /g, '.w4pane '); document.head.appendChild(st2);
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('.w4pane [data-k]'); if (b) { e.stopPropagation(); buy(b.dataset.k); } }, true);
  upEl.querySelector('.bk').onclick = () => upClose(); upEl.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) buy(b.dataset.k); }); return upEl; }
function effTxt(k) { const l = lvl(k); if (k === 'sword') return tt('w4_e_sword', { n: Math.round(10 * l) }); if (k === 'bow') return tt('w4_e_bow', { a: arrowsN(), n: Math.round(12 * l) }); if (k === 'armor') return tt('w4_e_armor', { n: 12 * l }) + ' · ' + tt('w4_e_hero', { n: Math.round((1 - heroDefK()) * 100) }); if (k === 'shield') return tt('w4_e_shield', { n: 12 * l, b: 25 + 3 * l }); return tt('w4_e_arch', { n: archN() }); }
function upRender() { const el = upBuild(), cp = cap(), cc = capCh(); el.querySelector('h2').textContent = tt('w4_upT'); el.querySelector('.bk').textContent = tt('w4_close'); el.querySelector('.gd').textContent = '🪙 ' + SAVE.gold;
  el.querySelector('.army').textContent = '⚔ ' + tt('w4_army', { q: 40, b: W.men | 0 });
  el.querySelector('.info').innerHTML = '<b>' + tt('w4_cap', { ch: t('ch' + cc), c: cp }) + '</b> · ' + (cc < 7 ? tt('w4_capN') : '');
  el.querySelector('.grid').innerHTML = gridHTML(); }
function gridHTML() { const cp = cap(), cc = capCh(); return TRK.map(([k, ic]) => { const l = W.up[k] | 0, at = l >= cp, c = cost(k, l), poor = !at && SAVE.gold < c; const pips = Array.from({ length: Math.max(cp, l) }, (_, i) => `<i class="${i < l ? 'on' : ''}"></i>`).join('') + (cc < 7 ? Array.from({ length: 2 }, () => '<i class="cap"></i>').join('') : '');
    return `<div class="tr"><div class="ic">${ic}</div><div class="tx"><b>${tt('w4_' + (k === 'arch' ? 'archers' : k))}</b><div class="pp">${pips}</div><small>${tt('w4_lv', { l: Math.min(l, cp), c: cp })} · ${effTxt(k)}</small></div><button class="bb${poor ? ' poor' : ''}${at ? ' done' : ''}" data-k="${k}" ${at ? 'disabled' : ''}>${at ? tt('w4_capped') : tt('w4_buy') + ' ' + c + ' 🪙'}</button></div>`; }).join(''); }
function paneHTML() { upBuild(); const cp = cap(), cc = capCh(); return '<div class="w4pane"><div class="army">⚔ ' + tt('w4_army', { q: 40, b: W.men | 0 }) + ' · 🪙 ' + SAVE.gold + '</div><div class="info"><b>' + tt('w4_cap', { ch: t('ch' + cc), c: cp }) + '</b>' + (cc < 7 ? ' · ' + tt('w4_capN') : '') + '</div><div class="grid">' + gridHTML() + '</div></div>'; }
function buy(k) { const l = W.up[k] | 0; if (l >= cap()) return; const c = cost(k, l); if (SAVE.gold < c) { const b = upEl.querySelector(`[data-k="${k}"]`); if (b) { b.textContent = tt('w4_nogold'); setTimeout(upRender, 900); } try { Sfx.ui && Sfx.ui(); } catch (e) { } return; }
  SAVE.gold -= c; saveGame(); hudGold(); W.up[k] = l + 1; save(); try { Sfx.power && Sfx.power(); } catch (e) { } upRender(); campRef(); }
const campRef = () => { try { if (window.__META && __META.refresh) __META.refresh(); } catch (e) { } };
function upOpen() { if (window.__META && __META.openCamp) { try { upBuild(); __META.openCamp('army'); return; } catch (e) { } } upRender(); upEl.classList.add('on'); }
function upClose() { if (upEl) upEl.classList.remove('on'); }
// entry points: end screen, map header, the old shop button
function endBtn() { const box = document.querySelector('#end .in'); if (!box) return; let b = $('w4upb'); if (!b) { b = document.createElement('button'); b.id = 'w4upb'; b.className = 'btn alt'; b.onclick = () => upOpen(); const ref = $('ereplay'); if (ref) ref.before(b); else box.appendChild(b); } let can = false; try { const cp = cap(); can = TRK.some(([k]) => (W.up[k] | 0) < (k === 'arch' ? Math.min(5, cp) : cp) && SAVE.gold >= cost(k, W.up[k] | 0)); } catch (e) { } const tx3 = can ? '⚒ ' + tt('w4_canup') : tt('w4_up'); if (b.textContent !== tx3) b.textContent = tx3; b.classList.toggle('w4hot', can); const sh = $('eshop'); if (sh) sh.style.display = 'none'; }   /* upgrade prompt after every mission */
function mapBtn() { const hd = document.querySelector('#map .mh'); if (!hd || $('w4mapb')) return; const b = document.createElement('button'); b.id = 'w4mapb'; b.className = 'bk'; b.style.cssText = 'margin-left:6px'; b.textContent = '⚒'; b.title = tt('w4_upT'); b.onclick = e => { e.stopPropagation(); upOpen(); }; const tot = hd.querySelector('.tot'); if (tot) tot.before(b); else hd.appendChild(b); }

// ================================================================ D) CAMPS ON THE WORLD MAP
const NODE = [[8, 68], [22, 30], [32, 68], [44.5, 30], [56, 70], [67.5, 30], [79, 68], [91, 32]];   // first guess only; map.js layout() moves the markers
const CIC = { yurt: '⛺', tower: '🗼', ford: '🌊' };
const MAPCSS = `.w4camp{position:absolute;transform:translate(-50%,-50%);z-index:3;display:flex;flex-direction:column;align-items:center;cursor:pointer;pointer-events:auto}
.w4camp .ci{width:clamp(18px,3.2vw,26px);height:clamp(18px,3.2vw,26px);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:clamp(13px,2.4vw,18px);background:radial-gradient(circle,#5a1a12,#2a0806);box-shadow:0 0 0 2px #c0392b,0 2px 6px rgba(0,0,0,.7)}
.w4camp small{margin-top:1px;padding:0 4px;border-radius:6px;background:rgba(40,8,6,.8);color:#ffd8c0;font:700 clamp(8px,1.3vw,10px)/1.4 system-ui,sans-serif;white-space:nowrap}
.w4camp.done .ci{background:radial-gradient(circle,#2f4a2a,#142010);box-shadow:0 0 0 2px #7fb86a}.w4camp.done small{background:rgba(10,30,8,.8);color:#cfe8c0}.w4camp.lk{filter:grayscale(.6) brightness(.75)}`;
function campMarks() { const ma = document.querySelector('#map .ma'); if (!ma) return; if (!$('w4mapcss')) { const s = document.createElement('style'); s.id = 'w4mapcss'; s.textContent = MAPCSS; document.head.appendChild(s); }
  ma.querySelectorAll('.w4camp').forEach(e => e.remove()); const S = stars();
  const nextCamp = MLIST.find(q => q.camp && !(q.id in S));   // "N ásker" only on the next uncleared camp
  for (let c = 1; c <= 7; c++) { const cs = MLIST.filter(m => m.c === c && m.camp); const [ax, ay] = NODE[c - 1], [bx, by] = NODE[c];
    const curC = (MLIST.find(q => !(q.id in S)) || {}).c; cs.forEach((m, i) => { const f = cs.length > 1 ? .38 + .24 * i / (cs.length - 1) : .5,   /* middle of the road only: >= 40 px away from the node labels */ x = ax + (bx - ax) * f, y = ay + (by - ay) * f; const el = document.createElement('div'); const dn = m.id in S, prev = MLIST[MLIST.indexOf(m) - 1], lk = !dn && !(prev && prev.id in S) && capCh() < c;
      el.className = 'w4camp' + (dn ? ' done' : '') + (lk ? ' lk' : ''); el.dataset.c = c; el.dataset.i = i; el.dataset.k = cs.length; el.style.left = x + '%'; el.style.top = y + '%'; el.innerHTML = `<div class="ci">${dn ? '✓' : CIC[m.camp.k] || '⛺'}</div>${m === nextCamp ? `<small>${tt('w4_soldiers', { n: m.camp.n })}</small>` : ''}`;
      el.title = t(m.n); el.onclick = ev => { ev.stopPropagation(); const nd = ma.querySelector(`.nd[data-n="${c}"]`); if (nd) nd.click(); }; ma.appendChild(el); }); }
  try { window.__MAPL && window.__MAPL(); } catch (e) { console.warn(e); } }   /* map.js lays the markers out beside the road, clear of nodes / HUD */
// chapter card on the map: our host line above the mission list
function cardArmy() { const ml = document.querySelector('#map .card .ml'); if (!ml) return; let el = $('w4cardarmy'); if (!el) { el = document.createElement('div'); el.id = 'w4cardarmy'; el.style.cssText = 'margin:2px 0 4px;color:#ffe08a;font:700 12px/1.3 system-ui,sans-serif'; ml.before(el); } const s = '⚔ ' + tt('w4_army', { q: 40, b: W.men | 0 }); if (el.firstChild && el.firstChild.textContent !== s || !el.firstChild) { el.textContent = s; }
  // recommended power for the current chapter: green >= 80 % of the expected level (85 % of the cap), yellow >= 45 %, red below
  let pw = $('w4power'); if (!pw) { pw = document.createElement('div'); pw.id = 'w4power'; pw.style.cssText = 'margin:0 0 4px;font:700 12px/1.3 system-ui,sans-serif'; ml.before(pw); } const cc = Math.max(1, (MLIST.find(q => !(q.id in stars())) || { c: capCh() }).c || 1), r = ((lvl('sword') + lvl('armor')) / 2) / expLv(cc), st = r >= .8 ? 'ok' : r >= .45 ? 'mid' : 'low', col = { ok: '#7fe08a', mid: '#ffd24a', low: '#ff6a55' }[st], tx2 = '● ' + tt('w4_power', { s: tt('w4_pw_' + st) }); if (pw.textContent !== tx2) { pw.textContent = tx2; pw.style.color = col; pw.className = 'w4pw-' + st; } }
let mapObs = null;
function mapHook() { const m = $('map'); if (!m || mapObs) return; mapObs = new MutationObserver(() => { if (m.classList.contains('on')) { try { campMarks(); mapBtn(); } catch (e) { console.warn(e); } } }); mapObs.observe(m, { attributes: true, attributeFilter: ['class'] }); if (m.classList.contains('on')) { campMarks(); mapBtn(); } }

// ================================================================ loop + public API
const TOUCH = (() => { try { return matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window; } catch (e) { return false; } })();
let lastT = 0;
function loop() { requestAnimationFrame(loop); try { hookMeta(); mapHook();
    const p = P(); const gt = G.time || 0, dt = clamp(gt - lastT, 0, .1); lastT = gt;
    hudTick(); bufTick(); bodyCap(); if (!G.paused) bossTick(); if (p) volleyTick(p);
    if (G.mis && G.mis.started && RUN.m !== G.mis) armyStart();
    { const dd = !!(p && p.dead); if (RUN.pDead && !dd && p && G.mis === RUN.m) { try { armyRetry(); } catch (e) { console.warn('[w4 retry]', e); } } RUN.pDead = dd; }
    if (G.mis) entTick(); chip(); if (!G.paused) { rockTick(dt); propTick(dt); coinTick(dt); ctxTick(dt); }
    const e = $('end'); if (e && e.classList.contains('on')) endBtn(); const mp = $('map'); if (mp && mp.classList.contains('on')) cardArmy();
    const ct = $('w4ctl'); if (ct) { const on = !!(p && !G.paused && $('hud') && $('hud').classList.contains('on') && G.mis && G.mis.started && !archOn() && (!TOUCH || (G.time - (G.mis.t0 || 0)) < 10) && !$('tuc'));   /* touch: first 10 s only; mouse / keyboard: always */ ct.style.display = on ? 'block' : 'none'; if (on && ct._l !== lang) { ct._l = lang; ct.textContent = tt('tu4_ctl'); } }
  } catch (e) { if (!loop.w) { loop.w = 1; console.warn('[w4]', e); } } }
// bench #5: at low quality at most 26 bodies are drawn (the nearest to her; the boss, duel partner and captains always); ?perf=1 shows fps / bodies / draw calls / triangles
const PERF = /[?&]perf=1/.test(location.search); let capT = 0, perfEl = null, capN = 0;
function bodyCap() { const now = performance.now(); if (now < capT) return; capT = now + 400; const p = P(); if (!p) return; const low = SET && SET.q === 0, L = [];
  for (const e of G.ents) { if (e === p || e.gone || !e.o) continue; if (e.w4hid) { e.w4hid = 0; e.o.visible = true; } if (!e.o.visible) continue; const keep = e === G.boss || e.duel || e.hunt || e.lead || e.vict || e.w4cat; L.push([keep ? -1 : hyp(e.x - p.x, e.z - p.z) + (e.dead ? 40 : e.team === 'enemy' ? 0 : 10), e]   /* corpses go first, then far allies; a living enemy is hidden last */); }
  capN = L.length; if (low && L.length > 25) { L.sort((a, b) => a[0] - b[0]); let n = 25; for (let i = 25; i < L.length; i++) { const e = L[i][1]; if (!e.dead && (e.team === 'enemy' || L[i][0] < 14)) { n++; continue; } e.w4hid = 1; e.o.visible = false; } capN = n; }   /* QA 2b: a living enemy and anybody within 14 m is never hidden — only far corpses and distant allies */
  if (PERF) { if (!perfEl) { perfEl = document.createElement('div'); perfEl.id = 'w4perf'; perfEl.style.cssText = 'position:fixed;left:50%;bottom:2px;transform:translateX(-50%);z-index:99;pointer-events:none;font:700 11px/1.2 monospace;color:#9f9;background:rgba(0,0,0,.55);padding:2px 6px;border-radius:4px'; document.body.appendChild(perfEl); }
    const ri = renderer.info.render; perfEl.textContent = (G.fps || 0).toFixed(0) + ' fps · ' + (capN + 1) + '/' + (G.ents.length) + ' bodies · ' + ri.calls + ' calls · ' + Math.round(ri.triangles / 1000) + 'k tris · q' + SET.q; } }
// bench #3: with no ad provider every "Reklama" reward button is hidden (engine ADS.rewarded() returns false then)
const adsOn = () => !!((window.ysdk && window.ysdk.adv) || (window.QQ_ADS && window.QQ_ADS.rewarded));
{ const st = document.createElement('style'); st.id = 'w4noadscss'; st.textContent = 'body.w4noads #drevive,body.w4noads #eadx2,body.w4noads #shad{display:none!important}#btns #bA.dn,#btns #bD.dn,#btns #bP.dn{transform:scale(.92);filter:brightness(1.25)}@media (pointer:coarse){#btns .ab .k,#btns .ab kbd{display:none!important}}#w4upb.w4hot{animation:w4hot 1.1s ease-in-out infinite;box-shadow:0 0 0 2px #ffd24a,0 0 14px rgba(255,200,60,.8)}@keyframes w4hot{50%{filter:brightness(1.35)}}'; document.head.appendChild(st); setInterval(() => { try { document.body.classList.toggle('w4noads', !adsOn()); } catch (e) { } }, 1000); document.body.classList.toggle('w4noads', !adsOn()); }
hudInit(); loop();
window.__W4 = { why: () => amulet.why, W, save, cap, capCh, capOf, lvl, cost, attack, dodge, amulet, strong, threat, rangedTargets, pickPower, catapult, catProp, lob, cavalry, paneHTML, upOpen, upClose, foeHpK, foeDmK, defi, arrowsN, RUN, campMarks, TX };
