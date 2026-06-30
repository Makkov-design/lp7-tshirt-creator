$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

function Get-TelegramProcess {
  $proc = Get-Process -Name 'Telegram' -ErrorAction SilentlyContinue |
    Where-Object { $_.MainWindowHandle -ne 0 } |
    Select-Object -First 1

  if (-not $proc) {
    $exe = Join-Path $env:APPDATA 'Telegram Desktop\Telegram.exe'
    Start-Process -FilePath $exe | Out-Null
    Start-Sleep -Seconds 4
    $proc = Get-Process -Name 'Telegram' -ErrorAction Stop |
      Where-Object { $_.MainWindowHandle -ne 0 } |
      Select-Object -First 1
  }

  if (-not $proc) {
    throw 'Telegram Desktop window not found.'
  }

  return $proc
}

function Focus-TelegramWindow {
  param([System.Diagnostics.Process]$Process)
  $wshell = New-Object -ComObject WScript.Shell
  [void]$wshell.AppActivate($Process.Id)
  Start-Sleep -Milliseconds 600
}

function Send-Keys {
  param([string]$Keys)
  $wshell = New-Object -ComObject WScript.Shell
  $wshell.SendKeys($Keys)
}

function Get-SearchEdit {
  param([System.Windows.Automation.AutomationElement]$Root)

  $editCondition = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    [System.Windows.Automation.ControlType]::Edit
  )

  $matches = $Root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $editCondition)
  for ($i = 0; $i -lt $matches.Count; $i++) {
    $candidate = $matches.Item($i)
    if ($candidate.Current.ClassName -like '*Inner') {
      return $candidate
    }
  }

  for ($i = 0; $i -lt $matches.Count; $i++) {
    $candidate = $matches.Item($i)
    if ($candidate.Current.Name -eq 'Search') {
      return $candidate
    }
  }

  throw 'Telegram search edit was not found.'
}

function Open-Chat {
  param([string]$ChatTitle)

  $proc = Get-TelegramProcess
  Focus-TelegramWindow -Process $proc
  $root = [System.Windows.Automation.AutomationElement]::FromHandle($proc.MainWindowHandle)
  $search = Get-SearchEdit -Root $root
  $search.SetFocus()
  Start-Sleep -Milliseconds 150
  $value = $search.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
  $value.SetValue($ChatTitle)
  Start-Sleep -Milliseconds 700
  Send-Keys('~')
  Start-Sleep -Seconds 1
  Send-Keys('^{END}')
  Start-Sleep -Milliseconds 400
}

function Get-VisibleText {
  $proc = Get-TelegramProcess
  $root = [System.Windows.Automation.AutomationElement]::FromHandle($proc.MainWindowHandle)
  $all = $root.FindAll(
    [System.Windows.Automation.TreeScope]::Descendants,
    [System.Windows.Automation.Condition]::TrueCondition
  )

  $lines = New-Object System.Collections.Generic.List[string]
  for ($i = 0; $i -lt $all.Count; $i++) {
    $name = ([string]$all.Item($i).Current.Name).Trim()
    if ((-not $all.Item($i).Current.IsOffscreen) -and -not [string]::IsNullOrWhiteSpace($name)) {
      $lines.Add($name)
    }
  }
  return $lines
}

foreach ($chat in @('Telegram', '777000')) {
  try {
    Open-Chat -ChatTitle $chat
    $lines = Get-VisibleText
    $matches = $lines | Where-Object {
      $_ -match '(?i)(login code|код для вход[ау]).*\b\d{5,6}\b' -or
      $_ -match '\b\d{5,6}\b'
    } | Select-Object -Unique

    Write-Host "[$chat]"
    if ($matches) {
      $matches | ForEach-Object { Write-Host $_ }
    }
    else {
      Write-Host 'no visible login-code text matched'
    }
  }
  catch {
    Write-Host "[$chat] error: $($_.Exception.Message)"
  }
}
