# Guloyim on Ada's exact body: 4K texture sources, then the turn + face + neck close-ups on white.
New-Item -ItemType Directory -Force F:\qirq-qiz-unity\Builds\gada3 | Out-Null
Remove-Item Env:QQ_DJOBS -ErrorAction SilentlyContinue; Remove-Item Env:QQ_GX_EXPS -ErrorAction SilentlyContinue
$env:QQ_PURE='none'; $env:QQ_TEX_CHARS='MHC_gulayim_ada'
$env:QQ_TURN_FILE='F:/qirq-qiz/tools/metahuman/out/turn_ga3.json'
$env:QQ_BG_WHITE='6.0'; $env:QQ_ALLROUND='2.5'; $env:QQ_ALLROUND_SHADOW='1'; $env:QQ_KEY='3.2'; $env:QQ_FILL='1.8'; $env:QQ_SHOT_EXPO='0.8'; $env:QQ_WARM_S='300'
$env:QQ_RES='1536'; $env:QQ_RES_H='2304'; $env:QQ_SHOT_DIR='F:/qirq-qiz-unity/Builds/gada3'
& F:\qirq-qiz\tools\metahuman\ue_run.ps1 py F:/qirq-qiz/tools/metahuman/mh_beauty.py 'pure,turn'
