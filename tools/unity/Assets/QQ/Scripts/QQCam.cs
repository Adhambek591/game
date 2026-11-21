// Follow camera matched to the browser build's graphics pass: low, cinematic, 34° lens in landscape.
using UnityEngine;

public class QQCam : MonoBehaviour
{
    public Transform target; Vector3 cur; public float height = 7.4f, back = 13.4f, lookY = 1.4f;
    public static float shake;

    void LateUpdate()
    {
        if (!target) return;
        var c = GetComponent<Camera>(); bool portrait = Screen.height > Screen.width; c.fieldOfView = portrait ? 50f : 34f;
        float k = portrait ? 1.35f : 1f;
        cur = Vector3.Lerp(cur == Vector3.zero ? target.position : cur, target.position, Mathf.Min(1, Time.deltaTime * 6));
        Vector3 s = shake > 0 ? Random.insideUnitSphere * shake * .3f : Vector3.zero; shake = Mathf.Max(0, shake - Time.deltaTime * 1.6f);
        transform.position = cur + new Vector3(0, height * k, -back * k) + s;
        transform.LookAt(cur + new Vector3(0, lookY, 1.8f));
        QQFx.Tick();
    }
}
