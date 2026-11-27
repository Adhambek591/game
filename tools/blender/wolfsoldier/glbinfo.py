import json, struct, sys
def info(p):
    b = open(p, 'rb').read(); n = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20 + n])
    print(p, len(b))
    print(' images', [(i.get('mimeType'), j['bufferViews'][i['bufferView']]['byteLength']) for i in j.get('images', [])])
    for s in j.get('skins', []): print(' joints', [j['nodes'][k]['name'] for k in s['joints']])
    for m in j['meshes']: print(' mesh', m.get('name'), [(list(p['attributes'].keys()), p.get('material')) for p in m['primitives']])
    print(' materials', [(m.get('name'), list(m.get('pbrMetallicRoughness', {}).keys()), [k for k in m if k.endswith('Texture')], m.get('extensions')) for m in j.get('materials', [])])
    print(' nodes', [(k, n.get('name'), n.get('scale'), n.get('rotation'), n.get('mesh'), n.get('skin')) for k, n in enumerate(j['nodes']) if 'mesh' in n or 'children' in n and len(n['children']) > 0 and n.get('name') in ('Armature', 'char1', 'Scene')][:6])
    print(' samplers', j.get('samplers'), 'textures', j.get('textures'), 'ext', j.get('extensionsUsed'))
for p in sys.argv[1:]: info(p)
