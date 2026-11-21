import re,glob,time,sys
root='/home/user/website-5ef0831fd120367c52df72c9/app/public/'
v=str(int(time.time()))
pat=re.compile(r"""((?:\.\.?/)[\w/.\-]+\.(?:js|glb))(\?v=\d+)?(['"])""")
for f in glob.glob(root+'js/*.js')+[root+'index.html']:
    s=open(f).read(); s2=pat.sub(lambda m:m.group(1)+'?v='+v+m.group(3),s)
    s2=re.sub(r"(\+ '\.glb)(\?v=\d+)?'", r"\1?v="+v+"'", s2)
    if s2!=s: open(f,'w').write(s2)
print(v)
