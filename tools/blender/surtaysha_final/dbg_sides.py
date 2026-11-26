import bpy
for n in ('SUR_Bracer','SUR_Bracer_Gold','SUR_Bracer_Straps','SUR_Pauldron_Backing','SUR_Pauldron_Lamellar'):
    o=bpy.data.objects.get(n)
    if o: print('SIDES',n,'x>0',sum(1 for v in o.data.vertices if v.co.x>0),'x<0',sum(1 for v in o.data.vertices if v.co.x<0))
