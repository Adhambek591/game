// Follow camera matched to the browser build's graphics pass: low, cinematic, 34° lens in landscape.
using UnityEngine;

public class QQCam : MonoBehaviour
{
    public Transform target; Vector3 cur; public float height = 7.4f, back = 13.4f, lookY = 1.4f;
    public static float shake, debugZoom = 1f; float zoom, lift;
    public float yaw;   // 180 in the chapter street, which runs toward -z

    void LateUpdate()
    {
        if (!target) return;
        var c = GetComponent<Camera>(); bool portrait = Screen.height > Screen.width; c.fieldOfView = portrait ? 50f : 34f;
        // dynamic framing: closer in a duel, pulled back when a crowd or a boss is around her
        int crowd = 0; bool boss = false;
        foreach (var o in Unit.All) if (o.team == 1 && !o.Dead && (o.transform.position - target.position).sqrMagnitude < 100f) { crowd++; boss |= o.boss; }
        float want = boss ? 1.12f : Mathf.Lerp(.82f, 1.08f, Mathf.Clamp01(crowd / 8f)); zoom = Mathf.Lerp(zoom <= 0 ? want : zoom, want, Mathf.Min(1, Time.unscaledDeltaTime * 1.2f));
        float k = (portrait ? 1.35f : 1f) * zoom * debugZoom;
        cur = Vector3.Lerp(cur == Vector3.zero ? target.position : cur, target.position, Mathf.Min(1, Time.unscaledDeltaTime * 6));
        Vector3 s = shake > 0 ? Random.insideUnitSphere * shake * .3f : Vector3.zero; shake = Mathf.Max(0, shake - Time.unscaledDeltaTime * 2.2f);
        if (QQMission.I) yaw = 180f; var rot = Quaternion.Euler(0, yaw, 0);
        bool blocked = QQObstacles.Blocks(cur + rot * new Vector3(0, 0, -back * k), cur); lift = Mathf.MoveTowards(lift, blocked ? 1f : 0f, Time.unscaledDeltaTime * 1.5f);
        transform.position = cur + rot * new Vector3(0, height * k * (1f + .7f * lift), -back * k * (1f - .4f * lift)) + s;
        transform.LookAt(cur + rot * new Vector3(0, lookY, 1.8f));
        QQFx.Tick();
    }
}
