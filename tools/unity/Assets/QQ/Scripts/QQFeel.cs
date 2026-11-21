// Game feel, taken from the best melee games (see docs/design/genre_study_uz.md):
//  - hit-stop (Street Fighter / Arkham / Avowed "sense of hitting"): the world freezes for a few frames when a blow lands;
//  - slow motion for counters and for the last foe of a wave (Arkham's final-hit cam);
//  - sound: pooled one-shots from Resources/audio (the browser build's SFX) and one music track at a time.
using System.Collections.Generic;
using UnityEngine;

public class QQFeel : MonoBehaviour
{
    static QQFeel I;
    float stopT, slowT, slowScale = 1f;
    readonly List<AudioSource> pool = new List<AudioSource>(); int next;
    AudioSource music, amb; readonly Dictionary<string, AudioClip> clips = new Dictionary<string, AudioClip>();
    public static float sfxVol = 1f, musicVol = .55f;

    static QQFeel Get()
    {
        if (I) return I;
        var go = new GameObject("QQFeel"); I = go.AddComponent<QQFeel>();
        for (int i = 0; i < 16; i++) { var s = go.AddComponent<AudioSource>(); s.playOnAwake = false; I.pool.Add(s); }
        I.music = go.AddComponent<AudioSource>(); I.music.loop = true; I.music.playOnAwake = false;
        I.amb = go.AddComponent<AudioSource>(); I.amb.loop = true; I.amb.playOnAwake = false;
        return I;
    }

    AudioClip Clip(string n)
    {
        AudioClip c; if (clips.TryGetValue(n, out c)) return c;
        c = Resources.Load<AudioClip>("audio/" + n); clips[n] = c; return c;
    }

    // ---- time ----
    public static void HitStop(float sec) { var f = Get(); f.stopT = Mathf.Max(f.stopT, sec); }
    public static void SlowMo(float scale, float sec) { var f = Get(); f.slowScale = scale; f.slowT = Mathf.Max(f.slowT, sec); }

    // ---- sound ----
    // 2D one-shot with a little pitch spread so repeated swings never sound like a machine gun; quieter with distance from the camera.
    public static void Sfx(string n, Vector3? at = null, float vol = 1f, float pitchVar = .08f)
    {
        var f = Get(); var c = f.Clip(n); if (!c) return;
        if (at.HasValue && Camera.main) { float d = Vector3.Distance(at.Value, Camera.main.transform.position); vol *= Mathf.Clamp01(1.4f - d / 40f); if (vol < .03f) return; }
        var s = f.pool[f.next = (f.next + 1) % f.pool.Count];
        s.pitch = 1f + Random.Range(-pitchVar, pitchVar) * (Time.timeScale < .5f ? 0 : 1) - (Time.timeScale < .5f ? .15f : 0);
        s.PlayOneShot(c, vol * sfxVol);
    }
    public static void Music(string n, float vol = 1f)
    {
        var f = Get(); var c = f.Clip(n); if (!c || f.music.clip == c) return;
        f.music.clip = c; f.music.volume = vol * musicVol; f.music.Play();
    }
    public static void Ambience(string n, float vol)
    {
        var f = Get(); var c = f.Clip(n); if (!c) return; f.amb.clip = c; f.amb.volume = vol * sfxVol; f.amb.Play();
    }

    void Update()
    {
        float dt = Time.unscaledDeltaTime;
        if (stopT > 0) { stopT -= dt; Time.timeScale = .02f; }
        else if (slowT > 0) { slowT -= dt; Time.timeScale = slowScale; }
        else Time.timeScale = Mathf.MoveTowards(Time.timeScale, 1f, dt * 4f);
        Time.fixedDeltaTime = .02f * Mathf.Max(.05f, Time.timeScale);
    }
}
