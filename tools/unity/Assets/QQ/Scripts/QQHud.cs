// Touch HUD built in code, in the browser build's visual language (css/ui2.css): felt-indigo surfaces, hammered-gold
// hairlines, carnelian red for the one primary action; Forum (display) + PT Sans (UI); art from Resources/ui
// (btn_red, plate, ribbon, pnl_dark, pframe, divider, icons). Joystick (left), Attack / Dodge / Amulet (right),
// portrait + HP, objective plate, toast ribbon, combo, boss bar, telegraph marks, end panel with upgrades.
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

public class QQHud : MonoBehaviour
{
    public static Vector2 Move; public static bool PointerOverUI;
    static QQHud I;
    Text objective, toast, endTitle, endSub, chain, chainLbl, bossName, coinTxt, againTxt; Text[] upName = new Text[3], upInfo = new Text[3], upCost = new Text[3]; Image[] upImg = new Image[3]; Image[][] upPips = new Image[3][];
    Image hpFill, hpLag, amuletRing, amuletGlow, amuletCd, dodgeFill, bossFill, bossLag; GameObject endPanel, bossBar, objPlate; CanvasGroup toastCg; float toastT, chainPop, hpShown = 1, bossShown = 1;
    RectTransform root; readonly System.Collections.Generic.List<Text> marks = new System.Collections.Generic.List<Text>();

    // ---- palette (ui2.css) ----
    static readonly Color GOLD = C(0xe8bd62), GOLD_L = C(0xffe9ad), PARCH = C(0xf3e3c0), CREAM = C(0xfff4d8), INK = new Color(.055f, .067f, .165f, .86f), CARN = C(0xc22a20);
    static Color C(int hex, float a = 1) { return new Color(((hex >> 16) & 255) / 255f, ((hex >> 8) & 255) / 255f, (hex & 255) / 255f, a); }

