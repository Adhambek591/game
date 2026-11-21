# Qırq qız (Unity): to'liq tahlil, baho va 10/10 ga to'sqinliklar (2026-11-22)

## 1. Qaysi o'yinlar bilan solishtirildi va har biridan aniq nima olindi

| O'yin | Undan olingan narsa | Qayerda (kod) |
|---|---|---|
| **Witcher 3 (Vedmak)** | O'yinchilarning eng ko'p tanqidi: "suzib yurgandek", tugma kech javob beradi. Undan saboq: bosilgan tugma eslab qolinadi (zarba paytida bosilsa keyingi zarba chiqadi); chetlanish zarbani istalgan payt to'xtatadi. Witcher'ning adrenalini kabi har tekkan zarba tumor quvvatini to'ldiradi. Bosslar ikki bosqichli (Witcher bosslari kabi g'azablanadi). | QQPlayer: `bufT`, roll-cancel, `amuletCd -= .35f*hits`; QQAI: `phase2` |
| **Batman Arkham** | Dushman zarba berishidan oldin boshi ustida oltin "!" chiqadi, shu payt "Chetlan" = qarshi zarba (bir nechta dushmanga birdaniga). Hujum 7 metrgacha bo'lgan dushmanga sakrab yetadi, joystik yo'nalishi nishonni tanlaydi. "N zarba ketma-ket" hisoblagichi, oxirgi dushmanda sekinlashuv. | QQPlayer: `Dodge()` (counter), `PickTarget`, lunge; QQHud: marks, combo |
| **Ghost of Tsushima** | Dushmanlar bittadan hujum qiladi (bir vaqtda 2–3 tasi), qolganlari aylanib navbat kutadi. Olomon kelganda kamera uzoqlashadi. Yashirincha o'tish (3-bob): orqadan bir zarba bilan yiqitish. | Unit: `hasToken`; QQCam: zoom; QQMission: `Sentry`, silent takedown |
| **Sekiro / Bayonetta** | Qizil "!!" bilan belgilangan zarbani qaytarib bo'lmaydi, faqat chetlanish kerak. O'z vaqtida chetlansangiz vaqt sekinlashadi. | QQPlayer: `unblockable`, `SlowMo` |
| **Street Fighter / Avowed** | Hit-stop: zarba tekkanda dunyo 0,05–0,12 soniyaga to'xtaydi. Kamera silkinadi, zarba olgan dushman bir lahza yorishadi. | QQFeel: `HitStop`; Unit: flash |
| **Assassin's Creed / Uncharted** | Yugurganda tana burilishga og'adi, bosh yaqindagi dushmanga buriladi. To'n va o'rimlar prujina fizikasi bilan harakatlanadi. | QQRig: lean, lookAt; QQSpring |
| **Diablo Immortal / Genshin** | Mobil uchun avtomatik nishon olish, 3 ta katta tugma, qisqa missiyalar. Bitta valyuta, reklama yo'q. | QQHud, QQProgress |
| **Clash of Clans** | Jangdan keyin tanga va 3 ta yangilanish, har jangning o'z chegarasi bor. Kuchini oshirmagan o'yinchi yutqazadi (muallif qoidasi, sinovda tasdiqlandi). | QQProgress, end panel |
| **Mount & Blade** | Qutqarilgan erkaklar qo'shiningizga qo'shiladi. Buyruq menyusi yo'q, chunki o'yinchilar uni chalkash deb tanqid qilishgan; muallifning 3 tugma qoidasi to'g'ri. | QQMission: captives → "batır" |
| **Shadow Fight 3** | Kuchli zarbada orqaga qaytish va og'irlik hissi. | Unit: knockback, Impulse |

## 2. Hozirgi baho (o'ynab ko'rish bo'yicha, 10 ballik)

| Yo'nalish | Baho | Nima yaxshi | Nima 10 ga yetkazmayapti |
|---|---|---|---|
| Jang hissi | **7,5** | hit-stop, kontr, kombo, boss bosqichlari, navbat bilan hujum | qilich dushman tanasiga "kirmaydi" (tananing qismlariga qarab zarba yo'q), qalqon va blok yo'q |
| Animatsiya | **6,5** | mocap, zarba kadri o'lchangan, tayyorlanish, to'n va soch fizikasi, oyoq sirpanmaydi (bugun tuzatildi) | faqat 16 ta klip, hamma bir xil harakat qiladi; ayol uchun alohida harakatlar yo'q; o'lim va yiqilish fizikasi (ragdoll) yo'q; yuz mimikasi yo'q |
| Personajlar | **6** | Higgsfield dizaynlari, haqiqiy qo'llar, qatlamli to'n | Meshy yuzi rasm, yaqin kadrda plastmassadek; qalmoq askarlari eski modellarda |
| Muhit | **6,5** | 3 xil kayfiyat (oqshom, peshin, kecha), olov, tutun, tepaliklar | o'tovlar va yer past detalli, o't-o'lan shamolda qimirlamaydi, suv oddiy |
| UI va dizayn | **7,5** | brauzer uslubi, shriftlar, portretlar, lentalar | menyu ekrani va xarita yo'q |
| Ovoz | **6,5** | 40+ effekt, musiqa, qo'shiqchi ovozi | qadam ovozi va qurolga qarab farqlanadigan ovozlar yo'q |
| Kontent | **5** | 3 bob, har biri boshqa mexanika (qutqaruv, karvon, yashirincha o'tish), 3 boss | 4–7-boblar, ot qismlari, bo'rilar yo'q |
| **Umumiy** | **≈6,5** | Bir hafta oldin 4 edi | |

## 3. 10 ga to'sqinlik qilayotgan asosiy narsalar (muhimlik tartibida)
1. **Animatsiya kutubxonasi kichik (16 klip).** AAA o'yinlarda 300–1000 ta klip bo'ladi. Yechim: qo'shimcha mocap kerak (Mixamo, Unity Asset Store paketlari yoki Higgsfield motion-capture). Shunda qilich kombolari, ayol yurishi, yiqilish va otda yurish paydo bo'ladi.
2. **Yuzlar.** Meshy yuzi faqat rasm. Yechim: MPFB yuzi va blendshape (mimika), yoki Higgsfield'dan yuz uchun alohida model.
3. **Kontent:** 4–7-boblar, ot qismlari, bo'rilar (to'rt oyoqli rig).
4. **Muhit detallari:** shamolda qimirlaydigan o'tlar, yaxshiroq suv, yer relyefi (tepaliklar ichida jang).
5. **Qalmoq askarlari:** Higgsfield'da 2–3 dizayn kerak (kredit oladi, muallif ruxsati kerak).

## 4. Bugun tuzatilganlar
- **Oyoq sirpanishi:** yurish va yugurish kliplarining haqiqiy tezligi oyoq harakatidan o'lchandi (yurish 0,80 m/s, yugurish 3,78 m/s). Animatsiya tezligi harakat tezligiga moslandi, oyoqlar endi yerda sirpanmaydi.
- **Olomon bir xil harakat qilmaydi:** har bir jangchi klipni o'z fazasidan va biroz boshqa tezlikda boshlaydi (muallifning "bir xil harakatlanmasin" qoidasi).
- **Orqa (rim) yorug'lik:** personaj silueti yerdan ajralib turadi.
- **Osmondagi quyosh** mos yozuvga ulanmagan edi (eski xato), endi tuzatildi.
