import sys
p = sys.argv[1]
L = open(p, encoding='utf-8').read().split('\n')
start = next(i for i, l in enumerate(L) if '// light: low warm sun' in l)
end = next(i for i, l in enumerate(L) if 'var gate = new GameObject("CampGate")' in l)
new = open(sys.argv[2], encoding='utf-8').read().rstrip('\n')
L[start:end] = new.split('\n')
s = '\n'.join(L)
s = s.replace("    static Texture2D[] Vars(", open(sys.argv[3], encoding='utf-8').read() + "\n    static Texture2D[] Vars(", 1)
s = s.replace("ti.anisoLevel = 8; ti.maxTextureSize = 1024;", "ti.anisoLevel = 8; ti.maxTextureSize = 2048;")
s = s.replace('var p = AssetDatabase.GUIDToAssetPath(g); var ti = AssetImporter.GetAtPath(p) as TextureImporter; if (!ti) continue;',
              'var p = AssetDatabase.GUIDToAssetPath(g); if (p.EndsWith(".png") || p.EndsWith(".hdr")) continue; var ti = AssetImporter.GetAtPath(p) as TextureImporter; if (!ti) continue;')
open(p, 'w', encoding='utf-8').write(s)
print('patched', start, end)
