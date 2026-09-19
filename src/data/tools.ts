/**
 * Tool registry — the single source of truth for every tool page.
 *
 * Rules enforced by tests (tests/registry.test.ts):
 * - unique slug, unique title, unique metaDescription
 * - every `related` reference exists, max 3, no self-reference
 * - FAQ answers are answer-first and non-empty
 * - `lastReviewed` is an ISO date
 */

export type ToolCategory =
  | 'optimize'
  | 'resize'
  | 'convert'
  | 'prepare'
  | 'inspect'
  | 'developer';

export interface ToolFaq {
  q: string;
  a: string;
}

export interface ToolEntry {
  slug: string;
  name: string;
  short: string;
  category: ToolCategory;
  title: string;
  metaDescription: string;
  h1: string;
  sub: string;
  accepts: string;
  limitsNote: string;
  how: string[];
  methodology: string[];
  limitations: string[];
  faq: ToolFaq[];
  related: string[];
  lastReviewed: string;
  applicationCategory: string;
  ui: string;
  searchIntent: string;
}

export const TOOL_CATEGORIES: { id: ToolCategory; label: string }[] = [
  { id: 'optimize', label: 'Compress & optimize' },
  { id: 'resize', label: 'Resize & crop' },
  { id: 'convert', label: 'Convert format' },
  { id: 'prepare', label: 'Prepare for forms' },
  { id: 'inspect', label: 'Inspect & check' },
  { id: 'developer', label: 'For developers' },
];

export const LAST_REVIEWED = '2026-09-19';

