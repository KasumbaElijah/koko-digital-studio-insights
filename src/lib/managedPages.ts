import { ContentPostData, MetaPageItem } from './types';

export const DEFAULT_VERIFIED_PAGES: MetaPageItem[] = [
  {
    id: '4360643764182218',
    name: 'Kasumba Zion Elijah',
    category: 'Personal / Primary Creator Profile',
    instagramBusinessAccount: {
      id: 'ig_kasumba_primary',
      username: 'elijah_kasumba',
      name: 'Kasumba Zion Elijah',
    },
  },
  {
    id: 'page_elijah_kasumba',
    name: 'elijah_kasumba',
    category: 'Creator / Public Figure Page',
    instagramBusinessAccount: {
      id: 'ig_elijah_kasumba_page',
      username: 'elijah_kasumba',
      name: 'elijah_kasumba',
    },
  },
  {
    id: 'page_total_tools_ug',
    name: 'Total Tools Prostore Uganda',
    category: 'Hardware & Industrial Tools Prostore',
    instagramBusinessAccount: {
      id: 'ig_total_tools_ug',
      username: 'totaltoolsprostoreug',
      name: 'Total Tools Prostore Uganda',
    },
  },
  {
    id: 'page_wadad_spa_ug',
    name: 'Wadad Spa ug',
    category: 'Spa & Wellness Salon',
    instagramBusinessAccount: {
      id: 'ig_wadad_spa_ug',
      username: 'wadadspaug',
      name: 'Wadad Spa ug',
    },
  },
  {
    id: 'page_king_rhymes_music',
    name: "King Rhymes' music",
    category: 'Music & Entertainment Brand',
    instagramBusinessAccount: {
      id: 'ig_king_rhymes_music',
      username: 'kingrhymesmusic',
      name: "King Rhymes' music",
    },
  },
  {
    id: 'page_koko_digital_studio',
    name: 'Koko Digital Studio',
    category: 'Digital Agency / Creator Media',
    instagramBusinessAccount: {
      id: 'ig_koko_studio',
      username: 'koko_digital_studio',
      name: 'Koko Digital Studio',
    },
  },
];

const LEGACY_FAKE_PAGE_FOLLOWERS = new Set([7700, 5400, 3200, 9100, 12400]);

export function sanitizeMetaPages(pages: MetaPageItem[]): MetaPageItem[] {
  if (!Array.isArray(pages)) return [];
  return pages.map((p) => {
    const ig = p.instagramBusinessAccount;
    if (!ig) return p;

    const fixedUsername =
      ig.username === 'kokodigitalstudio' ? 'koko_digital_studio' : ig.username;
    const isSyntheticId =
      p.id.startsWith('page_') ||
      p.id === '4360643764182218' ||
      String(ig.id || '').startsWith('ig_');
    const cleanedFollowers =
      isSyntheticId && ig.followersCount && LEGACY_FAKE_PAGE_FOLLOWERS.has(ig.followersCount)
        ? undefined
        : ig.followersCount;

    return {
      ...p,
      instagramBusinessAccount: {
        ...ig,
        username: fixedUsername,
        followersCount: cleanedFollowers,
      },
    };
  });
}

const KNOWN_HANDLE_LOOKUP: Record<string, string> = {
  '4360643764182218': 'elijah_kasumba',
  ig_kasumba_primary: 'elijah_kasumba',
  ig_primary: 'elijah_kasumba',
  page_kasumba_primary: 'elijah_kasumba',
  'kasumba zion elijah': 'elijah_kasumba',
  page_elijah_kasumba: 'elijah_kasumba',
  ig_elijah_kasumba_page: 'elijah_kasumba',
  elijah_kasumba: 'elijah_kasumba',
  page_total_tools_ug: 'totaltoolsprostoreug',
  ig_total_tools_ug: 'totaltoolsprostoreug',
  'total tools prostore uganda': 'totaltoolsprostoreug',
  totaltoolsprostoreug: 'totaltoolsprostoreug',
  page_wadad_spa_ug: 'wadadspaug',
  ig_wadad_spa_ug: 'wadadspaug',
  'wadad spa ug': 'wadadspaug',
  wadadspaug: 'wadadspaug',
  page_king_rhymes_music: 'kingrhymesmusic',
  ig_king_rhymes_music: 'kingrhymesmusic',
  "king rhymes' music": 'kingrhymesmusic',
  kingrhymesmusic: 'kingrhymesmusic',
  page_koko_digital_studio: 'koko_digital_studio',
  ig_koko_studio: 'koko_digital_studio',
  'koko digital studio': 'koko_digital_studio',
  kokodigitalstudio: 'koko_digital_studio',
  koko_digital_studio: 'koko_digital_studio',
};

export function resolveInstagramUsername(
  platformAccountId?: string,
  pageId?: string,
  pageName?: string
): string {
  const candidates = [platformAccountId, pageId, pageName]
    .map((v) => (v || '').replace(/^@/, '').trim())
    .filter(Boolean);

  for (const c of candidates) {
    const mapped = KNOWN_HANDLE_LOOKUP[c.toLowerCase()];
    if (mapped) return mapped;
  }

  for (const c of candidates) {
    if (
      /^[a-zA-Z0-9._]{2,30}$/.test(c) &&
      !/^\d+$/.test(c) &&
      !c.startsWith('page_') &&
      !c.startsWith('ig_') &&
      !c.startsWith('sa_')
    ) {
      return c;
    }
  }

  return '';
}

const KNOWN_TIKTOK_HANDLE_CORRECTIONS: Record<string, string> = {
  kash8432: 'kash8342',
};

