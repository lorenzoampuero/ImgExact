/**
 * Social platform image presets — versioned, source-linked, review-dated.
 *
 * Maintenance rules:
 * - Every preset carries its source and a `reviewedAt` date. When re-verifying,
 *   update the date (and the `sources` block) — never silently.
 * - `confidence`: "official" = the platform's own documentation; "secondary" = a
 *   reputable third-party guide (verify against platform docs when possible).
 * - Factual naming only. No implied partnership or endorsement with any platform.
 */

export interface SocialPreset {
  id: string;
  platform: string;
  label: string;
  width: number;
  height: number;
  ratioLabel: string;
  note?: string;
  confidence: 'official' | 'secondary';
  sourceUrl: string;
}

export const PRESET_SOURCES = {
  instagramHelp:
    'https://help.instagram.com/1631821640426723',
  youtubeThumbnails:
    'https://support.google.com/youtube/answer/72431',
  bufferGuide:
    'https://buffer.com/resources/social-media-image-sizes/',
} as const;

/** Date all values in this file were last reviewed. */
export const PRESETS_REVIEWED_AT = '2026-09-19';

export const SOCIAL_PRESETS: SocialPreset[] = [
  // Instagram — official policy: uploads kept up to 1080px width for ratios between 1.91:1 and 3:4.
  { id: 'ig-post-square', platform: 'Instagram', label: 'Post — square', width: 1080, height: 1080, ratioLabel: '1:1', confidence: 'official', sourceUrl: PRESET_SOURCES.instagramHelp, note: 'Official: supported ratio range is 1.91:1 to 3:4.' },
  { id: 'ig-post-portrait', platform: 'Instagram', label: 'Post — portrait', width: 1080, height: 1350, ratioLabel: '4:5', confidence: 'official', sourceUrl: PRESET_SOURCES.instagramHelp },
  { id: 'ig-post-portrait-34', platform: 'Instagram', label: 'Post — portrait (3:4 grid)', width: 1080, height: 1440, ratioLabel: '3:4', confidence: 'official', sourceUrl: PRESET_SOURCES.instagramHelp, note: 'Fits the 3:4 profile grid introduced in 2025.' },
  { id: 'ig-post-landscape', platform: 'Instagram', label: 'Post — landscape', width: 1080, height: 566, ratioLabel: '1.91:1', confidence: 'official', sourceUrl: PRESET_SOURCES.instagramHelp },
  { id: 'ig-story', platform: 'Instagram', label: 'Story / Reel thumbnail', width: 1080, height: 1920, ratioLabel: '9:16', confidence: 'secondary', sourceUrl: PRESET_SOURCES.bufferGuide },

  // Facebook
  { id: 'fb-post-square', platform: 'Facebook', label: 'Post — square', width: 1080, height: 1080, ratioLabel: '1:1', confidence: 'secondary', sourceUrl: PRESET_SOURCES.bufferGuide },
  { id: 'fb-post-portrait', platform: 'Facebook', label: 'Post — vertical', width: 1080, height: 1350, ratioLabel: '4:5', confidence: 'secondary', sourceUrl: PRESET_SOURCES.bufferGuide },
  { id: 'fb-link', platform: 'Facebook', label: 'Link preview', width: 1200, height: 630, ratioLabel: '1.91:1', confidence: 'secondary', sourceUrl: PRESET_SOURCES.bufferGuide },
  { id: 'fb-story', platform: 'Facebook', label: 'Story', width: 1080, height: 1920, ratioLabel: '9:16', confidence: 'secondary', sourceUrl: PRESET_SOURCES.bufferGuide },
  { id: 'fb-cover', platform: 'Facebook', label: 'Cover — profile / page', width: 851, height: 315, ratioLabel: '2.7:1', confidence: 'secondary', sourceUrl: PRESET_SOURCES.bufferGuide },

  // X (Twitter)
  { id: 'x-post-square', platform: 'X', label: 'Post — square', width: 1080, height: 1080, ratioLabel: '1:1', confidence: 'secondary', sourceUrl: PRESET_SOURCES.bufferGuide },
  { id: 'x-post-landscape', platform: 'X', label: 'Post — landscape', width: 1600, height: 900, ratioLabel: '16:9', confidence: 'secondary', sourceUrl: PRESET_SOURCES.bufferGuide },
  { id: 'x-header', platform: 'X', label: 'Profile header', width: 1500, height: 500, ratioLabel: '3:1', confidence: 'secondary', sourceUrl: PRESET_SOURCES.bufferGuide },
  { id: 'x-profile', platform: 'X', label: 'Profile picture', width: 400, height: 400, ratioLabel: '1:1', confidence: 'secondary', sourceUrl: PRESET_SOURCES.bufferGuide },

  // LinkedIn
  { id: 'li-profile', platform: 'LinkedIn', label: 'Profile picture', width: 400, height: 400, ratioLabel: '1:1', confidence: 'secondary', sourceUrl: PRESET_SOURCES.bufferGuide },
  { id: 'li-cover', platform: 'LinkedIn', label: 'Cover — personal profile', width: 1584, height: 396, ratioLabel: '4:1', confidence: 'secondary', sourceUrl: PRESET_SOURCES.bufferGuide },
  { id: 'li-post-square', platform: 'LinkedIn', label: 'Post — square', width: 1080, height: 1080, ratioLabel: '1:1', confidence: 'secondary', sourceUrl: PRESET_SOURCES.bufferGuide },
  { id: 'li-link', platform: 'LinkedIn', label: 'Link preview', width: 1200, height: 627, ratioLabel: '1.91:1', confidence: 'secondary', sourceUrl: PRESET_SOURCES.bufferGuide },

  // YouTube
  { id: 'yt-thumbnail', platform: 'YouTube', label: 'Video thumbnail', width: 1280, height: 720, ratioLabel: '16:9', confidence: 'official', sourceUrl: PRESET_SOURCES.youtubeThumbnails, note: 'Platform limit: 2 MB max file size for standard thumbnails.' },
  { id: 'yt-banner', platform: 'YouTube', label: 'Channel banner', width: 2560, height: 1440, ratioLabel: '16:9', confidence: 'secondary', sourceUrl: PRESET_SOURCES.bufferGuide, note: 'Minimum 2048×1152. Safe area for text: 1546×423 centered.' },
  { id: 'yt-profile', platform: 'YouTube', label: 'Profile picture', width: 800, height: 800, ratioLabel: '1:1', confidence: 'secondary', sourceUrl: PRESET_SOURCES.bufferGuide },

  // TikTok
  { id: 'tt-post', platform: 'TikTok', label: 'Post / Story', width: 1080, height: 1920, ratioLabel: '9:16', confidence: 'secondary', sourceUrl: PRESET_SOURCES.bufferGuide, note: '4:5 images also display acceptably.' },
  { id: 'tt-profile', platform: 'TikTok', label: 'Profile picture', width: 200, height: 200, ratioLabel: '1:1', confidence: 'secondary', sourceUrl: PRESET_SOURCES.bufferGuide },
];

export const PRESET_PLATFORMS = [...new Set(SOCIAL_PRESETS.map((p) => p.platform))];
