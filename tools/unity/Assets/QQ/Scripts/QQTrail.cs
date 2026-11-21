// Sword trail on while the fighter is in a swing (busy, and not rolling, casting or flinching).
using UnityEngine;

public class QQTrail : MonoBehaviour
{
    public TrailRenderer tr; Unit u;
    void Update()
    {
        if (!u) u = GetComponent<Unit>(); if (!tr || !u) return;
        if (!u.isPlayer && !u.boss) { tr.emitting = false; enabled = false; return; }   // only Gúlayım and bosses: a ribbon on every soldier is noise
        string c = u.rig ? u.rig.Current : "";
        tr.emitting = u.busy > .05f && u.stun <= 0 && !u.Dead && c != "roll" && c != "cast" && c != "hit";
    }
}