export function normalizeTikTokUsername(raw?: string | null): string {
  const cleaned = (raw || '').replace(/^@/, '').trim();
  if (!cleaned) return '';
  const mapped = KNOWN_TIKTOK_HANDLE_CORRECTIONS[cleaned.toLowerCase()];
  return mapped || cleaned;
}

export function formatTikTokHandle(raw?: string | null): string {
  const rawTrimmed = (raw || '').trim();
  if (!rawTrimmed) return '';
  const normalized = normalizeTikTokUsername(rawTrimmed);
  if (!normalized) return '';
  // Preserve phone-number identifiers without prepending '@'
  if (/^\+?\d{7,15}$/.test(normalized) && !rawTrimmed.startsWith('@')) {
    return normalized;
  }
  return `@${normalized}`;
}

const SYNTHETIC_TITLE_FRAGMENTS = [
  '• High Traction Video Reel',
  '• Behind The Scenes Carousel',
  '• Editorial Brand Portrait',
  '• Studio Session & Creative Highlight',
  '• Interactive Daily Story Q&A',
  '• Visual Identity & Motion Graphic',
  '• High Energy Viral Hook & Trend',
  '• Behind The Scenes Studio Session',
  '• Acoustic Live Jam & Crowd Reaction',
  '• Visual Carousel & Photo Dump',
  '• Motion Graphic & Brand Promo',
  '• Daily Q&A Story & Soundcheck',
  'Daily Studio Q&A & Sound Check',
  'Daily Studio Q&A & BTS Story Update',
];

export function isMockOrSyntheticPost(p: any): boolean {
  if (!p || typeof p !== 'object') return true;
  const thumb = String(p.thumbnailUrl || '');
  if (thumb.includes('unsplash.com')) return true;

  const id = String(p.id || '');
  const postId = String(p.postId || '');
  if (
    id.startsWith('ig_story_cadence_') ||
    postId.startsWith('ig_story_cadence_') ||
    id.startsWith('post_tt_story_') ||
    postId.startsWith('story_tt_cadence_') ||
    /^story_.*_1$/.test(postId)
  ) {
    return true;
  }

  const title = String(p.title || '');
  if (SYNTHETIC_TITLE_FRAGMENTS.some((frag) => title.includes(frag))) {
    return true;
  }

  // Catch legacy portfolio blueprint IDs that lacked real post/video permalinks
  const permalink = String(p.permalink || '');
  if (
    /^post_ig_[a-z0-9._]+_[1-6]$/i.test(id) &&
    !permalink.includes('/p/') &&
    !permalink.includes('/reel/')
  ) {
    return true;
  }
  if (
    /^post_tt_[a-z0-9._]+_[1-6]$/i.test(id) &&
    !permalink.includes('/video/')
  ) {
    return true;
  }

  return false;
}

export function sanitizePostsList(posts: any[]): ContentPostData[] {
  if (!Array.isArray(posts)) return [];
  return posts.filter((p) => !isMockOrSyntheticPost(p));
}

export function sanitizeCachedReport<T extends Record<string, any>>(report: T): T {
  if (!report || typeof report !== 'object') return report;
  const rawPosts = Array.isArray(report.posts) ? report.posts : [];
  const cleanPosts = sanitizePostsList(rawPosts);
  const hadMockPosts = cleanPosts.length !== rawPosts.length;

  const realIgPosts = cleanPosts.filter(
    (p) => String(p.platform || '').toLowerCase() === 'instagram'
  );
  const realTtPosts = cleanPosts.filter(
    (p) => String(p.platform || '').toLowerCase() === 'tiktok'
  );

  let igViews = Number(report.igViews) || 0;
  let igFollowersGrowth = Number(report.igFollowersGrowth) || 0;
  let igEngagementRate = Number(report.igEngagementRate) || 0;
  let igViewsPctChange = Number(report.igViewsPctChange) || 0;

  if (
    (hadMockPosts && realIgPosts.length === 0) ||
    igViews === 1100000 ||
    igViews === 6600000 ||
    igFollowersGrowth === 7700 ||
    igFollowersGrowth === 15700
  ) {
    igViews = realIgPosts.reduce((s, p) => s + (Number(p.viewsCount) || 0), 0);
    igFollowersGrowth = 0;
    igEngagementRate = 0;
    igViewsPctChange = 0;
  }

  let ttViews = Number(report.ttViews) || 0;
  let ttFollowersGrowth = Number(report.ttFollowersGrowth) || 0;
  let ttEngagementRate = Number(report.ttEngagementRate) || 0;
  let ttViewsPctChange = Number(report.ttViewsPctChange) || 0;

  if (
    (hadMockPosts && realTtPosts.length === 0) ||
    ttViews === 322400 ||
    ttFollowersGrowth === 484 ||
    ttFollowersGrowth === 984
  ) {
    ttViews = realTtPosts.reduce((s, p) => s + (Number(p.viewsCount) || 0), 0);
    ttFollowersGrowth = 0;
    ttEngagementRate = 0;
    ttViewsPctChange = 0;
  }

  if (igViewsPctChange === 18.2) igViewsPctChange = 0;
  if (ttViewsPctChange === 24.5) ttViewsPctChange = 0;

  return {
    ...report,
    posts: cleanPosts,
    igViews,
    igFollowersGrowth,
    igEngagementRate,
    igViewsPctChange,
    ttViews,
    ttFollowersGrowth,
    ttEngagementRate,
    ttViewsPctChange,
  };
}
