# Run one UE job at BelowNormal priority and wait.  Usage:
#   ue_run.ps1 py <script.py> <steps> [tag]          (headless python, rendering-capable offscreen)
#   ue_run.ps1 mrq <level> <sequence> <config> [tag] (command-line Movie Render Queue)
param([string]$mode, [string]$a, [string]$b, [string]$c = '', [string]$d = 'harakat')
$exe = 'F:\Unreal\UE_5.8\Engine\Binaries\Win64\UnrealEditor-Cmd.exe'
$proj = '"F:\UnrealProjects\QQ_MetaHuman\QQ_MetaHuman.uproject"'
if (Get-Process UnrealEditor*, UnrealEditor-Cmd* -ErrorAction SilentlyContinue | Where-Object { $_.Path -like 'F:\Unreal\UE_5.8*' -and ($_.CommandLine -notlike '*OrolStrike*') -and ($_.CommandLine -like '*QQ_MetaHuman*') }) { Write-Output 'QQ UE already running'; exit 2 }
if ($mode -eq 'py') {
    $env:QQ_STEPS = $b; if ($c) { $env:QQ_TAG = $c }
    $args2 = @($proj, "-ExecutePythonScript=`"$a`"", '-unattended', '-nosplash', '-RenderOffscreen', "-log=QQ_py.log")
} else {
    $args2 = @($proj, $a, '-game', "-LevelSequence=`"$b`"", "-MoviePipelineConfig=`"$c`"", '-windowed', '-resx=1280', '-resy=720', '-RenderOffscreen', '-unattended', '-nosplash', '-NoLoadingScreen', '-NoTextureStreaming', "-log=QQ_mrq.log")
}
$p = Start-Process -FilePath $exe -ArgumentList $args2 -PassThru -WindowStyle Hidden
Start-Sleep 2; try { $p.PriorityClass = 'BelowNormal' } catch {}
$p.WaitForExit(3500000) | Out-Null
Write-Output ("exit " + $p.ExitCode)
