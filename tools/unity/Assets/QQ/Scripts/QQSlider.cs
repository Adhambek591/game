// Tap / drag along a bar to set a 0..1 value (settings volume rows).
using UnityEngine;
using UnityEngine.EventSystems;

public class QQSlider : MonoBehaviour, IPointerDownHandler, IDragHandler
{
    public System.Action<float> onValue;
    public void OnPointerDown(PointerEventData e) { OnDrag(e); }
    public void OnDrag(PointerEventData e)
    {
        var r = (RectTransform)transform; Vector2 lp; RectTransformUtility.ScreenPointToLocalPointInRectangle(r, e.position, e.pressEventCamera, out lp);
        float v = Mathf.Clamp01(lp.x / r.rect.width + .5f); if (onValue != null) onValue(v);
    }
}
