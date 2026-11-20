# inserts the archery strings (ar_*) into js/i18n.js after each language's opening line; idempotent
import re,sys
P='/home/user/website-5ef0831fd120367c52df72c9/app/public/js/i18n.js'
S={
'en':dict(
ar_n_3="Camp across the river",ar_o_3="Silence the camp's 6 sentries with your bow without raising the alarm",
ar_n_5="The Darbent wall",ar_o_5="Cover the maidens sneaking to the wall gate — shoot every guard who spots them",
ar_n_6="Before the Qashal gate",ar_o_6="Take down the eastern wall sentries, stop the beacon keeper, then cut the ropes to drop the gate",
ar_s_noal="No alarm raised",ar_s_cap="The camp captain fell too",ar_s_west="Western wall cleared too, beacon never lit",
ar_alarm="ALARM! The horn has sounded!",ar_rush="They are running for you — stop them!",ar_head="Headshot!",ar_kill="Down!",ar_miss="Missed — they heard it",
ar_noarrow="Out of arrows",ar_skip="Tap to skip",ar_cam="Arrow cam",ar_found="They found your hiding place!",ar_cap="Captain",
ar_capt="The camp captain has come out — a bonus target",ar_capt2="The captain is still alive — take him for the third star",
ar_t1="Drag to look around",ar_t2="Hold 🏹 to draw the bow and aim, release to shoot",ar_t3="Arrows drop: put the pin for the distance (50–150 m) on the target",
ar_t4="Lead walking guards and allow for the wind",ar_t5="Hold 🫁 to hold your breath — the sight steadies",
ar_beacon="The beacon keeper is running to light the fire!",ar_lit="The beacon is lit — Qashal is warned!",ar_ropes="Now cut the two ropes holding the gate bridge",
ar_rope="Rope cut!",ar_gate="The gate is down — maidens, forward!",ar_go="Forward!",ar_mgo="The maidens are in cover — tap «Forward!» when the way is clear",
ar_spot="A guard is spotting the maidens — shoot him!",ar_mlost="A maiden was caught!",ar_mallost="All the maidens were caught",
ar_d3a="The camp is just across the river. If one sentry blows his horn, the whole camp wakes. One arrow — one sentry.",
ar_d3b="The two by the fire never stop talking. Take them one right after the other.",
ar_d5a="The maidens will slip along the cliff to the little gate. I watch from the ledge — no guard who sees them lives.",
ar_d6a="That fire on the gate tower is a beacon. If it burns, all Qashal comes running. Then the ropes — and the bridge is ours.",
ar_d6b="The maidens wait below the wall. Give the signal, Gúlayım."),
'ru':dict(
ar_n_3="Лагерь за рекой",ar_o_3="Бесшумно сними из лука 6 часовых лагеря, не поднимая тревоги",
ar_n_5="Стена Дарбента",ar_o_5="Прикрой девушек, крадущихся к воротам, — стреляй в каждого стража, который их заметит",
ar_n_6="У ворот Кашала",ar_o_6="Сними часовых восточной стены, не дай зажечь сигнальный огонь, затем перебей канаты моста ворот",
ar_s_noal="Тревога не поднята",ar_s_cap="Сотник лагеря тоже сражён",ar_s_west="Западная стена тоже чиста, огонь не зажжён",
ar_alarm="ТРЕВОГА! Затрубил рог!",ar_rush="Они бегут к тебе — останови их!",ar_head="В голову!",ar_kill="Готов!",ar_miss="Промах — они услышали",
ar_noarrow="Стрелы кончились",ar_skip="Нажми, чтобы пропустить",ar_cam="Камера стрелы",ar_found="Тебя обнаружили!",ar_cap="Сотник",
ar_capt="Вышел сотник лагеря — бонусная цель",ar_capt2="Сотник ещё жив — сними его ради третьей звезды",
ar_t1="Проведи пальцем, чтобы осмотреться",ar_t2="Удерживай 🏹 — натянуть лук и прицелиться, отпусти — выстрел",ar_t3="Стрела падает: наведи метку нужной дальности (50–150 м) на цель",
ar_t4="Бери упреждение на идущих и учитывай ветер",ar_t5="Удерживай 🫁 — задержи дыхание, прицел успокоится",
ar_beacon="Сигнальщик бежит зажечь огонь!",ar_lit="Сигнальный огонь зажжён — Кашал предупреждён!",ar_ropes="Теперь перебей два каната, держащих мост ворот",
ar_rope="Канат перебит!",ar_gate="Мост рухнул — девушки, вперёд!",ar_go="Вперёд!",ar_mgo="Девушки в укрытии — нажми «Вперёд!», когда путь свободен",
ar_spot="Страж замечает девушек — стреляй!",ar_mlost="Девушку схватили!",ar_mallost="Всех девушек схватили",
ar_d3a="Лагерь прямо за рекой. Если хоть один часовой затрубит, проснётся весь лагерь. Одна стрела — один часовой.",
ar_d3b="Те двое у костра болтают без умолку. Снимай их одного за другим, без паузы.",
ar_d5a="Девушки проберутся вдоль скалы к малым воротам. Я смотрю с уступа — ни один страж, что их увидит, не уцелеет.",
ar_d6a="Огонь на надвратной башне — сигнальный. Если он загорится, сбежится весь Кашал. Потом канаты — и мост наш.",
ar_d6b="Девушки ждут под стеной. Дай сигнал, Гулайым."),
'uz':dict(
ar_n_3="Daryo ortidagi qarorgoh",ar_o_3="Qarorgohning 6 soqchisini kamon bilan, xavf signalini chaldirmay yo'q qiling",
ar_n_5="Darbent devori",ar_o_5="Darvozaga yashirincha borayotgan qizlarni qo'riqlang — ularni ko'rgan har bir soqchini oting",
ar_n_6="Qashal darvozasi oldida",ar_o_6="Sharqiy devor soqchilarini yo'q qiling, belgi olovini yoqtirmang, so'ng arqonlarni uzib darvozani tushiring",
ar_s_noal="Xavf signali chalinmadi",ar_s_cap="Qarorgoh yuzboshisi ham yiqildi",ar_s_west="G'arbiy devor ham tozalandi, olov yoqilmadi",
ar_alarm="XAVF! Karnay chalindi!",ar_rush="Ular sizga yugurib kelmoqda — to'xtating!",ar_head="Boshga!",ar_kill="Yiqildi!",ar_miss="Tegmadi — ular eshitdi",
ar_noarrow="O'qlar tugadi",ar_skip="O'tkazish uchun bosing",ar_cam="O'q kamerasi",ar_found="Yashiringan joyingizni topishdi!",ar_cap="Yuzboshi",
ar_capt="Qarorgoh yuzboshisi chiqdi — qo'shimcha nishon",ar_capt2="Yuzboshi hali tirik — uchinchi yulduz uchun uni oting",
ar_t1="Atrofga qarash uchun barmog'ingizni suring",ar_t2="🏹 ni bosib turing — kamon tortiladi, qo'yib yuboring — otiladi",ar_t3="O'q pastlaydi: masofa belgisini (50–150 m) nishonga to'g'rilang",
ar_t4="Yurayotgan soqchining oldiga oling, shamolni ham hisobga oling",ar_t5="🫁 ni bosib turing — nafasingizni to'xtatasiz, nishon barqarorlashadi",
ar_beacon="Belgi olovchisi olov yoqishga yugurmoqda!",ar_lit="Belgi olovi yondi — Qashal ogohlantirildi!",ar_ropes="Endi darvoza ko'prigini ushlab turgan ikki arqonni uzing",
ar_rope="Arqon uzildi!",ar_gate="Darvoza tushdi — qizlar, oldinga!",ar_go="Oldinga!",ar_mgo="Qizlar panada — yo'l bo'shaganda «Oldinga!» ni bosing",
ar_spot="Soqchi qizlarni ko'ryapti — uni oting!",ar_mlost="Bir qiz qo'lga tushdi!",ar_mallost="Hamma qizlar qo'lga tushdi",
ar_d3a="Qarorgoh daryoning narigi betida. Bitta soqchi karnay chalsa, butun qarorgoh uyg'onadi. Bitta o'q — bitta soqchi.",
ar_d3b="Gulxan yonidagi ikkisi gapdan to'xtamaydi. Birini otishingiz bilan darhol ikkinchisini oting.",
ar_d5a="Qizlar qoya bo'ylab kichik darvozaga yashirincha boradi. Men qirdan kuzataman — ularni ko'rgan soqchi tirik qolmaydi.",
ar_d6a="Darvoza minorasidagi olov — belgi olovi. U yonsa, butun Qashal yugurib keladi. Keyin arqonlar — ko'prik bizniki.",
ar_d6b="Qizlar devor ostida kutib turibdi. Belgi bering, Guloyim."),
'qq':dict(
ar_n_3="Dáryanıń arǵı betindegi lager",ar_o_3="Lagerdiń 6 saqshısın sadaq penen, dabıl kótertpey joq etiń",
ar_n_5="Darbent diywalı",ar_o_5="Dárwazaǵa jasırın baratırǵan qızlardı qorǵań — olardı kórgen hár bir saqshını atıń",
ar_n_6="Qashal dárwazası aldında",ar_o_6="Shıǵıs diywaldıń saqshıların joq etiń, belgi otın jaqtırmań, keyin arqanlardı úzip dárwazanı túsiriń",
ar_s_noal="Dabıl kóterilmedi",ar_s_cap="Lagerdiń júzbası da jıǵıldı",ar_s_west="Batıs diywal da tazalandı, belgi otı janbadı",
ar_alarm="DABÍL! Kerney shalındı!",ar_rush="Olar sizge qaray juwırıp kiyatır — toqtatıń!",ar_head="Basqa tiydi!",ar_kill="Jıǵıldı!",ar_miss="Tiymedi — olar estidi",
ar_noarrow="Oqlar tawsıldı",ar_skip="Ótkiziw ushın basıń",ar_cam="Oq kamerası",ar_found="Jasırınǵan jerińizdi tawıp aldı!",ar_cap="Júzbası",
ar_capt="Lagerdiń júzbası shıqtı — qosımsha nıshan",ar_capt2="Júzbası ele tiri — úshinshi juldız ushın onı atıń",
ar_t1="Átirapqa qaraw ushın barmaǵıńızdı súyreń",ar_t2="🏹 túymesin basıp turıń — sadaq tartıladı, jiberseńiz — atıladı",ar_t3="Oq tómenleydi: aralıq belgisin (50–150 m) nıshanǵa tuwrılań",
ar_t4="Júrip baratırǵan saqshınıń aldına qaratıń, samaldı da esapqa alıń",ar_t5="🫁 túymesin basıp turıń — demińizdi tutasız, nıshan tınıshlanadı",
ar_beacon="Belgi otın jaǵıwshı otqa qaray juwırıp baratır!",ar_lit="Belgi otı janıp ketti — Qashal xabar taptı!",ar_ropes="Endi dárwaza kópirin uslap turǵan eki arqandı úziń",
ar_rope="Arqan úzildi!",ar_gate="Dárwaza tústi — qızlar, alǵa!",ar_go="Alǵa!",ar_mgo="Qızlar panada — jol ashıq bolǵanda «Alǵa!» túymesin basıń",
ar_spot="Saqshı qızlardı kórip atır — onı atıń!",ar_mlost="Bir qız qolǵa tústi!",ar_mallost="Barlıq qızlar qolǵa tústi",
ar_d3a="Lager dáryanıń arǵı betinde. Bir saqshı kerney shalsa, pútkil lager oyanadı. Bir oq — bir saqshı.",
ar_d3b="Ot basındaǵı ekewi gápten tınbaydı. Birin atqannan keyin dárhal ekinshisin atıń.",
ar_d5a="Qızlar jartas boylap kishi dárwazaǵa jasırın baradı. Men qırdan qarap turaman — olardı kórgen saqshı tiri qalmaydı.",
ar_d6a="Dárwaza minarasındaǵı ot — belgi otı. Ol jansa, pútkil Qashal juwırıp keledi. Keyin arqanlar — kópir bizdiki.",
ar_d6b="Qızlar diywal astında kútip tur. Belgi beriń, Gúlayım."),
}
s=open(P).read()
if 'ar_n_3:' in s: print('already'); sys.exit(0)
for lang,d in S.items():
    head=lang+': {\n'; assert s.count(head)==1,(lang,s.count(head))
    line=' // archery sniper mode (js/archery.js, archery agent)\n '+', '.join(f'{k}:"{v}"' for k,v in d.items())+',\n'
    assert '"' not in ''.join(d.values())
    s=s.replace(head,head+line,1)
open(P,'w').write(s); print('inserted')
