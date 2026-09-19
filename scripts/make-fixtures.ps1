# Generates local test fixtures with System.Drawing (Windows PowerShell).
# All fixtures are synthetic (gradients/shapes) — no copyrighted material.
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$dir = Join-Path $root "tests\fixtures"
New-Item -ItemType Directory -Force $dir | Out-Null

function Save-Jpeg {
    param(
        [System.Drawing.Bitmap]$Bitmap,
        [string]$Path,
        [int]$Quality = 85
    )
    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
    $ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$Quality)
    $Bitmap.Save($Path, $codec, $ep)
}

function New-GradientJpeg {
    param([int]$Width, [int]$Height, [string]$Path, [int]$Quality = 85)
    $bmp = New-Object System.Drawing.Bitmap($Width, $Height)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $rect = New-Object System.Drawing.Rectangle(0, 0, $Width, $Height)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $rect,
        [System.Drawing.Color]::FromArgb(255, 32, 90, 180),
        [System.Drawing.Color]::FromArgb(255, 220, 120, 40),
        45)
    $g.FillRectangle($brush, $rect)
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, [Math]::Max(2, [int]($Width / 200)))
    $g.DrawEllipse($pen, $Width * 0.15, $Height * 0.2, $Width * 0.3, $Height * 0.3)
    $g.DrawLine($pen, 0, [int]($Height * 0.8), $Width, [int]($Height * 0.6))
    $font = New-Object System.Drawing.Font("Arial", [Math]::Max(14, [int]($Width / 24)), [System.Drawing.FontStyle]::Bold)
    $g.DrawString("ImgExact", $font, [System.Drawing.Brushes]::White, [float]($Width * 0.05), [float]($Height * 0.05))
    $g.Dispose()
    Save-Jpeg -Bitmap $bmp -Path $Path -Quality $Quality
    $bmp.Dispose()
}

function New-TransparentPng {
    param([int]$Width, [int]$Height, [string]$Path)
    $bmp = New-Object System.Drawing.Bitmap($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::Transparent)
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 37, 99, 235))
    $g.FillEllipse($brush, 0, 0, $Width, $Height)
    $brush.Dispose()
    $g.Dispose()
    $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

function New-OpaquePng {
    param([int]$Width, [int]$Height, [string]$Path)
    $bmp = New-Object System.Drawing.Bitmap($Width, $Height)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::FromArgb(255, 248, 250, 252))
    $font = New-Object System.Drawing.Font("Arial", 28, [System.Drawing.FontStyle]::Bold)
    $g.DrawString("300x200", $font, [System.Drawing.Brushes]::Black, 40, 80)
    $g.Dispose()
    $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

function New-OgImage {
    param([string]$Path)
    $width = 1200; $height = 630
    $bmp = New-Object System.Drawing.Bitmap($width, $height)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::FromArgb(255, 248, 250, 252))
    $accent = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 37, 99, 235))
    $g.FillRectangle($accent, 0, 0, $width, 14)
    $title = New-Object System.Drawing.Font("Segoe UI", 58, [System.Drawing.FontStyle]::Bold)
    $sub = New-Object System.Drawing.Font("Segoe UI", 26)
    $dark = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 15, 23, 42))
    $muted = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 100, 116, 139))
    $g.DrawString("ImgExact", $title, $dark, 80, 120)
    $g.DrawString("Make any image fit the exact requirement.", $sub, $muted, 84, 240)
    $g.DrawString("Resize - Compress - Convert - Crop. Local in your browser.", $sub, $muted, 84, 300)
    $badge = New-Object System.Drawing.Font("Segoe UI", 22, [System.Drawing.FontStyle]::Bold)
    $g.FillRectangle($accent, 84, 420, 460, 64)
    $g.DrawString("No upload. No signup.", $badge, [System.Drawing.Brushes]::White, 104, 434)
    $g.Dispose()
    $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

New-GradientJpeg -Width 64 -Height 64 -Path (Join-Path $dir "tiny-64x64.jpg") -Quality 70
New-GradientJpeg -Width 800 -Height 600 -Path (Join-Path $dir "gradient-800x600.jpg") -Quality 85
New-GradientJpeg -Width 4032 -Height 3024 -Path (Join-Path $dir "photo-4032x3024.jpg") -Quality 75
New-GradientJpeg -Width 2000 -Height 1500 -Path (Join-Path $dir "photo-2000x1500.jpg") -Quality 80
New-TransparentPng -Width 640 -Height 480 -Path (Join-Path $dir "transparent-640x480.png")
New-OpaquePng -Width 300 -Height 200 -Path (Join-Path $dir "opaque-300x200.png")
New-OgImage -Path (Join-Path $root "public\og-default.png")

Write-Host "Fixtures written to $dir"
Get-ChildItem $dir | ForEach-Object { "{0}  {1:N0} bytes" -f $_.Name, $_.Length }
