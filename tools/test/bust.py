import re,glob,time,sys
root=(sys.argv[1].rstrip('/')+'/') if len(sys.argv)>1 else '/home/user/website-5ef0831fd120367c52df72c9/app/public/'   # usage: python bust.py [public_dir]
v=str(int(time.time()))
pat=re.compile(r"""((?:\.\.?/)[\w/.\-]+\.(?:js|glb))(\?v=\d+)?(['"])""")
for f in glob.glob(root+'js/*.js')+[root+'index.html']:
    s=open(f,encoding='utf-8',newline='').read(); s2=pat.sub(lambda m:m.group(1)+'?v='+v+m.group(3),s)
    s2=re.sub(r"(\+ '\.glb)(\?v=\d+)?'", r"\1?v="+v+"'", s2)
    if s2!=s: open(f,'w',encoding='utf-8',newline='').write(s2)
print(v)
