// UI art (Resources/ui, ported from the browser build's assets/img/ui): crisp, no mipmaps, no compression, clamped.
using UnityEditor;

public class QQUiImport : AssetPostprocessor
{
    void OnPreprocessTexture()
    {
        if (!assetPath.Replace('\\', '/').Contains("/Resources/ui/")) return;
        var ti = (TextureImporter)assetImporter;
        ti.textureType = TextureImporterType.Default; ti.mipmapEnabled = false; ti.alphaIsTransparency = true;
        ti.textureCompression = TextureImporterCompression.Uncompressed; ti.wrapMode = UnityEngine.TextureWrapMode.Clamp;
        ti.npotScale = TextureImporterNPOTScale.None; ti.filterMode = UnityEngine.FilterMode.Bilinear;
    }
}
