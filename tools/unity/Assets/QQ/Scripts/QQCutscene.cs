// Cutscenes: only the author's approved clips (StreamingAssets/video: v1 = Surtaysha attacks Sarkop, v2 = Allayar's fall and the
// people led away, c2 = the salt desert), with the baqsı narration and an Uzbek subtitle. Tap / Enter / Space skips.
// The cutscene ends when both the clip and the spoken line are over (the browser build's rule).
using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.Video;

public static class QQCutscene
{
    public static IEnumerator Play(string clip, string narration, string subtitle)
    {
        var go = new GameObject("cutscene", typeof(Canvas), typeof(CanvasScaler)); var cv = go.GetComponent<Canvas>(); cv.renderMode = RenderMode.ScreenSpaceOverlay; cv.sortingOrder = 50;
        var cs = go.GetComponent<CanvasScaler>(); cs.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize; cs.referenceResolution = new Vector2(1280, 720); cs.matchWidthOrHeight = .6f;
        var bg = new GameObject("bg", typeof(RectTransform), typeof(RawImage)); bg.transform.SetParent(go.transform, false); var br = (RectTransform)bg.transform; br.anchorMin = Vector2.zero; br.anchorMax = Vector2.one; br.offsetMin = br.offsetMax = Vector2.zero;
        var raw = bg.GetComponent<RawImage>(); raw.color = Color.black;
        var rt = new RenderTexture(1280, 720, 0); var vp = go.AddComponent<VideoPlayer>(); vp.playOnAwake = false; vp.renderMode = VideoRenderMode.RenderTexture; vp.targetTexture = rt;
        vp.source = VideoSource.Url; vp.url = System.IO.Path.Combine(Application.streamingAssetsPath, "video", clip + ".mp4"); vp.audioOutputMode = VideoAudioOutputMode.Direct; vp.SetDirectAudioVolume(0, .55f);
        vp.Prepare();
        // subtitle plate
        var st = new GameObject("sub", typeof(RectTransform), typeof(Text), typeof(Shadow)); st.transform.SetParent(go.transform, false); var sr = (RectTransform)st.transform;
        sr.anchorMin = new Vector2(.5f, 0); sr.anchorMax = new Vector2(.5f, 0); sr.anchoredPosition = new Vector2(0, 70); sr.sizeDelta = new Vector2(1060, 110);
        var tx = st.GetComponent<Text>(); tx.font = Resources.Load<Font>("ui/ptsans") ?? Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf"); tx.fontSize = 26; tx.alignment = TextAnchor.MiddleCenter; tx.color = new Color(1f, .93f, .78f); tx.text = subtitle ?? "";
        st.GetComponent<Shadow>().effectDistance = new Vector2(0, -2);
        var sk = new GameObject("skip", typeof(RectTransform), typeof(Text)); sk.transform.SetParent(go.transform, false); var kr = (RectTransform)sk.transform; kr.anchorMin = kr.anchorMax = new Vector2(1, 0); kr.anchoredPosition = new Vector2(-120, 26); kr.sizeDelta = new Vector2(220, 30);
        var kt = sk.GetComponent<Text>(); kt.font = tx.font; kt.fontSize = 17; kt.alignment = TextAnchor.MiddleRight; kt.color = new Color(1, 1, 1, .6f); kt.text = "O'tkazib yuborish ▸▸";

        float t = 0; while (!vp.isPrepared && t < 5f) { t += Time.unscaledDeltaTime; yield return null; }
        bool video = vp.isPrepared; if (video) { raw.texture = rt; raw.color = Color.white; vp.Play(); }
        AudioSource nar = null; var clipA = narration != null ? Resources.Load<AudioClip>("audio/" + narration) : null;
        if (clipA) { nar = go.AddComponent<AudioSource>(); nar.clip = clipA; nar.volume = 1f; nar.PlayDelayed(.6f); }
        float minT = video ? (float)vp.length : 6f; t = 0; yield return null;
        while (true)
        {
            t += Time.unscaledDeltaTime;
            bool vDone = !video || t >= minT - .05f || (!vp.isPlaying && t > 1f), nDone = !nar || (!nar.isPlaying && t > 1f);
            if (vDone && nDone) break;
            if (Skip()) break;
            yield return null;
        }
        if (vp) vp.Stop(); rt.Release(); Object.Destroy(go);
    }

    static bool Skip()
    {
        var k = UnityEngine.InputSystem.Keyboard.current; var m = UnityEngine.InputSystem.Mouse.current; var ts = UnityEngine.InputSystem.Touchscreen.current;
        return (k != null && (k.enterKey.wasPressedThisFrame || k.spaceKey.wasPressedThisFrame || k.escapeKey.wasPressedThisFrame)) || (m != null && m.leftButton.wasPressedThisFrame) || (ts != null && ts.primaryTouch.press.wasPressedThisFrame);
    }
}
