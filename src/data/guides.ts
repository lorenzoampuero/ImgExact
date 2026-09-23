/**
 * Guide registry — the informational content layer.
 *
 * Why guides exist at all: the tool pages are transactional ("do it for me").
 * These pages own informational intent ("explain it to me") that no tool page
 * can serve without turning into a keyword grab-bag.
 *
 * Governance (docs/SEO_PAGE_REGISTRY.md, rules 1-5):
 * - One informational intent per guide; nothing that a tool page already answers ≥80% of.
 * - No numeric variants, no platform landing pages, no country pages.
 * - Every section is prose a reader can act on; sources are linked and dated.
 * - Adding a guide = adding a row to docs/SEO_PAGE_REGISTRY.md in the same commit.
 *
 * Enforced by tests (tests/guides.test.ts).
 */

import type { ToolFaq } from './tools';

export interface GuideTable {
  columns: string[];
  rows: string[][];
}

export interface GuideSource {
  label: string;
  url: string;
}

export interface GuideSection {
  heading: string;
  paragraphs: string[];
  list?: string[];
  table?: GuideTable;
}

export interface GuideEntry {
  slug: string;
  /** <title>, without the brand suffix (BaseLayout appends it). */
  title: string;
  h1: string;
  metaDescription: string;
  /** Card text on the homepage. */
  summary: string;
  /** The search intent this guide owns — recorded so no tool page can claim it later. */
  intent: string;
  /** Why this is not a duplicate of an existing tool page (recorded decision). */
  cannibalization: string;
  published: string;
  lastReviewed: string;
  /** Tool slugs this guide hands off to. */
  related: string[];
  sections: GuideSection[];
  faq: ToolFaq[];
  sources: GuideSource[];
}

export const GUIDES_REVIEWED_AT = '2026-09-22';