export const TOOLS: ToolEntry[] = [
  {
    slug: 'compress-image-to-size',
    name: 'Compress to exact size',
    short: 'Hit a target file size like 50 KB or 200 KB with the best quality that fits.',
    category: 'optimize',
    title: 'Compress Image to Exact Size (KB) - Free, No Upload',
    metaDescription:
      'Compress any image to a target file size like 50 KB or 100 KB. Local in-browser processing, best quality that fits the limit, no upload and no signup.',
    h1: 'Compress an image to an exact file size',
    sub: 'Set a target like 50 KB, 100 KB or 1 MB. The optimizer finds the highest quality that stays at or under your limit, and reports exactly what it achieved.',
    accepts: 'JPEG, PNG, WebP, AVIF and GIF (first frame).',
    limitsNote: 'Best with files up to 50 MB. Hard safety limit 200 MB.',
    how: [
      'Drop your image and type the target size (for example 50 KB or 0.5 MB).',
      'The tool runs a quality search entirely on your device and picks the best result that fits.',
      'If the target cannot be reached without visibly damaging the image, you are told exactly that — with the option to allow reducing pixel dimensions.',
      'Download the result with a clear before/after report.',
    ],
    methodology: [
      'Formats with a quality parameter (JPEG, WebP, AVIF) are optimized with a bounded binary search between quality 0.05 and 0.95, capped at 14 encode passes. The search keeps the highest quality whose encoded size stays at or under your target.',
      'The search stops early once the result lands within the closer of 2% of the target or 1 KB, so typical runs finish in a few passes.',
      'If even the lowest quality stays above the target, the tool reports the achievable floor. Dimension reduction is applied only when you explicitly enable it, using a descending scale ladder (90% → 30%); the chosen scale is shown in the report.',
      'PNG (lossless) cannot be quality-tuned. Targets that require shrinking a PNG are handled through optional dimension reduction, or by converting to JPEG/WebP when you allow it.',
      'All processing happens in your browser. No image data, filename or pixel content is transmitted.',
    ],
    limitations: [
      'No tool can guarantee a mathematically exact size: encoders quantize output, so results land at or just under the target — never at "exactly 50.000 KB".',
      'Extremely small targets (for example 10 KB for a 12-megapixel photo) can only be met with visible quality loss or smaller dimensions. The tool reports which one is required instead of silently degrading your image.',
      'Animated GIF/WebP files are processed as their first frame.',
    ],
    faq: [
      { q: 'Does this tool upload my image?', a: 'No. The image is decoded, re-encoded and optimized entirely inside your browser tab. Nothing is uploaded, and the page works offline once loaded.' },
      { q: 'Can you make the file exactly 50 KB?', a: 'No honest tool can hit an exact byte count, because image encoders quantize their output. This tool maximizes quality subject to the limit — so you get the best-looking image that is at or under 50 KB, typically within a few percent of the target.' },
      { q: 'What happens if my target is impossible at full dimensions?', a: 'The tool shows the smallest achievable size at your current pixel dimensions. You then choose: accept the floor result, or explicitly allow dimension reduction and let the optimizer try again.' },
      { q: 'Will you ever shrink my image without asking?', a: 'Never. Dimension reduction is off by default and only applies when you enable it for that run.' },
      { q: 'Which formats work best for very small targets?', a: 'JPEG and WebP usually reach small targets with the most acceptable quality. PNG is lossless and often cannot reach aggressive targets without reducing dimensions; the tool will tell you when that is the case.' },
    ],
    related: ['compress-image', 'resize-image', 'signature-resizer'],
    lastReviewed: LAST_REVIEWED,
    applicationCategory: 'UtilitiesApplication',
    ui: 'compress-size',
    searchIntent: 'compress image to [X] kb / reduce image to target size',
  },
  {
    slug: 'resize-image',
    name: 'Resize image',
    short: 'Set exact pixel dimensions, percentage, or width/height with aspect control.',
    category: 'resize',
    title: 'Resize Image to Exact Pixels - Free, No Upload',
    metaDescription:
      'Resize any image to exact pixel dimensions like 600x600, by percentage, or by width/height. Aspect ratio lock, fit or fill modes, local and private.',
    h1: 'Resize an image to exact dimensions',
    sub: 'Enter target pixels (600 x 600), a percentage, or just a width or height. Choose whether the result must fit, fill or stretch — the output contract is explicit, never guessed.',
    accepts: 'JPEG, PNG, WebP, AVIF and GIF (first frame).',
    limitsNote: 'Best with files up to 50 MB. Hard safety limit 200 MB.',
    how: [
      'Drop your image — original dimensions are detected automatically.',
      'Type the output size in pixels or percent. Aspect ratio stays locked unless you unlock it.',
      'Choose the output contract: fit within (letterbox-free, keeps ratio), fill by cropping, or stretch to exactly the numbers you typed.',
      'Download the resized image with a before/after comparison.',
    ],
    methodology: [
      'Chromium-class browsers decode with high-quality smoothing by default; the tool additionally follows the browser image-smoothing settings per resize step to avoid double-scaling artifacts.',
      'Downscaling is performed in a single high-quality draw call. Upscaling is allowed but clearly labeled — enlarging cannot create detail.',
      'When "fill" mode is selected, the crop region is centered by default; you can fine-tune the position in the crop tool, which this page links to.',
      'Transparency is preserved for PNG and WebP outputs. GIF animation is not preserved (first frame).',
    ],
    limitations: [
      'Upscaling produces a larger file, not more detail.',
      'Resizing does not change DPI metadata — see the DPI tool for print size.',
      'Animated formats are processed as their first frame.',
    ],
    faq: [
      { q: 'What does "exactly 600 x 600" mean here?', a: 'You choose one of three contracts: fit within 600x600 (keeps the whole image, output may be 600x450), fill/crop to 600x600 (keeps ratio, crops edges), or stretch to exactly 600x600 (distorts if the ratio differs). The contract you pick is what you get.' },
      { q: 'Does resizing reduce quality?', a: 'Downscaling with high-quality smoothing looks clean. Upscaling adds pixels but no real detail, so avoid it for print.' },
      { q: 'Is the aspect ratio preserved?', a: 'Yes, by default. The ratio lock keeps width and height proportional; unlock it deliberately if your destination requires a different shape.' },
      { q: 'Does this upload my photo?', a: 'No. Decoding, scaling and encoding all happen on your device.' },
    ],
    related: ['compress-image-to-size', 'crop-image', 'signature-resizer'],
    lastReviewed: LAST_REVIEWED,
    applicationCategory: 'UtilitiesApplication',
    ui: 'resize',
    searchIntent: 'resize image to [X]x[Y] pixels / percentage',
  },
  {
    slug: 'convert-image',
    name: 'Convert image',
    short: 'JPG, PNG, WebP, AVIF — convert, with resize in the same pass if you want.',
    category: 'convert',
    title: 'Convert Image Format (JPG, PNG, WebP, AVIF)',
    metaDescription:
      'Convert images between JPG, PNG, WebP and AVIF in your browser. Optionally resize or compress in the same pass. No upload, no watermark, no signup.',
    h1: 'Convert an image to another format',
    sub: 'Pick an output format — JPEG, PNG, WebP or AVIF. Options such as quality, transparency flattening and optional resizing are applied in one pass.',
    accepts: 'JPEG, PNG, WebP, AVIF, GIF (first frame), BMP. HEIC/HEIF only where the browser itself can decode it.',
    limitsNote: 'Best with files up to 50 MB. Hard safety limit 200 MB.',
    how: [
      'Drop your image. The detected format is shown before you convert.',
      'Choose the output format. Unsupported output formats are hidden rather than offered and failing later.',
      'Optionally set quality, a background color (when converting transparency to JPEG), or target dimensions.',
      'Download the converted file — metadata is stripped as part of conversion.',
    ],
    methodology: [
      'Encoding uses the browser canvas encoder. Before offering AVIF or WebP as outputs, the page probes actual encoder support in your browser — the list only shows formats that will really work.',
      'Converting an image with transparency to JPEG flattens it onto a background color you choose (default white). Without flattening, transparent areas would render as black.',
      'Conversion output is re-encoded from decoded pixels, which removes EXIF/GPS metadata as a side effect. If you need the metadata gone explicitly, the metadata tool verifies it for you.',
      'HEIC/HEIF detection is honest: on browsers that cannot decode it (most non-Safari browsers), you get a precise explanation instead of a generic error.',
    ],
    limitations: [
      'Animated formats are converted as their first frame.',
      'AVIF and WebP encoding availability depends on your browser version; the UI disables what is not supported.',
      'Converting to PNG from a lossy source does not restore lost quality — it only changes the container.',
    ],
    faq: [
      { q: 'Which conversions are supported?', a: 'Any decode-supported input to JPEG, PNG, WebP or AVIF — including BMP and GIF inputs. HEIC/HEIF input works only in browsers that decode it natively (Safari on macOS/iOS, some others).' },
      { q: 'My HEIC file fails — why?', a: 'Most browsers besides Safari cannot decode HEIC images at all; that is a browser limitation. The tool detects this and explains it, rather than pretending the file is corrupt.' },
      { q: 'Does converting remove my metadata?', a: 'Yes — re-encoding rebuilds the file from decoded pixels, so EXIF/GPS are not carried over. Use the metadata tool if you want to verify before and after.' },
      { q: 'Will converting to WebP break compatibility?', a: 'WebP is supported by every current major browser. For maximum compatibility with old software or strict upload portals, JPEG or PNG remain the safest choices.' },
    ],
    related: ['compress-image', 'image-metadata', 'image-to-base64'],
    lastReviewed: LAST_REVIEWED,
    applicationCategory: 'MultimediaApplication',
    ui: 'convert',
    searchIntent: 'convert png to jpg / image converter / heic to jpg',
  },
  {
    slug: 'crop-image',
    name: 'Crop image',
    short: 'Crop to 1:1, 4:5, 16:9 or any custom ratio with exact numeric control.',
    category: 'resize',
    title: 'Crop Image to Any Aspect Ratio (1:1, 4:5, 16:9)',
    metaDescription:
      'Crop images to square, 4:5, 16:9, 9:16, 3:2 or a custom ratio. Drag handles or type exact crop coordinates. Local, private, no upload.',
    h1: 'Crop an image to any aspect ratio',
    sub: 'Drag the crop frame or set exact coordinates. Lock ratios for 1:1, 4:5, 16:9, 9:16, 3:2 — or any custom value.',
    accepts: 'JPEG, PNG, WebP, AVIF and GIF (first frame).',
    limitsNote: 'Best with files up to 50 MB. Hard safety limit 200 MB.',
    how: [
      'Drop your image — it appears on a crop canvas with a movable frame.',
      'Pick a ratio preset or free crop, and position the frame by dragging (or arrow-key adjustments).',
      'Prefer precision? Type the crop rectangle coordinates directly and the frame follows.',
      'Download the cropped result — by default the output is the crop region at full resolution.',
    ],
    methodology: [
      'The crop is defined as a rectangle in source-image coordinates, so the output is pixel-exact: a 1200x800 crop is exactly 1200x800 in the result.',
      'Ratio presets lock the rectangle height to width × ratio while dragging and while typing coordinates.',
      'The preview canvas scales to the viewport but the crop math always runs on original pixels.',
    ],
    limitations: [
      'Cropping removes content outside the rectangle — there is no "uncrop" from a cropped file.',
      'Rotation is not part of this tool (not in MVP).',
      'Animated formats are cropped as their first frame.',
    ],
    faq: [
      { q: 'What is the difference between crop and resize?', a: 'Crop removes pixels outside a chosen rectangle and keeps the rest at original resolution. Resize changes pixel dimensions of the whole image. To get an exact platform size, crop to the ratio first and resize second — the tool links both flows.' },
      { q: 'Can I crop to a specific pixel size?', a: 'Yes — set a ratio, then type the exact crop width; the height follows the ratio. The output matches the crop rectangle exactly.' },
      { q: 'Can I crop precisely with the keyboard?', a: 'Yes. Every crop field (x, y, width, height) is a normal input, and the frame can be nudged with arrow keys. The mouse is a convenience — not a requirement.' },
    ],
    related: ['resize-image', 'social-image-resizer'],
    lastReviewed: LAST_REVIEWED,
    applicationCategory: 'DesignApplication',
    ui: 'crop',
    searchIntent: 'crop image to 1:1 / 4:5 / aspect ratio cropper',
  },
  {
    slug: 'compress-image',
    name: 'Compress image',
    short: 'Quality modes with a clear before/after report — no target size needed.',
    category: 'optimize',
    title: 'Compress Image Online - Free, No Upload',
    metaDescription:
      'Compress JPEG, PNG, WebP and AVIF images with Light, Standard or Aggressive quality modes. Works locally in your browser. No upload, no limits, no signup.',
    h1: 'Compress an image',
    sub: 'Choose how aggressive the compression should be — or slide quality manually. You get a clear report of bytes saved, dimensions and format.',
    accepts: 'JPEG, PNG, WebP, AVIF and GIF (first frame).',
    limitsNote: 'Best with files up to 50 MB. Hard safety limit 200 MB.',
    how: [
      'Drop your image.',
      'Pick a quality mode: Light (visually near-identical), Standard (recommended), Aggressive (smallest usable), or set quality manually.',
      'Compress and review the before/after numbers.',
      'If you need a specific limit, jump to the exact-size compressor with your settings intact.',
    ],
    methodology: [
      'Light ≈ quality 0.9, Standard ≈ 0.8, Aggressive ≈ 0.6 for quality-capable formats. The exact value used is shown in the report.',
      'Transparent images default to WebP output when you ask for maximum savings without losing transparency; otherwise PNG output keeps lossless behavior.',
      'PNG inputs that would grow from re-encoding are returned unchanged, with an explanation — the tool never returns a bigger file silently.',
    ],
    limitations: [
      'No visible size guarantee by design — use the exact-size compressor when a numeric limit is required.',
      'GIF animation is not preserved (first frame only).',
    ],
    faq: [
      { q: 'Will compression visibly damage my image?', a: 'At Standard quality, most photos show no visible difference at normal viewing sizes. Aggressive mode trades some quality for size; the tool always lets you compare before downloading.' },
      { q: 'How is this different from the exact-size compressor?', a: 'This tool optimizes for quality at a chosen level. The exact-size tool optimizes for a byte limit you type. Both share the same engine — pick based on whether you know your limit.' },
      { q: 'Does it work on PNG?', a: 'Yes, but PNG is lossless, so gains are smaller or require converting to WebP/JPEG. The tool reports when a PNG cannot shrink without format change.' },
    ],
    related: ['compress-image-to-size', 'convert-image', 'image-size-checker'],
    lastReviewed: LAST_REVIEWED,
    applicationCategory: 'UtilitiesApplication',
    ui: 'compress',
    searchIntent: 'compress image / image compressor online',
  },
  {
    slug: 'image-size-checker',
    name: 'Image size checker',
    short: 'Instant report: file size, pixels, ratio, megapixels, metadata, print size.',
    category: 'inspect',
    title: 'Image Size Checker - Dimensions, DPI & EXIF',
    metaDescription:
      'Check any image: file size, pixel dimensions, aspect ratio, megapixels, format, transparency and EXIF presence. Private, instant, works fully offline.',
    h1: 'Image size and dimensions checker',
    sub: 'Everything about a file, before you upload it somewhere: bytes, pixels, ratio, megapixels, format, transparency, metadata presence and print size.',
    accepts: 'JPEG, PNG, WebP, AVIF, GIF, BMP — even when you are not sure what your file is.',
    limitsNote: 'Full read-only analysis; works with files up to 200 MB.',
    how: [
      'Drop (or paste) any image file.',
      'The checker reads the header and pixel data locally — no upload.',
      'Review file size, dimensions, ratio, megapixels, format, MIME type, transparency, metadata presence and print size at 300/150 DPI.',
    ],
    methodology: [
      'Dimensions and format are read from the file header (PNG IHDR, JPEG SOF, WebP VP8/VP8L/VP8X, GIF logical screen descriptor) and cross-checked against actual decode results.',
      'Metadata presence (EXIF, GPS, XMP, PNG text chunks) is detected by parsing the file structure locally; GPS values are shown to you and never transmitted anywhere.',
      'Print size estimates assume the standard 300 DPI (print) and 150 DPI (large format) references, clearly labeled as estimates.',
    ],
    limitations: [
      'Print size is an arithmetic estimate from pixels and reference DPI — it does not know your print shop requirements.',
      'HEIC files show metadata only in browsers that can decode them.',
    ],
    faq: [
      { q: 'Can I check an image without modifying it?', a: 'Yes — this tool is read-only. Nothing is changed, nothing is uploaded, and it works as a sanity check before any other tool.' },
      { q: 'What does "megapixels" mean?', a: 'Width × height in millions of pixels. A 4032×3024 photo is about 12.2 megapixels. More megapixels allow larger prints, not necessarily better photos.' },
      { q: 'Does the checker tell me if my photo has GPS data?', a: 'Yes, it detects whether location metadata is present and shows the values locally, so you can decide whether to strip it with the metadata tool.' },
      { q: 'Is there a file size limit?', a: 'No practical limit for reading — even 200 MB files are inspected. The analysis works on both mobile and desktop browsers.' },
    ],
    related: ['compress-image', 'image-dpi', 'image-to-base64'],
    lastReviewed: LAST_REVIEWED,
    applicationCategory: 'UtilitiesApplication',
    ui: 'inspect',
    searchIntent: 'image size checker / check image dimensions',
  },
  {
    slug: 'signature-resizer',
    name: 'Signature resizer',
    short: 'Exact pixels + maximum KB + background — ready for form uploads.',
    category: 'prepare',
    title: 'Signature Resizer for Forms (KB + Pixels)',
    metaDescription:
      'Resize a signature image for form uploads: exact pixels, maximum file size in KB, background color and JPG/PNG output. Local, private, no upload.',
    h1: 'Resize a signature for forms and applications',
    sub: 'Meet the usual form requirements in one pass: exact pixel size, a maximum KB, JPG or PNG output, and a clean background color.',
    accepts: 'JPEG, PNG, WebP, AVIF and photos of signatures. Transparent PNGs are supported and can be flattened onto a chosen background.',
    limitsNote: 'Best with files up to 50 MB. Hard safety limit 200 MB.',
    how: [
      'Drop a scan or photo of your signature.',
      'Set the required dimensions (for example 140 x 60 px), the maximum size (for example 20 KB) and the output format.',
      'Choose a background color for JPG output (white is the usual choice).',
      'Download a file that meets both constraints, or a clear explanation of the closest achievable result.',
    ],
    methodology: [
      'Pixel dimensions and the KB ceiling are applied in one pipeline: resize first, then optimize quality to fit the ceiling at the best quality that fits.',
      'Transparent signatures converted to JPEG are flattened onto the background color you choose, so no black boxes appear.',
      'No country- or form-specific preset pages exist by design: requirements vary and change, so the tool takes the exact numbers and explains the common cases.',
    ],
    limitations: [
      'Common form requirement patterns vary — always enter the exact numbers from your form, not from a blog post.',
      'Very small KB limits combined with large pixels may force gray-scale-like quality on detailed scans; the report shows what was achieved.',
    ],
    faq: [
      { q: 'My form says "signature 140x60 px, under 20 KB" — can you do both?', a: 'Yes. Enter 140 and 60 as dimensions and 20 KB as the limit. The tool resizes first, then finds the best quality that fits the KB ceiling, and reports the achieved size.' },
      { q: 'Should I upload a photo of a signature or a scan?', a: 'Both work. A scan or high-contrast photo on white paper produces the cleanest result. This tool only changes size and format — cleanup of shadows is out of scope.' },
      { q: 'Is my signature image uploaded anywhere?', a: 'No. Signature images are exactly the kind of private data that should stay local — processing happens entirely in your browser.' },
    ],
    related: ['resize-image', 'compress-image-to-size', 'social-image-resizer'],
    lastReviewed: LAST_REVIEWED,
    applicationCategory: 'UtilitiesApplication',
    ui: 'signature',
    searchIntent: 'signature resize / signature under [X] kb / [W]x[H] signature',
  },
  {
    slug: 'social-image-resizer',
    name: 'Social image resizer',
    short: 'Current platform sizes with crop + resize in one step, sources cited.',
    category: 'resize',
    title: 'Social Media Image Resizer (2026 Sizes)',
    metaDescription:
      'Resize images for Instagram, Facebook, X, LinkedIn, YouTube and TikTok with current sizes. One-click crop and resize, versioned presets with sources.',
    h1: 'Resize an image for social media',
    sub: 'Pick the platform and placement. The current size is applied with a center crop you can reposition first — presets are versioned and source-dated.',
    accepts: 'JPEG, PNG, WebP, AVIF and GIF (first frame).',
    limitsNote: 'Best with files up to 50 MB. Hard safety limit 200 MB.',
    how: [
      'Drop your image.',
      'Choose platform and format (for example Instagram post — 1080x1080).',
      'Reposition the crop if needed, then resize.',
      'Download the correctly sized file, plus a note of the exact spec used.',
    ],
    methodology: [
      'Presets live in a versioned config file (src/config/social-presets.ts) — each entry records the platform, dimensions, a source URL and the date it was last reviewed.',
      'Crop-then-resize pipeline ensures exact output dimensions without distortion.',
      'Platform names are used factually to describe sizes; there is no partnership or endorsement implied.',
    ],
    limitations: [
      'Platforms change their specifications. The review date on each preset tells you how fresh it is — if in doubt, check the linked source before posting something critical.',
      'The tool sizes images; it cannot preview how the platform will re-compress them after upload.',
    ],
    faq: [
      { q: 'How current are these sizes?', a: 'Each preset shows when it was last reviewed and links its source. Presets are updated as platforms change, but always treat platform documentation as the final word — links are provided on the page.' },
      { q: 'Why does Instagram sometimes crop my image?', a: 'Instagram keeps uploads up to 1080 px wide as long as the aspect ratio is between 1.91:1 and 3:4. Choose a preset inside that range (for example 1080x1350) and your image will not be cropped by the platform.' },
      { q: 'Does this tool post to social media?', a: 'No. It prepares the image file; you upload it yourself in the app or site. No social accounts are involved.' },
    ],
    related: ['crop-image', 'signature-resizer'],
    lastReviewed: LAST_REVIEWED,
    applicationCategory: 'UtilitiesApplication',
    ui: 'social',
    searchIntent: 'social media image resizer / instagram post size / youtube thumbnail size',
  },
  {
    slug: 'image-metadata',
    name: 'Metadata viewer & remover',
    short: 'See EXIF, GPS and software tags locally — then remove them with verification.',
    category: 'inspect',
    title: 'Image Metadata Viewer & Remover (EXIF, GPS)',
    metaDescription:
      'View EXIF, GPS and software metadata in photos and remove it locally. See exactly what is present before and after removal. No upload, fully private.',
    h1: 'View and remove image metadata',
    sub: 'Photos carry camera, software and sometimes GPS location data. See what your file contains — and remove it before sharing, with before/after verification.',
    accepts: 'JPEG (EXIF), PNG (text chunks), WebP and AVIF (container metadata detection; HEIC where the browser decodes it).',
    limitsNote: 'Metadata is parsed locally and never leaves your device.',
    how: [
      'Drop your image — the metadata summary appears immediately.',
      'Review camera, software, timestamps, orientation and GPS presence (values shown locally).',
      'Remove metadata with one click; the file is rebuilt from decoded pixels without the metadata block.',
      'Re-check in the same screen: the after-report verifies what was removed.',
    ],
    methodology: [
      'JPEG EXIF is parsed from the APP1 segment (TIFF-format IFD0 + GPS IFD); PNG text chunks are parsed natively; WebP/AVIF are checked at container level.',
      'Removal works by re-encoding decoded pixels into a fresh file — a reliable removal method across formats, unlike surgical tag deletion.',
      'Colorspace note: re-encoding through the browser canvas may interpret embedded color profiles; visible shifts are rare but possible in wide-gamut files. The before/after preview is shown for exactly this reason.',
    ],
    limitations: [
      'Re-encoding is lossy for JPEG output at low quality — target quality is kept high by default in this tool to protect fidelity.',
      'Some proprietary metadata blocks (for example maker notes) are removed along with the container metadata; the summary reports their presence beforehand.',
      'Animated files: first frame only.',
    ],
    faq: [
      { q: 'Is viewing metadata safe here?', a: 'Yes. Parsing happens in your browser with no network requests. GPS values, camera serials and timestamps stay on your device — this is the entire point of a local viewer.' },
      { q: 'What exactly gets removed?', a: 'The file is rebuilt from pixel data, so EXIF, GPS, camera identifiers, software tags and thumbnails embedded in metadata are not carried over. The before/after panel shows the change.' },
      { q: 'Why did my file size change after removal?', a: 'The file is re-encoded, which changes byte size (usually smaller). If size matters to you, follow up with the exact-size compressor.' },
    ],
    related: ['convert-image', 'image-dpi'],
    lastReviewed: LAST_REVIEWED,
    applicationCategory: 'UtilitiesApplication',
    ui: 'metadata',
    searchIntent: 'remove exif / view image metadata / remove location from photo',
  },
  {
    slug: 'image-dpi',
    name: 'DPI converter & print size',
    short: 'Correct PPI handling: embed print density and calculate physical sizes.',
    category: 'inspect',
    title: 'Image DPI Converter & Print Size Calculator',
    metaDescription:
      'Set print resolution (PPI/DPI) accurately and calculate print sizes from pixels. Explains exactly what DPI does — and does not do — to your image.',
    h1: 'DPI converter and print size calculator',
    sub: 'Mark an image for a target print resolution (for example 300 DPI) or calculate what physical size your pixels support. No fake "detail upgrade" claims.',
    accepts: 'JPEG (JFIF density embedding) and PNG (pHYs chunk embedding); all formats for the calculator.',
    limitsNote: 'Metadata marking does not alter pixels — see the explanation below.',
    how: [
      'Drop your image and read its pixel dimensions.',
      'Option A — Print size: enter a DPI and see the physical print size in inches/cm.',
      'Option B — Set DPI: write a density value into the file the way print workflows expect.',
      'For required print sizes, the calculator tells you how many pixels you actually need.',
    ],
    methodology: [
      'JPEG output: a JFIF APP0 density field (units = dots per inch) is applied to a re-encoded copy. PNG output: a pHYs chunk (pixels per meter) is written with a matching value.',
      'The pixels themselves are not resampled — DPI metadata tells print software how large to reproduce the image; it cannot add detail.',
      'The calculator uses the standard formula: print size (inches) = pixels ÷ DPI.',
    ],
    limitations: [
      'If the file must stay byte-identical apart from metadata, note that PNG/JPEG embedding re-encodes pixels (quality is kept high).',
      'Some apps ignore density metadata entirely and use raw pixels — that is app behavior, not a tool failure.',
      'Bitmap formats outside JPEG/PNG do not get a density field from this tool.',
    ],
    faq: [
      { q: 'Will changing DPI make my image print sharper?', a: 'No — and any tool that claims otherwise is misleading you. DPI is a print instruction. Sharpness comes from pixels: a 600x600 image prints sharp at 2x2 inches at 300 DPI, and nothing can add detail beyond the pixels you have.' },
      { q: 'My print shop asked for a 300 DPI file. What do I do?', a: 'Two steps: (1) check the required print size in inches, (2) use the calculator to see the pixel count needed (inches × 300). If your image has fewer pixels, it will be interpolated by the printer — use this tool to mark 300 DPI and note the real resolution honestly.' },
      { q: 'What is the difference between DPI and PPI?', a: 'Technically, images have PPI (pixels per inch) and printers have DPI (dots per inch). In everyday usage they are interchangeable — "300 DPI photo" means 300 PPI. This tool marks the standard density field understood by print workflows.' },
    ],
    related: ['image-size-checker', 'image-metadata'],
    lastReviewed: LAST_REVIEWED,
    applicationCategory: 'UtilitiesApplication',
    ui: 'dpi',
    searchIntent: '300 dpi converter / dpi to print size / change dpi of image',
  },
  {
    slug: 'image-to-base64',
    name: 'Image to Base64',
    short: 'Data URI and raw Base64 output with size math — fully offline.',
    category: 'developer',
    title: 'Image to Base64 Converter (Data URI)',
    metaDescription:
      'Convert an image to Base64 or a data URI locally in your browser. Raw output, size overhead math and copy-ready snippets for HTML and CSS. No upload.',
    h1: 'Convert an image to Base64',
    sub: 'Encode any image as raw Base64 or a ready-to-paste data URI — with the exact size overhead and snippet helpers. Nothing is uploaded.',
    accepts: 'Any image the browser can read: JPEG, PNG, WebP, AVIF, GIF, BMP.',
    limitsNote: 'Keep data URIs under roughly 2 MB of source image for sane HTML output.',
    how: [
      'Drop an image file.',
      'Copy the raw Base64 string or the full data URI for your language of choice.',
      'Check the size math: Base64 adds about 33% over raw bytes; the exact numbers are shown.',
    ],
    methodology: [
      'Encoding is done with the FileReader Base64 pipeline locally; the output string is byte-exact with standard Base64 (no line breaks in the copied value).',
      'Data URI format: data:[mime];base64,[payload] — the MIME type is detected from file content, not the extension.',
      'Size overhead note: Base64 encodes 3 bytes into 4 characters, hence ~33% growth (plus the data URI header).',
    ],
    limitations: [
      'Huge images inlined as data URIs make HTML/CSS heavy; prefer files + caching for production assets.',
      'Some environments cap string length; browsers handle multi-megabyte strings but editors may not.',
    ],
    faq: [
      { q: 'Is my image uploaded to a server?', a: 'No. The conversion runs in your browser with the standard FileReader API — useful when the file never should leave your machine.' },
      { q: 'When should I use a data URI instead of a file?', a: 'For small UI images, icons or single-file HTML/CSS where caching does not apply. For anything above roughly 10–20 KB, a separate file is usually faster to load.' },
      { q: 'Why is Base64 bigger than the file?', a: 'Base64 maps every 3 binary bytes to 4 text characters — about 33% larger. The tool shows the exact before/after byte counts.' },
    ],
    related: ['convert-image', 'image-size-checker'],
    lastReviewed: LAST_REVIEWED,
    applicationCategory: 'DeveloperApplication',
    ui: 'base64',
    searchIntent: 'image to base64 / data uri generator',
  },
];

export const TOOL_MAP: Map<string, ToolEntry> = new Map(TOOLS.map((t) => [t.slug, t]));

export function getTool(slug: string): ToolEntry | undefined {
  return TOOL_MAP.get(slug);
}

/** Curated homepage order — popularity and workflow logic, not alphabetical. */
export const HOMEPAGE_ORDER = [
  'compress-image-to-size',
  'compress-image',
  'resize-image',
  'convert-image',
  'crop-image',
  'social-image-resizer',
  'signature-resizer',
  'image-size-checker',
  'image-metadata',
  'image-dpi',
  'image-to-base64',
];

export function toolsByCategory(category: ToolCategory): ToolEntry[] {
  return TOOLS.filter((t) => t.category === category);
}
