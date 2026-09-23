# Generates the brand raster assets + the hero sample images.
#
# Why a script: the PNG/JPEG assets are committed, but they must be reproducible
# and must match the brand tokens in src/styles/global.css (accent = ink teal).
# Run with: npm run brand   (Windows PowerShell + System.Drawing, no dependencies)
#
# Outputs:
#   public/apple-touch-icon.png        180x180 brand mark (iOS home screen)
#   public/samples/example-photo.jpg   2400x1600 synthetic "photo" (hero example, before)
#   public/samples/example-photo-800w.jpg  800x533 version of the same image (after)
# The two sample files are synthetic (gradients/shapes) — no copyrighted material.
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$publicDir = Join-Path $root "public"
$samplesDir = Join-Path $publicDir "samples"
New-Item -ItemType Directory -Force $samplesDir | Out-Null

$accent = [System.Drawing.Color]::FromArgb(255, 11, 110, 99)   # --accent-solid (light)
$bg = [System.Drawing.Color]::FromArgb(255, 248, 250, 252)     # --bg (light)

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

function New-AppIcon {
    param([string]$Path)
    $size = 180
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::Transparent)
    $brush = New-Object System.Drawing.SolidBrush($accent)
    $g.FillRectangle($brush, 0, 0, $size, $size)
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, 17)
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawLine($pen, 54, 56, 54, 124)
    $g.DrawLine($pen, 87, 56, 132, 124)
    $g.DrawLine($pen, 132, 56, 87, 124)
    $pen.Dispose(); $brush.Dispose(); $g.Dispose()
    $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

function New-SamplePhoto {
    param([string]$Path)
    $w = 2400; $h = 1600
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
    $sky = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $rect,
        [System.Drawing.Color]::FromArgb(255, 12, 74, 110),
        [System.Drawing.Color]::FromArgb(255, 236, 168, 96),
        90)
    $g.FillRectangle($sky, $rect)
    $sun = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(210, 255, 226, 170))
    $g.FillEllipse($sun, $w * 0.66, $h * 0.14, $w * 0.16, $w * 0.16)
    $hillBack = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 24, 62, 74))
    $g.FillEllipse($hillBack, -$w * 0.15, $h * 0.52, $w * 1.0, $h * 0.9)
    $hillFront = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 13, 38, 52))
    $g.FillEllipse($hillFront, $w * 0.35, $h * 0.62, $w * 1.1, $h * 0.8)
    $water = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(150, 180, 230, 240))
    $g.FillRectangle($water, 0, [int]($h * 0.86), $w, [int]($h * 0.14))
    foreach ($i in 1..14) {
        $y = $h * 0.87 + ($i * 12)
        $x = ($i * 137) % $w
        $g.FillRectangle($water, $x, [int]$y, 180, 3)
    }
    $g.Dispose()
    Save-Jpeg -Bitmap $bmp -Path $Path -Quality 92
    $bmp.Dispose()
}

function New-ScaledJpeg {
    param([string]$Source, [string]$Path, [int]$Width, [int]$Height, [int]$Quality)
    $src = [System.Drawing.Image]::FromFile($Source)
    $dst = New-Object System.Drawing.Bitmap($Width, $Height)
    $g = [System.Drawing.Graphics]::FromImage($dst)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($src, 0, 0, $Width, $Height)
    $g.Dispose(); $src.Dispose()
    Save-Jpeg -Bitmap $dst -Path $Path -Quality $Quality
    $dst.Dispose()
}

New-AppIcon -Path (Join-Path $publicDir "apple-touch-icon.png")

$before = Join-Path $samplesDir "example-photo.jpg"
New-SamplePhoto -Path $before
New-ScaledJpeg -Source $before -Path (Join-Path $samplesDir "example-photo-800w.jpg") -Width 800 -Height 533 -Quality 72

Get-ChildItem (Join-Path $publicDir "apple-touch-icon.png"), $before, (Join-Path $samplesDir "example-photo-800w.jpg") |
    ForEach-Object { "{0,-28} {1,8:N0} bytes" -f $_.Name, $_.Length }