export const GUIDES: GuideEntry[] = [
  {
    slug: 'image-compression-explained',
    title: 'Image Compression Explained (Lossy, Lossless, Exact KB)',
    h1: 'Image compression explained: lossy, lossless, and why no tool can hit an exact KB',
    metaDescription:
      'How image compression actually works: what lossy and lossless remove, what a quality setting means, and why "exactly 50 KB" is not achievable — explained plainly.',
    summary: 'What quality settings really do, and why "exactly 50 KB" does not exist.',
    intent: 'informational: how image compression works / what does quality 80 mean / why can no tool hit an exact size',
    cannibalization:
      'The compressors act on files. Nothing on the site explains the mechanism, which is the first thing people search before trusting a number. No tool page answers "what is happening to my file".',
    published: GUIDES_REVIEWED_AT,
    lastReviewed: GUIDES_REVIEWED_AT,
    related: ['compress-image', 'compress-image-to-size', 'convert-image'],
    sections: [
      {
        heading: 'Two families of compression',
        paragraphs: [
          'Image formats either throw away nothing or throw away detail on purpose, and everything else follows from that one difference.',
          'Lossless formats (PNG, and the lossless mode of WebP and AVIF) compress by describing the same pixels more cleverly. Run the file through a lossless encoder ten times and the picture never changes — the only question is how much redundancy the encoder can find. That is why a detailed PNG often barely shrinks: there was not much redundancy to remove.',
          'Lossy formats (JPEG, WebP, AVIF in their normal modes) discard information the human eye is unlikely to miss: fine texture, subtle colour variation, high-frequency detail in flat areas. That is what produces tenfold savings — and it is also why the result is never byte-identical to the original.',
        ],
      },
      {
        heading: 'What a quality setting actually means',
        paragraphs: [
          'A quality value is not a percentage of the file and not a promise about appearance. It is an input to a specific encoder, and each encoder interprets it differently: the same 0.8 produces different sizes and different artefacts in JPEG, WebP and AVIF.',
          'Two consequences follow. First, the same quality setting on two different photos can give wildly different file sizes, because photographs with more detail cost more bits to describe. Second, a quality value can only be tuned by measuring: encode, look at the size, adjust. Every slider-only compressor does exactly that internally — this site just lets you see the measurements.',
        ],
      },
      {
        heading: 'Why "exactly 50 KB" is impossible',
        paragraphs: [
          'Encoders quantise their output, and quantisation does not land on round numbers. Even if a target were reachable in theory, the search itself moves in steps: quality 0.62 might produce 51.4 KB and quality 0.61 might produce 49.8 KB, with nothing in between. There is no setting that produces exactly 51,200 bytes.',
          'This is why the honest wording is "at or under your limit", and why a serious tool reports what it achieved instead of claiming the number you typed. A tool that promises an exact byte count is either padding the file or quietly ignoring the target.',
        ],
      },
      {
        heading: 'The three levers you actually control',
        paragraphs: [
          'There are only three ways to make an image file smaller, and they trade against different things.',
        ],
        table: {
          columns: ['Lever', 'What it does', 'Typical saving', 'Cost'],
          rows: [
            ['Quality', 'Discards fine detail the eye rarely notices', 'Large for photos, small for graphics', 'Visible artefacts if pushed too far'],
            ['Pixels', 'Stores the image at a smaller resolution', 'Very large (squared effect)', 'Less detail when enlarged or printed'],
            ['Format', 'Picks a container with a better encoder', 'Moderate, sometimes large', 'Compatibility with older software'],
          ],
        },
      },
      {
        heading: 'How to choose a target that a portal will accept',
        paragraphs: [
          'Forms state ceilings, not goals: 20 KB, 50 KB, 100 KB, 200 KB. Treat the ceiling as the goal and let the tool find the highest quality that fits. If the ceiling is impossible at full resolution, the useful question is not "compress harder" but "how large does this image actually need to be" — a 4000-pixel photo displayed in a 300-pixel form field is wasting everything above 300.',
          'That order of operations matters: set the size the destination needs, then compress to the ceiling. Doing it the other way round produces a tiny file that still has to be scaled down at the destination, which is why the exact-size compressor offers dimension reduction as an explicit second step rather than a silent one.',
        ],
      },
    ],
    faq: [
      {
        q: 'Does compressing an image twice lose more quality?',
        a: 'Yes, if both passes are lossy: each re-encode discards a little more detail, and artefacts compound. Compress from the best original you have, once. Lossless passes (PNG, or lossless WebP) can be repeated freely with no change to the picture.',
      },
      {
        q: 'Is a smaller file always a lower quality image?',
        a: 'No. Removing metadata, choosing a better format, and matching the pixel count to the real display size all shrink a file without touching perceived quality. Re-encoding at the same quality can also produce a smaller file if the original encoder was wasteful.',
      },
      {
        q: 'Why does my 4 MB photo sometimes not get smaller?',
        a: 'Usually because it is already efficiently encoded. A JPEG straight from a phone camera has typically been compressed once already; re-encoding at similar quality cannot recover much. The real savings come from pixels or format, not from a second lossy pass.',
      },
      {
        q: 'What is the best quality setting?',
        a: 'For photos, around 0.8 is the point where most people stop seeing a difference at normal viewing sizes; 0.9 is safer for large prints, 0.6 for thumbnails. Because encoders differ, treat those as starting points and check the before/after yourself.',
      },
    ],
    sources: [
      { label: 'JPEG (ITU T.81) — quantisation and lossy coding', url: 'https://www.w3.org/Graphics/JPEG/itu-t81.pdf' },
      { label: 'WebP compression documentation (Google)', url: 'https://developers.google.com/speed/webp/docs/compression' },
      { label: 'PNG specification (W3C) — lossless deflate stream', url: 'https://www.w3.org/TR/png-3/' },
    ],
  },
  {
    slug: 'best-image-format-for-web',
    title: 'WebP vs JPEG vs AVIF vs PNG: Which Format to Use',
    h1: 'Which image format to use: WebP vs JPEG vs AVIF vs PNG',
    metaDescription:
      'When to use WebP, JPEG, PNG or AVIF — including transparency, browser support, print compatibility and what each format does to quality and file size.',
    summary: 'When to use each format, and when converting is a mistake.',
    intent: 'informational: which image format should I use / webp vs jpeg / is avif safe to use',
    cannibalization:
      'The converter performs conversions. "Which format should I choose?" is a decision problem that people search before they have a file to convert, and no tool page answers it.',
    published: GUIDES_REVIEWED_AT,
    lastReviewed: GUIDES_REVIEWED_AT,
    related: ['convert-image', 'compress-image', 'social-image-resizer'],
    sections: [
      {
        heading: 'The short answer',
        paragraphs: [
          'Use JPEG for photographs that must open everywhere, PNG when you need lossless pixels or transparency, WebP for websites you control, and AVIF when file size matters more than the oldest browser on your visitor list. Everything below is the reasoning behind that sentence.',
        ],
      },
      {
        heading: 'What each format is good at',
        paragraphs: [
          'The formats differ in three ways that matter: whether they are lossy, whether they support transparency, and how widely they are accepted.',
        ],
        table: {
          columns: ['Format', 'Compression', 'Transparency', 'Best for'],
          rows: [
            ['JPEG', 'Lossy', 'No', 'Photos, print workflows, maximum compatibility'],
            ['PNG', 'Lossless', 'Yes', 'Screenshots, logos, sharp edges, pixel-exact work'],
            ['WebP', 'Both', 'Yes', 'Website images: smaller than JPEG/PNG at similar quality'],
            ['AVIF', 'Both', 'Yes', 'Smallest modern files, when you can rely on current browsers'],
          ],
        },
      },
      {
        heading: 'Compatibility, honestly',
        paragraphs: [
          'WebP is supported by every current major browser, which is why it is a safe default for the web. JPEG is the only format you can hand to almost any application, printer, portal or decade-old device without thinking about it.',
          'AVIF support is broad in current browsers but not universal, and — more importantly for this site — not every browser can *encode* AVIF. That is why the converter probes encoder support in your browser and only offers formats that will really work, instead of listing four and failing on two.',
        ],
      },
      {
        heading: 'Transparency: the decision people forget',
        paragraphs: [
          'JPEG has no alpha channel. Converting a transparent PNG to JPEG means the transparent areas must become some colour, and if the converter picks black you get the familiar black box behind a logo. Pick the background colour deliberately — white for documents, a brand colour for headers.',
          'If you need transparency preserved, stay in PNG, WebP or AVIF. A transparent logo flattened onto white cannot be un-flattened later without the original file.',
        ],
      },
      {
        heading: 'Converting is not a quality upgrade',
        paragraphs: [
          'Changing the container never restores detail that a lossy format already discarded. JPEG to PNG is lossless in the sense that nothing new is lost, but the artefacts from the original JPEG remain — they are simply stored in a bigger file.',
          'The same logic applies to file size: PNG to JPEG usually shrinks a file, and JPEG to PNG usually inflates it, with no change in what the image actually shows. Convert for compatibility or for transparency, not in the hope of improvement.',
        ],
      },
      {
        heading: 'A decision list you can act on',
        paragraphs: [],
        list: [
          'Uploading to a portal that names a format? Produce exactly that format, nothing cleverer.',
          'Sending a photo to a print shop? JPEG, high quality, with the pixel count the print size needs.',
          'Publishing on your own website? WebP (or AVIF if you control the audience), with a fallback if you support old browsers.',
          'Sharing a screenshot or a logo with sharp edges? PNG, or WebP if the file is too large.',
          'Needing transparency and the smallest possible file? WebP with alpha, then compare against PNG.',
        ],
      },
    ],
    faq: [
      {
        q: 'Is WebP always smaller than JPEG?',
        a: 'Almost always at similar visual quality, but not by a fixed margin, and occasionally a JPEG wins. The only reliable answer comes from measuring your own file: convert it and compare the bytes and the preview.',
      },
      {
        q: 'Will converting to AVIF break my website?',
        a: 'Only for visitors on browsers that cannot decode it. Serve AVIF with a WebP or JPEG fallback if you need to support older browsers, or convert to WebP instead — it has broader support and still beats JPEG.',
      },
      {
        q: 'Does converting remove my photo metadata?',
        a: 'Yes, in practice. Re-encoding rebuilds the file from decoded pixels, so EXIF and GPS data are not carried over. If you want that verified rather than assumed, the metadata tool shows the before and after.',
      },
      {
        q: 'What about HEIC files from an iPhone?',
        a: 'HEIC is the camera default on recent iPhones, and most non-Safari browsers cannot decode it at all. Converting to JPEG in a browser that can decode it — Safari, or on macOS — is the reliable path, and the converter tells you precisely when your browser cannot do it.',
      },
    ],
    sources: [
      { label: 'WebP support and encoding documentation (Google)', url: 'https://developers.google.com/speed/webp' },
      { label: 'AVIF format overview (Alliance for Open Media)', url: 'https://aomediacodec.github.io/av1-avif/' },
      { label: 'PNG specification (W3C)', url: 'https://www.w3.org/TR/png-3/' },
    ],
  },
  {
    slug: 'free-image-compressor-alternatives',
    title: 'Free Image Compressor Alternatives: How to Choose',
    h1: 'Free image compressor alternatives: what to check before you upload a file',
    metaDescription:
      'How to choose between free image compressors: upload-based services vs browser-only tools, exact target sizes, file limits, watermarks and metadata handling.',
    summary: 'A checklist for choosing, plus how upload-based and local tools differ.',
    intent: 'commercial investigation: best free image compressor / tinyjpg alternative / compressor without uploading',
    cannibalization:
      'The compressors are the destination. This page answers the choice itself — what the differences between tools mean for the file you are about to hand over — which no tool page covers.',
    published: GUIDES_REVIEWED_AT,
    lastReviewed: GUIDES_REVIEWED_AT,
    related: ['compress-image-to-size', 'compress-image', 'image-metadata'],
    sections: [
      {
        heading: 'The one difference that changes everything: where the file goes',
        paragraphs: [
          'Free compressors split into two architectures. Upload-based services receive your file on their servers, compress it there and send it back; browser-only tools decode and re-encode inside your own tab and never transmit the image.',
          'That distinction decides more than privacy. Upload-based tools depend on their bandwidth, so they add queue times, size caps and sometimes daily limits. Browser-only tools are limited by your device instead, and they keep working with the network switched off — which is also the simplest way to verify the claim.',
        ],
      },
      {
        heading: 'Well-known services, described by their own documentation',
        paragraphs: [
          'The large upload-based compressors are not secretive about how they work: their own help pages and privacy policies describe files being uploaded for processing. If you want to confirm the current behaviour of a specific service, read its privacy policy and FAQ — the wording there is the authoritative version, not a comparison table on someone else’s blog.',
          'Browser-only alternatives exist too, and they share one property: nothing is sent anywhere, because there is nowhere to send it. That is a claim you can test in ten seconds — open your browser’s network panel, run the tool, and look for the image bytes.',
        ],
      },
      {
        heading: 'The checklist: eight questions that separate the options',
        paragraphs: [],
        list: [
          'Does the file leave my device? Check the privacy policy, then verify with the browser network panel.',
          'Can I set an exact target size in KB, or only a quality slider? Forms and portals quote byte limits.',
          'Are there file-size or daily-usage caps? Free tiers usually meter bandwidth.',
          'Does it watermark or add anything to my file?',
          'Is there a signup, email or account step?',
          'What happens to metadata — kept, stripped, or unknown?',
          'Does it work offline, on a locked-down work laptop, or on a phone with a bad connection?',
          'Does it report what it actually achieved, or only that it succeeded?',
        ],
      },
      {
        heading: 'How to judge the output, not the marketing',
        paragraphs: [
          'Two compressors can both claim "up to 80% smaller" and produce very different files. Compare them on your own image with three questions: how many bytes resulted, at what pixel dimensions, and can you see a difference at the size you will actually display?',
          'A tool that answers those three questions with real numbers is telling you something. A tool that answers with a percentage of an unnamed original is not.',
        ],
      },
      {
        heading: 'Where this site fits',
        paragraphs: [
          'These tools are browser-only and free with no signup: the file is decoded, resized, re-encoded and measured locally, and the result panel states the exact bytes achieved. When a target is impossible at full resolution, you are told — and dimension reduction is offered as a decision you make, not a silent edit.',
          'The honest trade-off: everything depends on your device, so very large files (hundreds of megabytes) are refused rather than queued, and there is no batch queue or cloud storage. For a form deadline on a phone, that is usually the right trade.',
        ],
      },
    ],
    faq: [
      {
        q: 'Do I have to upload a file to a server to compress it well?',
        a: 'No. Modern browsers ship the same encoders that server-side tools use, so a local tool can match the result quality. The practical difference is your device’s speed and memory, not the output.',
      },
      {
        q: 'How can I check whether a compressor uploads my file?',
        a: 'Open the browser developer tools, switch to the network panel, run the compression, and look for a POST request containing image data. A local tool shows no such request — you can test the claim instead of trusting it.',
      },
      {
        q: 'Are free compressors safe for documents and ID photos?',
        a: 'Only if the file never leaves your device, or if you are comfortable with the service’s data retention. For signatures, ID photos and anything with personal data, local processing removes the question entirely.',
      },
      {
        q: 'Why do some free tools add a queue or a cap?',
        a: 'Because they pay for the bandwidth that receives and returns your file. A queue is a cost control, not a technical necessity. Tools that never upload have nothing to meter.',
      },
    ],
    sources: [
      { label: 'MDN: CanvasRenderingContext2D and image encoding in the browser', url: 'https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob' },
      { label: 'MDN: Fetch and the network panel workflow for verifying requests', url: 'https://developer.mozilla.org/en-US/docs/Tools/Network_Monitor' },
    ],
  },
  {
    slug: 'image-size-vs-dimensions-explained',
    title: 'Image Size vs Dimensions vs Resolution vs DPI',
    h1: 'Image size vs dimensions vs resolution vs DPI: what each one means',
    metaDescription:
      'Bytes, pixels, megapixels, aspect ratio and DPI explained with worked examples — including the print formula and why raising DPI adds no detail.',
    summary: 'Bytes, pixels, megapixels and DPI — which number you actually need.',
    intent: 'informational: difference between image size and dimensions / what does resolution mean / image size vs file size',
    cannibalization:
      'The checker reports the numbers, the DPI tool performs print maths. Explaining how the terms relate — the reason people search those reports in the first place — is a separate informational intent.',
    published: GUIDES_REVIEWED_AT,
    lastReviewed: GUIDES_REVIEWED_AT,
    related: ['image-size-checker', 'image-dpi', 'resize-image'],
    sections: [
      {
        heading: 'One photo, five numbers, five different questions',
        paragraphs: [
          'A single image file has a byte count, a pixel grid, a megapixel figure, an aspect ratio and possibly a DPI field. People call all of them "the size", then wonder why a form rejected a file that looks fine.',
          'Here is the mapping between what people say and what they actually mean — and which number each phrasing controls when a form, a platform or a print shop is the destination.',
        ],
        table: {
          columns: ['What people say', 'What it means', 'What it controls'],
          rows: [
            ['"The file is too big"', 'Bytes on disk', 'Upload limits, email attachments, storage'],
            ['"The image is too small"', 'Pixel dimensions', 'Sharpness on screen and in print'],
            ['"It has to be 300 DPI"', 'Print density field', 'How large the pixels are reproduced on paper'],
            ['"It is not square"', 'Aspect ratio', 'Whether a platform crops or letterboxes the image'],
            ['"It looks blurry"', 'Real detail (resolution)', 'Only the original capture and pixel count decide this'],
          ],
        },
      },
      {
        heading: 'Pixels, megapixels and what they promise',
        paragraphs: [
          'Pixel dimensions are the width and height of the grid: 2400 × 1600 means 3.84 million pixels, which is the same as 3.84 megapixels. Megapixels are simply pixels divided by a million, and camera marketing made them famous.',
          'More pixels allow larger prints and cropping headroom, but they do not make a picture sharper by themselves. A 12-megapixel photo from a cheap lens can look worse than an 8-megapixel photo taken carefully — resolution is a ceiling on detail, not a guarantee of it.',
        ],
      },
      {
        heading: 'DPI and PPI, without the mythology',
        paragraphs: [
          'DPI is a print instruction: how many dots of ink cover one inch. PPI is the image-side equivalent: how many pixels are reproduced per inch. In everyday use people say DPI for both, and the meaning is the same — a density value that tells print software how large to reproduce the pixels you have.',
          'The arithmetic is the whole story. Print size in inches equals pixels divided by density: 3000 pixels at 300 DPI prints 10 inches wide; at 150 DPI it prints 20 inches. Working the other way, a 12-inch print at 300 DPI needs 3600 pixels, and if the file has fewer than that, no setting fixes it — the printer has to interpolate.',
        ],
      },
      {
        heading: 'A worked example',
        paragraphs: [
          'A 2400 × 1600 photo is 3.84 megapixels. At 300 DPI it prints 8 × 5.3 inches — a normal photo print. At 150 DPI the same pixels print 16 × 10.7 inches, which looks fine on a wall poster and soft in a hand-held brochure.',
          'Now the same photo submitted to a form that demands "under 50 KB": bytes are the constraint, not pixels. The sensible order is to reduce the pixel grid to what the form actually displays (often a few hundred pixels), then compress to the ceiling — which is exactly the handoff the size checker and the exact-size compressor are built around.',
        ],
      },
      {
        heading: 'Why raising DPI cannot sharpen a photo',
        paragraphs: [
          'Changing the DPI field changes how large existing pixels are printed; it does not create new pixels. Tools that advertise "increase DPI to 300 for sharper prints" are either resampling — inventing pixels by interpolation, which softens real detail — or simply rewriting the field and letting the print shop discover the truth.',
          'The honest options are two: mark the density you intend (a metadata write), or supply more real pixels (a better scan or a larger original). This site does the first and says so plainly.',
        ],
      },
    ],
    faq: [
      {
        q: 'Is file size the same as image size?',
        a: 'No. File size is bytes on disk and decides whether an upload limit is met. Image size is the pixel grid and decides how large the image can be displayed or printed. A file can be heavy and low-resolution (uncompressed) or light and high-resolution (efficiently encoded).',
      },
      {
        q: 'Does resizing change the DPI?',
        a: 'No. Resizing changes the pixel grid; the density field stays as it was, and most print software then recalculates the physical size. If a shop gave you a DPI requirement, set the density explicitly and check the pixel count separately.',
      },
      {
        q: 'What resolution do I need for printing?',
        a: 'Multiply the print size in inches by the density you are targeting: 8 × 10 inches at 300 DPI needs 2400 × 3000 pixels. Aim for 300 DPI for hand-held prints, 150 DPI for posters seen from a distance.',
      },
      {
        q: 'Why does the checker show two print sizes?',
        a: 'Because there is no single correct density. 300 DPI is the standard for hand-held print quality and 150 DPI is a common reference for large format; showing both saves you a second calculation when the answer depends on how the image will be used.',
      },
    ],
    sources: [
      { label: 'DPI definition and print context (Adobe)', url: 'https://www.adobe.com/creativecloud/photography/discover/dots-per-inch.html' },
      { label: 'PNG pHYs chunk — physical pixel dimensions (W3C)', url: 'https://www.w3.org/TR/png-3/#11pHYs' },
      { label: 'JFIF density fields in JPEG files (ITU T.871)', url: 'https://www.w3.org/Graphics/JPEG/itu-t81.pdf' },
    ],
  },
];

export const GUIDE_MAP: Map<string, GuideEntry> = new Map(GUIDES.map((guide) => [guide.slug, guide]));

export function getGuide(slug: string): GuideEntry | undefined {
  return GUIDE_MAP.get(slug);
}
