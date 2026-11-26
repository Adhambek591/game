# Guloyim on the clean parametric body: solve to the reference tape measures (step gparam), then the white-background turn.
# One QQ UE instance; nothing else heavy at the same time.
param([string]$steps = 'gada,turn')
New-Item -ItemType Directory -Force F:\qirq-qiz-unity\Builds\gparam | Out-Null
Remove-Item Env:QQ_DJOBS -ErrorAction SilentlyContinue; Remove-Item Env:QQ_GX_EXPS -ErrorAction SilentlyContinue
$env:QQ_GP_CHAR='MHC_gulayim_final'
$env:QQ_TURN_FILE='F:/qirq-qiz/tools/metahuman/out/turn_ga.json'
$env:QQ_BG_WHITE='6.0'; $env:QQ_ALLROUND='2.5'; $env:QQ_ALLROUND_SHADOW='1'; $env:QQ_KEY='3.2'; $env:QQ_FILL='1.8'; $env:QQ_SHOT_EXPO='0.8'; $env:QQ_WARM_S='300'
$env:QQ_RES='1536'; $env:QQ_RES_H='2304'; $env:QQ_SHOT_DIR='F:/qirq-qiz-unity/Builds/gada'
& F:\qirq-qiz\tools\metahuman\ue_run.ps1 py F:/qirq-qiz/tools/metahuman/mh_beauty.py $steps
