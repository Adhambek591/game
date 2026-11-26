# 4K bakes of the unique sets on the CPU (UE may be rendering), then nothing else. Progress: out\chain_log.txt
Set-Location F:\qirq-qiz\tools\blender\surtaysha_final
$env:SUR_DESIGN_K='1.0482'; Remove-Item Env:SUR_BAKE_CPU -ErrorAction SilentlyContinue
Set-Content out\chain_log.txt ("{0} bake start" -f (Get-Date -Format HH:mm:ss))
& powershell -ExecutionPolicy Bypass -File bl.ps1 'out\bake_log.txt' -b -t 8 'out\armor_low.blend' --python bake_unique.py -- 'T_Armor,T_Cloth' 4096 | Out-File out\chain_bl.txt
Add-Content out\chain_log.txt ("{0} bake process ended" -f (Get-Date -Format HH:mm:ss))
