# Modellar va animatsiya tekshiruvi (2026-11-21)

## Topilgan muammolar
1. **Meshy modellari yaxlit qobiq.** Ichida tana yo'q: son suyagidan 8 sm radiusda birorta ham nuqta topilmadi. To'n bilan oyoq, soch bilan orqa bitta sirt. Natijada to'n son bilan birga taxtadek ko'tariladi, soch qimirlamaydi.
2. **Weight paint texnik jihatdan toza:** har nuqtada 4 tagacha ta'sir, og'irliklar normallashgan, og'irliksiz nuqta yo'q.
3. **Zarba vaqti noto'g'ri edi.** O'yin kliplarning faqat boshini ko'rsatardi: zarar qilich tushishidan oldin berilardi.

## Nima qilindi
- **Vaqt (9-prinsip):** har bir klipning tayyorlanish, zarba va qaytish kadrlari qo'l tezligidan o'lchandi (QQSetup.ClipTiming). Zarar aynan zarba kadrida beriladi.
- **Tayyorlanish va sekin kirish/chiqish (2- va 6-prinsiplar):** zarba sekin boshlanib, tezlashib tushadi, keyin silliq tugaydi.
- **Qatlamli personajlar (tools/blender/layered.py):**
  - to'n etak chizig'idan oyoqdan ajratildi va sonni ko'rsatadigan yoriqlardan kesildi;
  - to'n beldan pastda 8×3 suyakli zanjirga bog'landi;
  - ostiga shim qo'shildi: oyoq naychalari va chanoq qismi, rangi etak ostidagi matodan olindi;
  - o'rimlar qobiqdan olib tashlandi va 5 suyakli alohida naycha qilib qayta yasaldi.
- **Prujinali suyaklar (QQSpring.cs, 5- va 8-prinsiplar):**
  - inersiya, dam olish holatiga qaytish va og'irlik kuchi bor;
  - son, boldir va umurtqa kapsulalari bilan to'qnashuv hisoblanadi;
  - natija: yugurganda to'n orqaga hilpiraydi, hamlada ochiladi, aylanma zarbada etak yoyiladi.

## Rad etilgan tajriba
- tools/blender/secondary.py: qobiqning og'irligini qayta taqsimlash to'nni yirtdi, soch suyaklari orqa sirtni pardadek cho'zdi. O'yinga qo'shilmadi.

## Tekshirish vositalari
- tools/blender/rig_audit.py: og'irlik statistikasi, issiqlik xaritalari, ekstremal pozalar.
- QQSetup.ClipSheet: har bir klipdan 8 ta kadr (skin bake qilingan, edit-mode kechikishisiz).
- QQSetup.SimSheet: prujinali suyaklar vaqt bo'yicha simulyatsiya qilinadi.
