# Run Blender 5.1 headless at BelowNormal priority, log to a file, wait for it.
# powershell -File bl.ps1 <logfile> <blender args...>
$Log = $args[0]
$BArgs = $args[1..($args.Count - 1)]
$env:PYTHONUNBUFFERED = "1"
$B = "C:\Program Files\Blender Foundation\Blender 5.1\blender.exe"
$q = $BArgs | ForEach-Object { if ($_ -match '\s') { '"' + $_ + '"' } else { $_ } }
$p = Start-Process -FilePath $B -ArgumentList ($q -join ' ') -NoNewWindow -PassThru `
     -RedirectStandardOutput $Log -RedirectStandardError ($Log + '.err')
try { $p.PriorityClass = 'BelowNormal' } catch {}
$p.WaitForExit()
Write-Output ("exit " + $p.ExitCode + " pid " + $p.Id)
