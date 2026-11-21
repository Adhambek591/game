// Touch HUD built in code: joystick (left), Attack / Dodge / Amulet (right), HP bar, objective, toast, end panel.
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

public class QQHud : MonoBehaviour
{
    public static Vector2 Move; public static bool PointerOverUI;
    static QQHud I; Text objective, toast, endTitle, endSub; Image hpFill, amuletFill, dodgeFill; GameObject endPanel; float toastT;
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
        toast = Txt(Rect(root, "toast", new Vector2(.5f, .5f), new Vector2(0, 160), new Vector2(800, 60)), "", 40, TextAnchor.MiddleCenter);

        // end panel
        var ep = Rect(root, "end", new Vector2(.5f, .5f), Vector2.zero, new Vector2(640, 320)); Img(ep, new Color(.08f, .06f, .05f, .88f), false); endPanel = ep.gameObject;
        endTitle = Txt(Rect(ep, "t", new Vector2(.5f, 1), new Vector2(0, -70), new Vector2(600, 70)), "", 52, TextAnchor.MiddleCenter);
        endSub = Txt(Rect(ep, "s", new Vector2(.5f, 1), new Vector2(0, -140), new Vector2(600, 50)), "", 26, TextAnchor.MiddleCenter);
        var rb = Rect(ep, "again", new Vector2(.5f, 0), new Vector2(0, 70), new Vector2(280, 70)); Img(rb, new Color(.75f, .2f, .15f, 1), false);
        Txt(Rect(rb, "l", new Vector2(.5f, .5f), Vector2.zero, new Vector2(280, 70)), "Qaytadan", 30, TextAnchor.MiddleCenter);
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
    public static void Toast(string s) { if (I) { I.toast.text = s; I.toastT = 1.6f; } }
    public static void End(bool win, string sub)
    {
        if (!I) return; I.endPanel.SetActive(true); I.endTitle.text = win ? "G'alaba!" : "Mag'lubiyat"; I.endTitle.color = win ? new Color(1f, .85f, .4f) : new Color(1f, .5f, .45f); I.endSub.text = sub;
    }

    void Update()
    {
        var p = QQArena.I ? QQArena.I.player : null;
        if (p) hpFill.rectTransform.sizeDelta = new Vector2(376 * Mathf.Clamp01(p.hp / p.maxHp), 18);
        if (QQPlayer.I) { amuletFill.fillAmount = 1 - QQPlayer.I.AmuletReady; dodgeFill.fillAmount = 1 - QQPlayer.I.DodgeReady; }
        if (toastT > 0) { toastT -= Time.deltaTime; toast.color = new Color(1, .9f, .6f, Mathf.Clamp01(toastT * 2)); }
        PointerOverUI = EventSystem.current && EventSystem.current.IsPointerOverGameObject();
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