    static Font display, ui, uiBold;
    static Font Fallback { get { return Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf"); } }
    static Font Display { get { if (!display) display = Resources.Load<Font>("ui/forum"); return display ? display : Fallback; } }
    static Font Ui { get { if (!ui) ui = Resources.Load<Font>("ui/ptsans"); return ui ? ui : Fallback; } }
    static Font UiBold { get { if (!uiBold) uiBold = Resources.Load<Font>("ui/ptsans-b"); return uiBold ? uiBold : Ui; } }

    public static void Build()
    {
        if (I) return;
        if (!Object.FindFirstObjectByType<EventSystem>()) { new GameObject("EventSystem", typeof(EventSystem), typeof(UnityEngine.InputSystem.UI.InputSystemUIInputModule)); }
        var go = new GameObject("HUD", typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
        var cv = go.GetComponent<Canvas>(); cv.renderMode = RenderMode.ScreenSpaceOverlay; cv.sortingOrder = 10;
        var cs = go.GetComponent<CanvasScaler>(); cs.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize; cs.referenceResolution = new Vector2(1280, 720); cs.matchWidthOrHeight = .6f;
        I = go.AddComponent<QQHud>(); I.Make(go.transform);
    }

    // ---------------- sprites ----------------
    static readonly System.Collections.Generic.Dictionary<string, Sprite> spr = new System.Collections.Generic.Dictionary<string, Sprite>();
    static Sprite Art(string n, Vector4 border = default(Vector4))
    {
        Sprite s; string k = n + border; if (spr.TryGetValue(k, out s)) return s;
        var t = Resources.Load<Texture2D>("ui/" + n); if (!t) return null;
        s = Sprite.Create(t, new Rect(0, 0, t.width, t.height), new Vector2(.5f, .5f), 100, 0, SpriteMeshType.FullRect, border); spr[k] = s; return s;
    }
    // one cell of the 4 x 8 icon sheet (row 0 = top)
    static Sprite Icon(int col, int row)
    {
        string k = "icon" + col + "_" + row; Sprite s; if (spr.TryGetValue(k, out s)) return s;
        var t = Resources.Load<Texture2D>("ui/icons"); if (!t) return null; float w = t.width / 4f, h = t.height / 8f;
        s = Sprite.Create(t, new Rect(col * w + 3, t.height - (row + 1) * h + 3, w - 6, h - 6), new Vector2(.5f, .5f)); spr[k] = s; return s;
    }
    // procedural round pieces: soft disc, glow, enamel disc (radial gradient), hammered-gold ring
    static Sprite Proc(string k, int S, System.Func<float, float, Color> f)
    {
        Sprite s; if (spr.TryGetValue(k, out s)) return s;
        var tx = new Texture2D(S, S, TextureFormat.RGBA32, false); tx.wrapMode = TextureWrapMode.Clamp;
        var px = new Color[S * S];
        for (int y = 0; y < S; y++) for (int x = 0; x < S; x++) { float u = (x + .5f) / S * 2 - 1, v = (y + .5f) / S * 2 - 1; px[y * S + x] = f(u, v); }
        tx.SetPixels(px); tx.Apply(); s = Sprite.Create(tx, new Rect(0, 0, S, S), new Vector2(.5f, .5f)); spr[k] = s; return s;
    }
    static float Edge(float d, float r, float soft) { return Mathf.Clamp01((r - d) / soft); }
    static Sprite Disc() { return Proc("disc", 128, (u, v) => new Color(1, 1, 1, Edge(Mathf.Sqrt(u * u + v * v), 1f, .03f))); }
    static Sprite Glow() { return Proc("glow", 128, (u, v) => { float d = Mathf.Sqrt(u * u + v * v); return new Color(1, 1, 1, Mathf.Pow(Mathf.Clamp01(1 - d), 2.2f)); }); }
    static Sprite Enamel(string k, Color hi, Color mid, Color lo)
    {
        return Proc("enamel" + k, 192, (u, v) =>
        {
            float d = Mathf.Sqrt(u * u + v * v); float g = Mathf.Sqrt((u + .3f) * (u + .3f) + (v - .4f) * (v - .4f)) / 1.4f;
            Color c = g < .55f ? Color.Lerp(hi, mid, g / .55f) : Color.Lerp(mid, lo, (g - .55f) / .45f); c.a = Edge(d, 1f, .02f); return c;
        });
    }
    static Sprite GoldRing(float inner)
    {
        return Proc("ring" + inner, 256, (u, v) =>
        {
            float d = Mathf.Sqrt(u * u + v * v); if (d > 1f || d < inner - .02f) return Color.clear;
            float t = Mathf.InverseLerp(inner, 1f, d);
            float bevel = Mathf.Sin(t * Mathf.PI); float light = .55f + .45f * Mathf.Clamp01(-(u * .6f - v * .8f) / Mathf.Max(.01f, d));   // lit from top-left
            float ham = .9f + .1f * Mathf.PerlinNoise(u * 18f + 3f, v * 18f + 7f);
            Color c = Color.Lerp(C(0x6b4710), C(0xffe39a), Mathf.Clamp01(bevel * light * ham + .15f));
            if (t < .12f || t > .9f) c = Color.Lerp(c, C(0x3a2405), .55f);   // dark lips
            c.a = Edge(d, 1f, .015f) * Mathf.Clamp01((d - inner + .02f) / .02f); return c;
        });
    }

    // ---------------- builders ----------------
    static RectTransform Rect(Transform p, string n, Vector2 anchor, Vector2 pos, Vector2 size)
    {
        var g = new GameObject(n, typeof(RectTransform)); g.transform.SetParent(p, false); var r = (RectTransform)g.transform;
        r.anchorMin = r.anchorMax = anchor; r.pivot = new Vector2(.5f, .5f); r.anchoredPosition = pos; r.sizeDelta = size; return r;
    }
    static Image Img(RectTransform r, Sprite s, Color c, bool sliced = false, float ppu = 1f)
    {
        var i = r.gameObject.AddComponent<Image>(); i.sprite = s; i.color = c; i.raycastTarget = false;
        if (sliced && s) { i.type = Image.Type.Sliced; i.pixelsPerUnitMultiplier = ppu; }
        return i;
    }
    static Image Img(RectTransform r, Color c) { return Img(r, null, c); }
    static Text Txt(RectTransform r, string s, Font f, int size, TextAnchor a, Color col, bool heavy = true)
    {
        var t = r.gameObject.AddComponent<Text>(); t.font = f; t.text = s; t.fontSize = size; t.alignment = a; t.color = col; t.raycastTarget = false;
        t.horizontalOverflow = HorizontalWrapMode.Wrap; t.verticalOverflow = VerticalWrapMode.Overflow;
        var sh = r.gameObject.AddComponent<Shadow>(); sh.effectColor = new Color(0, 0, 0, .75f); sh.effectDistance = new Vector2(0, -2);
        if (heavy) { var o = r.gameObject.AddComponent<Outline>(); o.effectColor = new Color(.08f, .04f, 0, .6f); o.effectDistance = new Vector2(1.2f, -1.2f); }
        return t;
    }
    static void Hair(RectTransform r)   // hammered-gold hairline round a felt chip
    {
        var o = r.gameObject.AddComponent<Outline>(); o.effectColor = new Color(GOLD.r, GOLD.g, GOLD.b, .75f); o.effectDistance = new Vector2(1.5f, 1.5f);
        var o2 = r.gameObject.AddComponent<Outline>(); o2.effectColor = new Color(GOLD.r, GOLD.g, GOLD.b, .75f); o2.effectDistance = new Vector2(-1.5f, -1.5f);
    }
    static RectTransform RoundIcon(RectTransform parent, string n, Vector2 anchor, Vector2 pos, float size, Sprite icon)
    {
        var m = Rect(parent, n, anchor, pos, new Vector2(size, size)); Img(m, Disc(), Color.white); m.gameObject.AddComponent<Mask>().showMaskGraphic = false;
        Img(Rect(m, "i", new Vector2(.5f, .5f), Vector2.zero, new Vector2(size, size)), icon, Color.white); return m;
    }

    // a round action button: enamel face, round icon, gold ring, small label under it
    RectTransform Action(string name, string label, Vector2 pos, float size, Sprite face, Sprite iconSpr)
    {
        var r = Rect(root, name, new Vector2(1, 0), pos, new Vector2(size, size));
        var sh = Rect(r, "shadow", new Vector2(.5f, .5f), new Vector2(0, -6), new Vector2(size * 1.15f, size * 1.15f)); Img(sh, Glow(), new Color(0, 0, 0, .7f));
        var hit = Img(r, Disc(), new Color(0, 0, 0, .01f)); hit.raycastTarget = true;
        Img(Rect(r, "face", new Vector2(.5f, .5f), Vector2.zero, new Vector2(size * .92f, size * .92f)), face, Color.white);
        if (iconSpr)
        {
            var m = RoundIcon(r, "icon", new Vector2(.5f, .5f), Vector2.zero, size * .86f, iconSpr);
            Img(Rect(m, "sheen", new Vector2(.5f, .5f), new Vector2(-size * .12f, size * .18f), new Vector2(size * .7f, size * .45f)), Glow(), new Color(1, 1, 1, .14f));
        }
        Img(Rect(r, "ring", new Vector2(.5f, .5f), Vector2.zero, new Vector2(size, size)), GoldRing(.86f), Color.white);
        Txt(Rect(r, "label", new Vector2(.5f, 0), new Vector2(0, -13), new Vector2(size + 40, 24)), label, UiBold, 16, TextAnchor.MiddleCenter, PARCH);
        return r;
    }
    Image Cooldown(RectTransform b, float k)
    {
        var r = Rect(b, "cd", new Vector2(.5f, .5f), Vector2.zero, b.sizeDelta * k); var i = Img(r, Disc(), new Color(.02f, .03f, .1f, .66f));
        i.type = Image.Type.Filled; i.fillMethod = Image.FillMethod.Radial360; i.fillOrigin = (int)Image.Origin360.Top; i.fillClockwise = false; return i;
    }
    // a bar: dark chip, fill with a lagging "damage" strip (fighting-game style), gold plate frame on top
    Image Bar(RectTransform parent, string n, Vector2 anchor, Vector2 pos, Vector2 size, Color fill, out Image lag)
    {
        var r = Rect(parent, n, anchor, pos, size); Img(r, INK);
        var lr = Rect(r, "lag", new Vector2(0, .5f), new Vector2(4, 0), new Vector2(size.x - 8, size.y - 8)); lr.pivot = new Vector2(0, .5f); lag = Img(lr, new Color(1f, .85f, .55f, .9f));
        var fr = Rect(r, "fill", new Vector2(0, .5f), new Vector2(4, 0), new Vector2(size.x - 8, size.y - 8)); fr.pivot = new Vector2(0, .5f); var fi = Img(fr, fill);
        var hl = Rect(fr, "hl", new Vector2(.5f, 1), new Vector2(0, -1), Vector2.zero); hl.anchorMin = new Vector2(0, 1); hl.anchorMax = new Vector2(1, 1); hl.pivot = new Vector2(.5f, 1); hl.sizeDelta = new Vector2(0, Mathf.Max(2, (size.y - 8) * .25f)); Img(hl, new Color(1, 1, 1, .16f));
        var sd = Rect(fr, "sd", new Vector2(.5f, 0), Vector2.zero, Vector2.zero); sd.anchorMin = new Vector2(0, 0); sd.anchorMax = new Vector2(1, 0); sd.pivot = new Vector2(.5f, 0); sd.sizeDelta = new Vector2(0, Mathf.Max(2, (size.y - 8) * .3f)); Img(sd, new Color(0, 0, 0, .25f));
        Hair(r);
        // gold diamond caps at both ends (the browser bars' finials)
        for (int e = 0; e < 2; e++) { var cp = Rect(r, "cap" + e, new Vector2(e, .5f), Vector2.zero, new Vector2(size.y * .75f, size.y * .75f)); cp.localRotation = Quaternion.Euler(0, 0, 45); Img(cp, GOLD); var ci = Rect(cp, "i", new Vector2(.5f, .5f), Vector2.zero, new Vector2(size.y * .35f, size.y * .35f)); Img(ci, C(0xc22a20)); }
        return fi;
    }

    void Make(Transform rootT)
    {
        root = (RectTransform)rootT;

        // ---- hero block: portrait in the horned gold frame, name, HP bar ----
        var hero = Rect(root, "hero", new Vector2(0, 1), new Vector2(80, -80), new Vector2(110, 118));
        var pm = Rect(hero, "pmask", new Vector2(.5f, .5f), new Vector2(0, -10), new Vector2(76, 76)); Img(pm, Disc(), Color.white); pm.gameObject.AddComponent<Mask>().showMaskGraphic = false;
        var pt = Resources.Load<Texture2D>("ui/portrait_gulayim");
        if (pt) { float side = Mathf.Min(pt.width, pt.height) * .62f; Img(Rect(pm, "p", new Vector2(.5f, .5f), Vector2.zero, new Vector2(80, 80)), Sprite.Create(pt, new Rect((pt.width - side) * .5f, pt.height - side - pt.height * .06f, side, side), new Vector2(.5f, .5f)), Color.white); }
        Img(Rect(hero, "pframe", new Vector2(.5f, .5f), Vector2.zero, new Vector2(104, 112)), Art("pframe"), Color.white);
        Txt(Rect(root, "name", new Vector2(0, 1), new Vector2(268, -50), new Vector2(240, 30)), "Gúlayım", Display, 26, TextAnchor.MiddleLeft, GOLD_L);
        hpFill = Bar(root, "hp", new Vector2(0, 1), new Vector2(268, -82), new Vector2(240, 20), C(0xd23a2c), out hpLag);

        // ---- objective plate (top centre) ----
        var ob = Rect(root, "obj", new Vector2(.5f, 1), new Vector2(40, -36), new Vector2(540, 44)); objPlate = ob.gameObject;
        Img(ob, Art("plate", new Vector4(44, 0, 44, 0)), Color.white, true, 64f / 44f);
        objective = Txt(Rect(ob, "t", new Vector2(.5f, .5f), new Vector2(0, 1), new Vector2(460, 40)), "", UiBold, 17, TextAnchor.MiddleCenter, PARCH, false);

        // ---- toast: red ribbon with gold Forum lettering ----
        var tr = Rect(root, "toast", new Vector2(.5f, .5f), new Vector2(0, 128), new Vector2(540, 58)); toastCg = tr.gameObject.AddComponent<CanvasGroup>(); toastCg.alpha = 0; toastCg.blocksRaycasts = false; toastCg.interactable = false;
        Img(tr, Art("ribbon", new Vector4(96, 0, 96, 0)), Color.white, true, 96f / 58f);
        toast = Txt(Rect(tr, "t", new Vector2(.5f, .5f), new Vector2(0, 2), new Vector2(420, 52)), "", Display, 26, TextAnchor.MiddleCenter, GOLD_L);
        toast.resizeTextForBestFit = true; toast.resizeTextMinSize = 16; toast.resizeTextMaxSize = 26; toast.verticalOverflow = VerticalWrapMode.Truncate;

        // ---- combo: big gold number + small label ----
        chain = Txt(Rect(root, "chain", new Vector2(1, 1), new Vector2(-110, -66), new Vector2(200, 70)), "", Display, 58, TextAnchor.MiddleCenter, GOLD_L);
        chainLbl = Txt(Rect(chain.rectTransform, "lbl", new Vector2(.5f, 0), new Vector2(0, -8), new Vector2(200, 24)), "", UiBold, 15, TextAnchor.MiddleCenter, PARCH);

        // ---- boss bar ----
        var bb = Rect(root, "boss", new Vector2(.5f, 1), new Vector2(40, -118), new Vector2(480, 60)); bossBar = bb.gameObject;
        bossName = Txt(Rect(bb, "n", new Vector2(.5f, 1), new Vector2(0, -10), new Vector2(560, 30)), "", Display, 24, TextAnchor.MiddleCenter, GOLD_L);
        bossFill = Bar(bb, "bar", new Vector2(.5f, 0), new Vector2(0, 14), new Vector2(440, 16), C(0xb3261c), out bossLag);
        bossBar.SetActive(false);

        // ---- joystick: felt disc with gold hairline, enamel knob with gold rim ----
        var jb = Rect(root, "joy", new Vector2(0, 0), new Vector2(170, 170), new Vector2(230, 230));
        var jbg = Img(jb, Disc(), new Color(.055f, .067f, .165f, .42f)); jbg.raycastTarget = true;
        Img(Rect(jb, "ring", new Vector2(.5f, .5f), Vector2.zero, new Vector2(230, 230)), GoldRing(.965f), new Color(1, 1, 1, .75f));
        var knob = Rect(jb, "knob", new Vector2(.5f, .5f), Vector2.zero, new Vector2(92, 92));
        Img(knob, Enamel("blue", C(0x3a4690), C(0x1d2556), C(0x0e1126)), Color.white);
        Img(Rect(knob, "ring", new Vector2(.5f, .5f), Vector2.zero, new Vector2(92, 92)), GoldRing(.84f), Color.white);
        jb.gameObject.AddComponent<QQStick>().knob = knob;

        // ---- action buttons (icons: sword, runner, gold amulet triangle pointing down) ----
        var atk = Action("Hujum", "Hujum", new Vector2(-150, 150), 168, Enamel("red", C(0xff8a6a), CARN, C(0x6a0d0a)), Icon(0, 0));
        var ev = atk.gameObject.AddComponent<QQPress>(); ev.down = () => { if (QQPlayer.I) QQPlayer.I.AttackDown(); }; ev.up = () => { if (QQPlayer.I) QQPlayer.I.AttackUp(); };
        var dg = Action("Chetlan", "Chetlan", new Vector2(-345, 92), 112, Enamel("blue", C(0x3a4690), C(0x1d2556), C(0x0e1126)), Icon(1, 1)); dodgeFill = Cooldown(dg, .86f);
        dg.gameObject.AddComponent<QQPress>().down = () => { if (QQPlayer.I) QQPlayer.I.Dodge(); };
        var am = Action("Tumor", "Tumor", new Vector2(-132, 352), 112, Enamel("blue", C(0x3a4690), C(0x1d2556), C(0x0e1126)), Icon(3, 2));
        var gl = Rect(am, "glow", new Vector2(.5f, .5f), Vector2.zero, new Vector2(200, 200)); amuletGlow = Img(gl, Glow(), new Color(1f, .75f, .25f, 0)); gl.SetAsFirstSibling();
        amuletCd = Cooldown(am, .86f);
        am.Find("ring").GetComponent<Image>().color = new Color(.42f, .38f, .34f);   // dull until charged; the gold gauge fills over it
        var ar = Rect(am, "gauge", new Vector2(.5f, .5f), Vector2.zero, new Vector2(112, 112)); amuletRing = Img(ar, GoldRing(.86f), Color.white);
        amuletRing.type = Image.Type.Filled; amuletRing.fillMethod = Image.FillMethod.Radial360; amuletRing.fillOrigin = (int)Image.Origin360.Top; amuletRing.fillClockwise = true;
        am.gameObject.AddComponent<QQPress>().down = () => { if (QQPlayer.I) QQPlayer.I.Amulet(); };

        // ---- end panel ----
        var ep = Rect(root, "end", new Vector2(.5f, .5f), Vector2.zero, new Vector2(820, 560)); endPanel = ep.gameObject;
        endTitle = Txt(Rect(ep, "t", new Vector2(.5f, 1), new Vector2(0, -66), new Vector2(700, 70)), "", Display, 58, TextAnchor.MiddleCenter, C(0xf8dc92));
        endSub = Txt(Rect(ep, "s", new Vector2(.5f, 1), new Vector2(0, -160), new Vector2(680, 64)), "", Ui, 21, TextAnchor.MiddleCenter, PARCH, false);
        var bg = Rect(ep, "bg", new Vector2(.5f, .5f), Vector2.zero, new Vector2(820, 560)); Img(bg, Art("pnl_dark", new Vector4(80, 80, 80, 80)), Color.white, true, 1.1f); bg.SetAsFirstSibling();
        Img(Rect(ep, "div", new Vector2(.5f, 1), new Vector2(0, -112), new Vector2(343, 48)), Art("divider"), Color.white);
        var cc = Rect(ep, "coins", new Vector2(.5f, 1), new Vector2(0, -222), new Vector2(480, 38)); Img(cc, new Color(.035f, .045f, .12f, 1f)); Hair(cc);
        RoundIcon(cc, "ic", new Vector2(0, .5f), new Vector2(24, 0), 30, Icon(2, 5));
        coinTxt = Txt(Rect(cc, "t", new Vector2(.5f, .5f), new Vector2(14, 0), new Vector2(440, 38)), "", UiBold, 18, TextAnchor.MiddleCenter, GOLD_L, false);
        Sprite[] upIcons = { Icon(0, 0), Icon(3, 3), Icon(3, 2) };
        for (int i = 0; i < 3; i++)
        {
            int k = i; var cr = Rect(ep, "up" + i, new Vector2(.5f, 1), new Vector2(-250 + i * 250, -340), new Vector2(232, 150)); upImg[i] = Img(cr, new Color(.035f, .045f, .12f, 1f)); upImg[i].raycastTarget = true; Hair(cr);
            RoundIcon(cr, "ic", new Vector2(0, 1), new Vector2(42, -42), 56, upIcons[i]);
            Img(Rect(cr, "ring", new Vector2(0, 1), new Vector2(42, -42), new Vector2(64, 64)), GoldRing(.87f), Color.white);
            upName[i] = Txt(Rect(cr, "n", new Vector2(0, 1), new Vector2(150, -28), new Vector2(136, 30)), "", Display, 24, TextAnchor.MiddleLeft, GOLD_L);
            upInfo[i] = Txt(Rect(cr, "f", new Vector2(0, 1), new Vector2(150, -56), new Vector2(136, 24)), "", Ui, 15, TextAnchor.MiddleLeft, PARCH, false);
            upPips[i] = new Image[6];
            for (int p = 0; p < 6; p++) { var pr = Rect(cr, "pip" + p, new Vector2(0, 0), new Vector2(24 + p * 18, 52), new Vector2(10, 10)); pr.localRotation = Quaternion.Euler(0, 0, 45); upPips[i][p] = Img(pr, Color.white); }
            upCost[i] = Txt(Rect(cr, "c", new Vector2(.5f, 0), new Vector2(0, 22), new Vector2(220, 26)), "", UiBold, 17, TextAnchor.MiddleCenter, GOLD_L, false);
            cr.gameObject.AddComponent<QQPress>().down = () => { if (QQProgress.Buy(k)) { QQFeel.Sfx("coin", null, 1f); RefreshShop(); } else QQFeel.Sfx("v_ui", null, .6f); };
        }
        var rb = Rect(ep, "again", new Vector2(.5f, 0), new Vector2(0, 60), new Vector2(340, 66));
        var rbi = Img(rb, Art("btn_red", new Vector4(72, 0, 72, 0)), Color.white, true, 120f / 66f); rbi.raycastTarget = true;
        againTxt = Txt(Rect(rb, "l", new Vector2(.5f, .5f), new Vector2(0, 2), new Vector2(280, 60)), "Qaytadan", Display, 30, TextAnchor.MiddleCenter, CREAM);
        rb.gameObject.AddComponent<QQPress>().down = () => UnityEngine.SceneManagement.SceneManager.LoadScene(UnityEngine.SceneManagement.SceneManager.GetActiveScene().buildIndex);
        endPanel.SetActive(false);
    }

    public static void Objective(string s) { if (I) { I.objective.text = s; I.objPlate.SetActive(!string.IsNullOrEmpty(s)); } }
    public static void Toast(string s, float dur = 1.6f) { if (I && I.toastT < 2f) { I.toast.text = s; I.toastT = dur; } }
    // first-time hints for the new mechanics (shown once per install)
    static void Hint(string key, string s) { if (PlayerPrefs.GetInt("qq_hint_" + key, 0) == 1 || !I) return; PlayerPrefs.SetInt("qq_hint_" + key, 1); PlayerPrefs.Save(); I.toastT = 0; Toast(s, 3.2f); }
    public static void End(bool win, string sub)
    {
        if (!I) return; I.endPanel.SetActive(true); I.endTitle.text = win ? "G'alaba!" : "Mag'lubiyat"; I.endTitle.color = win ? C(0xf8dc92) : C(0xff8a6a);
        foreach (var n in new[] { "joy", "Hujum", "Chetlan", "Tumor", "chain", "boss", "toast" }) { var c = I.root.Find(n); if (c) c.gameObject.SetActive(false); }
        I.endSub.text = sub; I.againTxt.text = win ? "Keyingi jang" : "Qaytadan"; I.RefreshShop();
    }
    void RefreshShop()
    {
        coinTxt.text = QQProgress.Coins + " tanga     ·     " + QQProgress.Level + "-jang chegarasi: " + QQProgress.Cap + "-daraja";
        for (int i = 0; i < 3; i++)
        {
            int lv = QQProgress.Upg(i); bool cap = lv >= QQProgress.Cap, can = QQProgress.CanBuy(i);
            upName[i].text = QQProgress.Names[i]; upInfo[i].text = QQProgress.Info[i];
            upCost[i].text = cap ? "chegara" : QQProgress.Cost(i) + " tanga"; upCost[i].color = can ? GOLD_L : new Color(.6f, .55f, .5f);
            upImg[i].color = can ? new Color(.1f, .13f, .33f, 1f) : new Color(.035f, .045f, .12f, 1f);
            for (int p = 0; p < 6; p++) { upPips[i][p].gameObject.SetActive(p < QQProgress.Cap); upPips[i][p].color = p < lv ? C(0xe0472f) : new Color(GOLD.r, GOLD.g, GOLD.b, .35f); }
        }
    }

    void Update()
    {
        float dt = Time.unscaledDeltaTime;
        var p = QQArena.I ? QQArena.I.player : null;
        if (p)
        {
            float f = Mathf.Clamp01(p.hp / p.maxHp), w = 232;
            hpFill.rectTransform.sizeDelta = new Vector2(w * f, hpFill.rectTransform.sizeDelta.y);
            hpShown = Mathf.MoveTowards(hpShown, f, dt * (hpShown > f ? .35f : 5f)); hpLag.rectTransform.sizeDelta = new Vector2(w * Mathf.Max(f, hpShown), hpLag.rectTransform.sizeDelta.y);
            hpFill.color = f < .3f ? Color.Lerp(C(0xd23a2c), C(0xff7a55), .5f + .5f * Mathf.Sin(Time.unscaledTime * 8f)) : C(0xd23a2c);   // low health pulses
        }
        if (QQPlayer.I)
        {
            float a = QQPlayer.I.AmuletReady; amuletRing.fillAmount = a; amuletCd.fillAmount = 1 - a; dodgeFill.fillAmount = 1 - QQPlayer.I.DodgeReady;
            amuletGlow.color = new Color(1f, .75f, .25f, a >= 1f ? .55f + .25f * Mathf.Sin(Time.unscaledTime * 5f) : 0f);
        }
        if (toastT > 0) { toastT -= dt; toastCg.alpha = Mathf.Clamp01(toastT * 3f); } else toastCg.alpha = 0;
        PointerOverUI = EventSystem.current && EventSystem.current.IsPointerOverGameObject();

        // combo counter with a pop on every new hit
        var pl = QQPlayer.I; int c = pl ? pl.Chain : 0;
        if (c >= 3) { string s = c.ToString(); if (chain.text != s) chainPop = .15f; chain.text = s; chainLbl.text = "zarba ketma-ket"; } else { chain.text = ""; chainLbl.text = ""; }
        chainPop = Mathf.Max(0, chainPop - dt); chain.transform.localScale = Vector3.one * (1f + chainPop * 2.2f);
        chain.color = c >= 20 ? C(0xffc44a) : c >= 10 ? GOLD_L : PARCH;

        // boss bar
        Unit boss = null; foreach (var o in Unit.All) if (o.boss && !o.Dead) { boss = o; break; }
        bossBar.SetActive(boss && !endPanel.activeSelf);
        if (boss)
        {
            float f = Mathf.Clamp01(boss.hp / boss.maxHp), w = 432; bossFill.rectTransform.sizeDelta = new Vector2(w * f, bossFill.rectTransform.sizeDelta.y);
            bossShown = Mathf.MoveTowards(bossShown, f, dt * (bossShown > f ? .25f : 5f)); bossLag.rectTransform.sizeDelta = new Vector2(w * Mathf.Max(f, bossShown), bossLag.rectTransform.sizeDelta.y);
            bossName.text = boss.displayName;
        }

        // telegraph marks over foes about to strike Gúlayım: gold = counter with Dodge, red = unblockable, roll away
        int n = 0; var cam = Camera.main;
        if (cam && p)
            foreach (var o in Unit.All)
            {
                if (o.Dead || o.team != 1 || o.telegraph <= 0 || o.swingAt != p) continue;
                Vector3 sp = cam.WorldToScreenPoint(o.transform.position + Vector3.up * (o.boss ? 3.1f : 2.3f)); if (sp.z < 0) continue;
                if (n >= marks.Count) { var r = Rect(root, "mark", new Vector2(.5f, .5f), Vector2.zero, new Vector2(90, 90)); var t = Txt(r, "", Display, 72, TextAnchor.MiddleCenter, GOLD_L); var o2 = r.gameObject.AddComponent<Outline>(); o2.effectColor = new Color(.15f, .05f, 0, .9f); o2.effectDistance = new Vector2(2.5f, -2.5f); r.SetSiblingIndex(0); marks.Add(t); }
                var mk = marks[n++]; mk.gameObject.SetActive(true);
                Vector2 lp; RectTransformUtility.ScreenPointToLocalPointInRectangle(root, sp, null, out lp); mk.rectTransform.anchoredPosition = lp;
                if (o.unblockable) Hint("red", "Qizil !! — qaytarib bo'lmaydi, chetlaning"); else Hint("gold", "Oltin ! — shu payt «Chetlan»: zarbani qaytarasiz");
                mk.text = o.unblockable ? "!!" : "!"; mk.color = o.unblockable ? C(0xff5a3c) : C(0xffd56a);
                mk.transform.localScale = Vector3.one * (1f + .25f * Mathf.Sin(Time.unscaledTime * 30f));
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
