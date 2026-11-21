// Floating damage numbers (every reference ARPG): white for Guloyim's hits, big gold-red for heavy / crits, small red on her.
// Screen-space Text on the HUD canvas, follows the world point, rises and fades in 0.8 s. Pooled.
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class QQDmgText : MonoBehaviour
{
    static readonly List<QQDmgText> pool = new List<QQDmgText>(); static Font font;
    Text tx; Vector3 world, drift; float t; RectTransform rt;
    public static void Show(Vector3 at, float dmg, bool heavy, bool onPlayer)
    {
        var cv = GameObject.Find("HUD"); if (!cv) return;
        QQDmgText d = null; foreach (var p in pool) if (!p.gameObject.activeSelf) { d = p; break; }
        if (!d)
        {
            var g = new GameObject("dmg", typeof(RectTransform)); g.transform.SetParent(cv.transform, false); d = g.AddComponent<QQDmgText>(); d.rt = (RectTransform)g.transform; d.rt.sizeDelta = new Vector2(200, 60);
            d.tx = g.AddComponent<Text>(); if (!font) font = Resources.Load<Font>("ui/forum") ?? Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf"); d.tx.font = font; d.tx.alignment = TextAnchor.MiddleCenter; d.tx.raycastTarget = false;
            var o = g.AddComponent<Outline>(); o.effectColor = new Color(0, 0, 0, .85f); o.effectDistance = new Vector2(2, -2); pool.Add(d); g.transform.SetSiblingIndex(0);
        }
        d.gameObject.SetActive(true); d.t = 0; d.world = at + Random.insideUnitSphere * .25f; d.drift = new Vector3(Random.Range(-.6f, .6f), 1.4f, 0);
        d.tx.text = Mathf.RoundToInt(dmg).ToString(); d.tx.fontSize = onPlayer ? 24 : heavy ? 44 : 30;
        d.tx.color = onPlayer ? new Color(1f, .35f, .3f) : heavy ? new Color(1f, .78f, .25f) : Color.white;
    }
    void Update()
    {
        t += Time.unscaledDeltaTime; if (t > .85f) { gameObject.SetActive(false); return; }
        var cam = Camera.main; if (!cam) return; Vector3 sp = cam.WorldToScreenPoint(world + drift * t * .9f); if (sp.z < 0) { gameObject.SetActive(false); return; }
        Vector2 lp; RectTransformUtility.ScreenPointToLocalPointInRectangle((RectTransform)transform.parent, sp, null, out lp); rt.anchorMin = rt.anchorMax = new Vector2(.5f, .5f); rt.anchoredPosition = lp;
        float pop = t < .1f ? 1f + (1 - t / .1f) * .6f : 1f; transform.localScale = Vector3.one * pop;
        var c = tx.color; c.a = Mathf.Clamp01((.85f - t) / .3f); tx.color = c;
    }
}
