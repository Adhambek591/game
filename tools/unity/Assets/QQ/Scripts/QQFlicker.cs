// Fire light flicker: intensity and a little position jitter from layered noise.
using UnityEngine;

public class QQFlicker : MonoBehaviour
{
    Light l; float baseI, seed; Vector3 basePos;
    void Start() { l = GetComponent<Light>(); baseI = l ? l.intensity : 1; seed = Random.value * 100f; basePos = transform.localPosition; }
    void Update()
    {
        if (!l) return; float t = Time.time * 7f + seed;
        l.intensity = baseI * (.75f + .35f * Mathf.PerlinNoise(t, seed) + .1f * Mathf.Sin(t * 3.1f));
        transform.localPosition = basePos + new Vector3(Mathf.PerlinNoise(t * .5f, 1) - .5f, 0, Mathf.PerlinNoise(2, t * .5f) - .5f) * .25f;
    }
}
