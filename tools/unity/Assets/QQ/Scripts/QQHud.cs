// Touch HUD built in code: joystick (left), Attack / Dodge / Amulet (right), HP bar, objective, toast, end panel.
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

public class QQHud : MonoBehaviour
{
    public static Vector2 Move; public static bool PointerOverUI;
    static QQHud I; Text objective, toast, endTitle, endSub, chain, bossName, coinTxt, againTxt; Text[] upTxt = new Text[3]; Image[] upImg = new Image[3]; Image hpFill, amuletFill, dodgeFill, bossFill; GameObject endPanel, bossBar; float toastT, chainPop;
    RectTransform root; readonly System.Collections.Generic.List<Text> marks = new System.Collections.Generic.List<Text>();
    static Font font; static Sprite circle;

    public static void Build()
    {
        if (I) return;
        if (!Object.FindFirstObjectByType<EventSystem>()) { var es = new GameObject("EventSystem", typeof(EventSystem), typeof(UnityEngine.InputSystem.UI.InputSystemUIInputModule)); }
        var go = new GameObject("HUD", typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
        var cv = go.GetComponent<Canvas>(); cv.renderMode = RenderMode.ScreenSpaceOverlay; cv.sortingOrder = 10;
        var cs = go.GetComponent<CanvasScaler>(); cs.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize; cs.referenceResolution = new Vector2(1280, 720); cs.matchWidthOrHeight = .6f;
        I = go.AddComponent<QQHud>(); I.Make(go.transform);
    }

    static Sprite Circle()
    {
        if (circle) return circle; const int S = 128; var tx = new Texture2D(S, S, TextureFormat.RGBA32, false);
        for (int y = 0; y < S; y++) for (int x = 0; x < S; x++) { float d = Vector2.Distance(new Vector2(x, y), new Vector2(S / 2f, S / 2f)) / (S / 2f); tx.SetPixel(x, y, new Color(1, 1, 1, Mathf.Clamp01((1 - d) * 24f))); }
        tx.Apply(); return circle = Sprite.Create(tx, new Rect(0, 0, S, S), new Vector2(.5f, .5f));
    }

    static RectTransform Rect(Transform p, string n, Vector2 anchor, Vector2 pos, Vector2 size)
    {
        var g = new GameObject(n, typeof(RectTransform)); g.transform.SetParent(p, false); var r = (RectTransform)g.transform;
        r.anchorMin = r.anchorMax = anchor; r.pivot = new Vector2(.5f, .5f); r.anchoredPosition = pos; r.sizeDelta = size; return r;
    }
    static Image Img(RectTransform r, Color c, bool round) { var i = r.gameObject.AddComponent<Image>(); i.color = c; if (round) i.sprite = Circle(); return i; }
    static Text Txt(RectTransform r, string s, int size, TextAnchor a)
    {
        if (!font) font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        var t = r.gameObject.AddComponent<Text>(); t.font = font; t.text = s; t.fontSize = size; t.alignment = a; t.color = Color.white; t.raycastTarget = false;
        var o = r.gameObject.AddComponent<Outline>(); o.effectColor = new Color(0, 0, 0, .7f); o.effectDistance = new Vector2(2, -2); return t;
    }

    void Make(Transform root)
    {
        this.root = (RectTransform)root;
        // joystick
        var jb = Rect(root, "joy", new Vector2(0, 0), new Vector2(190, 190), new Vector2(240, 240)); Img(jb, new Color(1, 1, 1, .12f), true);
        var knob = Rect(jb, "knob", new Vector2(.5f, .5f), Vector2.zero, new Vector2(100, 100)); Img(knob, new Color(1, 1, 1, .45f), true);
        jb.gameObject.AddComponent<QQStick>().knob = knob;

        // buttons
        var atk = Button(root, "Hujum", new Vector2(-170, 170), 170, new Color(.75f, .2f, .15f, .85f));
        var ev = atk.gameObject.AddComponent<QQPress>(); ev.down = () => { if (QQPlayer.I) QQPlayer.I.AttackDown(); }; ev.up = () => { if (QQPlayer.I) QQPlayer.I.AttackUp(); };
        var dg = Button(root, "Chetlan", new Vector2(-370, 110), 120, new Color(.2f, .45f, .8f, .85f)); dodgeFill = Fill(dg);
        dg.gameObject.AddComponent<QQPress>().down = () => { if (QQPlayer.I) QQPlayer.I.Dodge(); };
        var am = Button(root, "Tumor", new Vector2(-150, 380), 120, new Color(.85f, .65f, .15f, .85f)); amuletFill = Fill(am);
        am.gameObject.AddComponent<QQPress>().down = () => { if (QQPlayer.I) QQPlayer.I.Amulet(); };

        // hp bar
        var hb = Rect(root, "hp", new Vector2(0, 1), new Vector2(230, -40), new Vector2(380, 22)); Img(hb, new Color(0, 0, 0, .55f), false);
        var hf = Rect(hb, "fill", new Vector2(0, .5f), new Vector2(0, 0), new Vector2(376, 18)); hf.pivot = new Vector2(0, .5f); hf.anchoredPosition = new Vector2(2, 0);
        hpFill = Img(hf, new Color(.35f, .75f, 1f), false);
        var nm = Rect(root, "name", new Vector2(0, 1), new Vector2(230, -72), new Vector2(380, 30)); Txt(nm, "Gúlayım", 24, TextAnchor.MiddleLeft);

        objective = Txt(Rect(root, "obj", new Vector2(.5f, 1), new Vector2(0, -40), new Vector2(800, 40)), "", 28, TextAnchor.MiddleCenter);
        toast = Txt(Rect(root, "toast", new Vector2(.5f, .5f), new Vector2(0, 160), new Vector2(980, 60)), "", 38, TextAnchor.MiddleCenter); toast.verticalOverflow = VerticalWrapMode.Overflow;

        // combo counter (right edge, under the objective) and boss bar (top centre)
        chain = Txt(Rect(root, "chain", new Vector2(1, 1), new Vector2(-150, -120), new Vector2(260, 80)), "", 44, TextAnchor.MiddleCenter);
        var bb = Rect(root, "boss", new Vector2(.5f, 1), new Vector2(0, -100), new Vector2(560, 18)); Img(bb, new Color(0, 0, 0, .6f), false); bossBar = bb.gameObject;
        var bf = Rect(bb, "fill", new Vector2(0, .5f), Vector2.zero, new Vector2(556, 14)); bf.pivot = new Vector2(0, .5f); bf.anchoredPosition = new Vector2(2, 0); bossFill = Img(bf, new Color(.85f, .2f, .15f), false);
        bossName = Txt(Rect(bb, "n", new Vector2(.5f, 1), new Vector2(0, 16), new Vector2(560, 30)), "", 24, TextAnchor.MiddleCenter);
        bossBar.SetActive(false);

        // end panel
        var ep = Rect(root, "end", new Vector2(.5f, .5f), Vector2.zero, new Vector2(780, 540)); Img(ep, new Color(.08f, .06f, .05f, .88f), false); endPanel = ep.gameObject;
        endTitle = Txt(Rect(ep, "t", new Vector2(.5f, 1), new Vector2(0, -70), new Vector2(600, 70)), "", 52, TextAnchor.MiddleCenter);
        endSub = Txt(Rect(ep, "s", new Vector2(.5f, 1), new Vector2(0, -160), new Vector2(600, 90)), "", 26, TextAnchor.MiddleCenter);
        var rb = Rect(ep, "again", new Vector2(.5f, 0), new Vector2(0, 55), new Vector2(300, 70)); Img(rb, new Color(.75f, .2f, .15f, 1), false);
        againTxt = Txt(Rect(rb, "l", new Vector2(.5f, .5f), Vector2.zero, new Vector2(280, 70)), "Qaytadan", 30, TextAnchor.MiddleCenter);
        // upgrades: three cards, coins on top
        coinTxt = Txt(Rect(ep, "coins", new Vector2(.5f, 1), new Vector2(0, -225), new Vector2(700, 40)), "", 28, TextAnchor.MiddleCenter); coinTxt.color = new Color(1f, .85f, .35f);
        for (int i = 0; i < 3; i++)
        {
            int k = i; var cr = Rect(ep, "up" + i, new Vector2(.5f, 1), new Vector2(-240 + i * 240, -330), new Vector2(220, 120)); upImg[i] = Img(cr, new Color(.25f, .2f, .15f, 1), false);
            upTxt[i] = Txt(Rect(cr, "t", new Vector2(.5f, .5f), Vector2.zero, new Vector2(210, 110)), "", 22, TextAnchor.MiddleCenter);
            cr.gameObject.AddComponent<QQPress>().down = () => { if (QQProgress.Buy(k)) { QQFeel.Sfx("coin", null, 1f); RefreshShop(); } else QQFeel.Sfx("v_ui", null, .6f); };
        }
        rb.gameObject.AddComponent<QQPress>().down = () => UnityEngine.SceneManagement.SceneManager.LoadScene(UnityEngine.SceneManagement.SceneManager.GetActiveScene().buildIndex);
        endPanel.SetActive(false);
    }

    RectTransform Button(Transform root, string label, Vector2 pos, float size, Color c)
    {
        var r = Rect(root, label, new Vector2(1, 0), pos, new Vector2(size, size)); Img(r, c, true);
        Txt(Rect(r, "l", new Vector2(.5f, .5f), Vector2.zero, new Vector2(size, 40)), label, (int)(size * .16f), TextAnchor.MiddleCenter);
        return r;
    }
    Image Fill(RectTransform b)
    {
        var r = Rect(b, "cd", new Vector2(.5f, .5f), Vector2.zero, b.sizeDelta); var i = Img(r, new Color(0, 0, 0, .55f), true);
        i.type = Image.Type.Filled; i.fillMethod = Image.FillMethod.Radial360; i.fillClockwise = false; i.raycastTarget = false; return i;
    }

    public static void Objective(string s) { if (I) I.objective.text = s; }
    public static void Toast(string s, float dur = 1.6f) { if (I && I.toastT < 2f) { I.toast.text = s; I.toastT = dur; } }
    // first-time hints for the new mechanics (shown once per install)
    static void Hint(string key, string s) { if (PlayerPrefs.GetInt("qq_hint_" + key, 0) == 1 || !I) return; PlayerPrefs.SetInt("qq_hint_" + key, 1); PlayerPrefs.Save(); I.toastT = 0; Toast(s, 3.2f); }
    public static void End(bool win, string sub)
    {
        if (!I) return; I.endPanel.SetActive(true); I.endTitle.text = win ? "G'alaba!" : "Mag'lubiyat"; I.endTitle.color = win ? new Color(1f, .85f, .4f) : new Color(1f, .5f, .45f); foreach (var n in new[] { "joy", "Hujum", "Chetlan", "Tumor", "chain", "boss" }) { var c = I.root.Find(n); if (c) c.gameObject.SetActive(false); }
        I.endSub.text = sub; I.againTxt.text = win ? "Keyingi jang" : "Qaytadan"; I.RefreshShop();
    }
    void RefreshShop()
    {
        coinTxt.text = "Tanga: " + QQProgress.Coins + "     (" + QQProgress.Level + "-jang chegarasi: " + QQProgress.Cap + "-daraja)";
        for (int i = 0; i < 3; i++)
        {
            int lv = QQProgress.Upg(i); bool cap = lv >= QQProgress.Cap;
            upTxt[i].text = QQProgress.Names[i] + "  " + lv + "-daraja\n" + QQProgress.Info[i] + "\n" + (cap ? "chegara" : QQProgress.Cost(i) + " tanga");
            upImg[i].color = QQProgress.CanBuy(i) ? new Color(.45f, .32f, .12f, 1) : new Color(.22f, .19f, .16f, 1);
        }
    }

    void Update()
    {
        var p = QQArena.I ? QQArena.I.player : null;
        if (p) hpFill.rectTransform.sizeDelta = new Vector2(376 * Mathf.Clamp01(p.hp / p.maxHp), 18);
        if (QQPlayer.I) { amuletFill.fillAmount = 1 - QQPlayer.I.AmuletReady; dodgeFill.fillAmount = 1 - QQPlayer.I.DodgeReady; }
        if (toastT > 0) { toastT -= Time.unscaledDeltaTime; toast.color = new Color(1, .9f, .6f, Mathf.Clamp01(toastT * 2)); }
        PointerOverUI = EventSystem.current && EventSystem.current.IsPointerOverGameObject();

        // combo counter with a pop on every new hit
        var pl = QQPlayer.I; int c = pl ? pl.Chain : 0;
        if (c >= 3) { if (chain.text != c + " zarba") chainPop = .15f; chain.text = c + " zarba"; } else chain.text = "";
        chainPop = Mathf.Max(0, chainPop - Time.unscaledDeltaTime); chain.transform.localScale = Vector3.one * (1f + chainPop * 2.5f);
        chain.color = c >= 20 ? new Color(1f, .75f, .25f) : c >= 10 ? new Color(1f, .9f, .55f) : Color.white;

        // boss bar
        Unit boss = null; foreach (var o in Unit.All) if (o.boss && !o.Dead) { boss = o; break; }
        bossBar.SetActive(boss && !endPanel.activeSelf); if (boss) { bossFill.rectTransform.sizeDelta = new Vector2(556 * Mathf.Clamp01(boss.hp / boss.maxHp), 14); bossName.text = boss.displayName; }

        // telegraph marks over foes about to strike Gúlayım: gold = counter with Dodge, red = unblockable, roll away
        int n = 0; var cam = Camera.main;
        if (cam && p)
            foreach (var o in Unit.All)
            {
                if (o.Dead || o.team != 1 || o.telegraph <= 0 || o.swingAt != p) continue;
                Vector3 sp = cam.WorldToScreenPoint(o.transform.position + Vector3.up * (o.boss ? 3.1f : 2.3f)); if (sp.z < 0) continue;
                if (n >= marks.Count) { var r = Rect(root, "mark", Vector2.zero, Vector2.zero, new Vector2(80, 80)); var t = Txt(r, "", 64, TextAnchor.MiddleCenter); t.fontStyle = FontStyle.Bold; marks.Add(t); }
                var mk = marks[n++]; mk.gameObject.SetActive(true);
                Vector2 lp; RectTransformUtility.ScreenPointToLocalPointInRectangle(root, sp, null, out lp); mk.rectTransform.anchorMin = mk.rectTransform.anchorMax = new Vector2(.5f, .5f); mk.rectTransform.anchoredPosition = lp;
                if (o.unblockable) Hint("red", "Qizil !! — qaytarib bo'lmaydi: «Chetlan» bilan qoching"); else Hint("gold", "Oltin ! — shu payt «Chetlan» bosing: zarbani qaytarasiz");
                mk.text = o.unblockable ? "!!" : "!"; mk.color = o.unblockable ? new Color(1f, .25f, .2f) : new Color(1f, .85f, .3f);
                mk.transform.localScale = Vector3.one * (1f + .3f * Mathf.Sin(Time.unscaledTime * 30f));
            }
        for (int i = n; i < marks.Count; i++) marks[i].gameObject.SetActive(false);
    }
}

public class QQPress : MonoBehaviour, IPointerDownHandler, IPointerUpHandler
{
    public System.Action down, up;
    public void OnPointerDown(PointerEventData e) { if (down != null) down(); transform.localScale = Vector3.one * .92f; }
    public void OnPointerUp(PointerEventData e) { if (up != null) up(); transform.localScale = Vector3.one; }
}

public class QQStick : MonoBehaviour, IPointerDownHandler, IDragHandler, IPointerUpHandler
{
    public RectTransform knob;
    public void OnPointerDown(PointerEventData e) { OnDrag(e); }
    public void OnDrag(PointerEventData e)
    {
        var r = (RectTransform)transform; Vector2 lp;
        RectTransformUtility.ScreenPointToLocalPointInRectangle(r, e.position, e.pressEventCamera, out lp);
        var v = Vector2.ClampMagnitude(lp / (r.sizeDelta.x * .5f), 1f); knob.anchoredPosition = v * r.sizeDelta.x * .4f; QQHud.Move = v;
    }
    public void OnPointerUp(PointerEventData e) { knob.anchoredPosition = Vector2.zero; QQHud.Move = Vector2.zero; }
}
