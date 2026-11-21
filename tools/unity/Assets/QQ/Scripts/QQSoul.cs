// Gold light flowing from a defeated monster into the amulet: 40 motes rise, swirl, then home in on Gúlayım's chest.
using UnityEngine;

public class QQSoul : MonoBehaviour
{
    Transform to; ParticleSystem ps; float t; ParticleSystem.Particle[] buf = new ParticleSystem.Particle[64];
    public void Init(Transform target)
    {
        to = target; ps = gameObject.AddComponent<ParticleSystem>(); ps.Stop(); var m = ps.main; m.startLifetime = 4f; m.startSpeed = new ParticleSystem.MinMaxCurve(1.5f, 3.5f);
        m.startSize = new ParticleSystem.MinMaxCurve(.12f, .26f); m.startColor = new Color(1f, .82f, .35f); m.simulationSpace = ParticleSystemSimulationSpace.World; m.maxParticles = 64; m.loop = false; m.duration = .3f;
        var em = ps.emission; em.rateOverTime = 0; em.SetBursts(new[] { new ParticleSystem.Burst(0, 44) });
        var sh = ps.shape; sh.shapeType = ParticleSystemShapeType.Sphere; sh.radius = .6f;
        var r = GetComponent<ParticleSystemRenderer>(); var src = QQArena.I ? QQArena.I.fxMat : null; if (src) { var mat = new Material(src); mat.SetColor("_BaseColor", new Color(1f, .85f, .4f, 1f)); r.sharedMaterial = mat; }
        ps.Play();
    }
    void Update()
    {
        t += Time.deltaTime; if (!to || !ps) { Destroy(gameObject, .1f); return; }
        int n = ps.GetParticles(buf); Vector3 goal = to.position + Vector3.up * 1.3f;
        for (int i = 0; i < n; i++)
        {
            var p = buf[i]; float k = Mathf.Clamp01((t - .6f) / 1.2f);
            Vector3 d = goal - p.position; p.velocity = Vector3.Lerp(p.velocity * .97f + Vector3.up * .04f, d.normalized * Mathf.Max(4f, d.magnitude * 3f), k);
            if (d.magnitude < .25f && k > .5f) p.remainingLifetime = 0;
            buf[i] = p;
        }
        ps.SetParticles(buf, n);
        if (t > 3.2f) { QQFx.Ring(to.position, new Color(1f, .82f, .35f), 2.4f); QQFx.Flash(); Destroy(gameObject); }
    }
}
