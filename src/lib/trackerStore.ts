import fs from 'fs';
import path from 'path';
import { normalizeInstagramUsername, normalizeTikTokUsername, formatTikTokHandle } from './managedPages';

export interface TrackerAccountConfig {
  id: string;
  name: string;
  pod: string; // e.g. "Alpha", "Millions", "Bravo"
  platform: 'tiktok' | 'instagram' | 'both';
  tiktokHandle?: string;
  instagramHandle?: string;
  instagramAccountId?: string;
  targetVideos: number;
  targetGraphics: number;
  expectedAvgViews: number;
  notes?: string;
}

export interface TrackerCalculationResult {
  id: string;
  name: string;
  pod: string;
  platform: string;
  tiktokHandle?: string;
  instagramHandle?: string;
  followerCount?: number;
  targetVideos: number;
  targetGraphics: number;
  expectedAvgViews: number;
  actualAvgViews: number;
  videoCount: number;
  totalViews: number;
  variancePct: number;
  status: 'success' | 'warning' | 'error';
  statusMessage?: string;
}

const DATA_DIR = path.join(process.cwd(), '.data');
const TRACKER_STORE_PATH = path.join(DATA_DIR, 'tracker_accounts.json');

export const DEFAULT_TRACKER_ACCOUNTS: TrackerAccountConfig[] = [
  {
    id: 'acc_elijah_kasumba',
    name: 'Kasumba Zion Elijah',
    pod: 'Alpha',
    platform: 'both',
    tiktokHandle: '@kash8342',
    instagramHandle: '@elijah_kasumba',
    targetVideos: 10,
    targetGraphics: 5,
    expectedAvgViews: 15000,
    notes: 'Primary creator profile — live Instagram (@elijah_kasumba) & TikTok (@kash8342)',
  },
  {
    id: 'acc_total_tools',
    name: 'Total Tools Prostore Uganda',
    pod: 'Alpha',
    platform: 'instagram',
    instagramHandle: '@totaltoolsprostoreug',
    targetVideos: 12,
    targetGraphics: 8,
    expectedAvgViews: 10000,
    notes: 'Hardware & industrial power tools prostore (@totaltoolsprostoreug)',
  },
  {
    id: 'acc_koko_studio',
    name: 'Koko Digital Studio',
    pod: 'Alpha',
    platform: 'instagram',
    instagramHandle: '@koko_digital_studio',
    targetVideos: 15,
    targetGraphics: 10,
    expectedAvgViews: 12000,
    notes: 'Agency master showcase and creative production portfolio (@koko_digital_studio)',
  },
  {
    id: 'acc_wadad_spa',
    name: 'Wadad Spa ug',
    pod: 'Alpha',
    platform: 'instagram',
    instagramHandle: '@wadadspaug',
    targetVideos: 8,
    targetGraphics: 4,
    expectedAvgViews: 5000,
    notes: 'Spa & wellness salon treatments and lifestyle content (@wadadspaug)',
  },
  {
    id: 'acc_king_rhymes_music',
    name: "King Rhymes' music",
    pod: 'Millions',
    platform: 'instagram',
    instagramHandle: '@kingrhymesmusic',
    targetVideos: 10,
    targetGraphics: 6,
    expectedAvgViews: 8000,
    notes: 'Music & entertainment brand (@kingrhymesmusic)',
  },
  {
    id: 'acc_kash8342_tiktok',
    name: 'Kash8342 TikTok Official',
    pod: 'Millions',
    platform: 'tiktok',
    tiktokHandle: '@kash8342',
    targetVideos: 12,
    targetGraphics: 4,
    expectedAvgViews: 25000,
    notes: 'Connected TikTok creator channel (@kash8342)',
  },
];

const LEGACY_PLACEHOLDER_IDS = new Set(['acc_safeboda', 'acc_ezra_creative']);

const LEGACY_HANDLE_UPGRADES: Record<string, { name: string; platform: 'tiktok' | 'instagram' | 'both'; instagramHandle?: string; tiktokHandle?: string }> = {
  acc_total_tools: {
    name: 'Total Tools Prostore Uganda',
    platform: 'instagram',
    instagramHandle: '@totaltoolsprostoreug',
  },
  acc_wadad_spa: {
    name: 'Wadad Spa ug',
    platform: 'instagram',
    instagramHandle: '@wadadspaug',
  },
  acc_elijah_kasumba: {
    name: 'Kasumba Zion Elijah',
    platform: 'both',
    instagramHandle: '@elijah_kasumba',
    tiktokHandle: '@kash8342',
  },
  acc_koko_studio: {
    name: 'Koko Digital Studio',
    platform: 'instagram',
    instagramHandle: '@koko_digital_studio',
  },
};

function sanitizeAndUpgradeTrackerAccounts(rawList: TrackerAccountConfig[]): TrackerAccountConfig[] {
  const upgraded: TrackerAccountConfig[] = [];

  for (const item of rawList) {
    if (!item || !item.id) continue;
    // Remove old synthetic placeholder accounts
    if (LEGACY_PLACEHOLDER_IDS.has(item.id)) continue;

    const upgrade = LEGACY_HANDLE_UPGRADES[item.id];
    if (upgrade) {
      upgraded.push({
        ...item,
        name: upgrade.name,
        platform: upgrade.platform,
        instagramHandle: upgrade.instagramHandle,
        tiktokHandle: upgrade.tiktokHandle,
      });
    } else {
      const cleanIg = item.instagramHandle ? `@${normalizeInstagramUsername(item.instagramHandle)}` : undefined;
      const cleanTt = item.tiktokHandle ? formatTikTokHandle(normalizeTikTokUsername(item.tiktokHandle)) : undefined;
      upgraded.push({
        ...item,
        instagramHandle: cleanIg,
        tiktokHandle: cleanTt,
      });
    }
  }

  // Ensure all default real connected accounts exist
  for (const def of DEFAULT_TRACKER_ACCOUNTS) {
    const exists = upgraded.some(
      (u) =>
        u.id === def.id ||
        u.name.toLowerCase().trim() === def.name.toLowerCase().trim()
    );
    if (!exists) {
      upgraded.push(def);
    }
  }

  return upgraded;
}

export function getTrackerAccounts(): TrackerAccountConfig[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(TRACKER_STORE_PATH)) {
      fs.writeFileSync(TRACKER_STORE_PATH, JSON.stringify(DEFAULT_TRACKER_ACCOUNTS, null, 2), 'utf-8');
      return DEFAULT_TRACKER_ACCOUNTS;
    }
    const raw = fs.readFileSync(TRACKER_STORE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const cleaned = sanitizeAndUpgradeTrackerAccounts(parsed);
      try {
        fs.writeFileSync(TRACKER_STORE_PATH, JSON.stringify(cleaned, null, 2), 'utf-8');
      } catch {}
      return cleaned;
    }
    return DEFAULT_TRACKER_ACCOUNTS;
  } catch (err) {
    console.warn('TrackerStore read error, using defaults:', err);
    return DEFAULT_TRACKER_ACCOUNTS;
  }
}

export function saveTrackerAccount(account: TrackerAccountConfig): TrackerAccountConfig {
  const accounts = getTrackerAccounts();
  const idx = accounts.findIndex((a) => a.id === account.id || a.name.toLowerCase() === account.name.toLowerCase());
  if (idx >= 0) {
    accounts[idx] = { ...accounts[idx], ...account };
  } else {
    accounts.push(account);
  }
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(TRACKER_STORE_PATH, JSON.stringify(accounts, null, 2), 'utf-8');
  } catch (err) {
    console.warn('TrackerStore write error:', err);
  }
  return account;
}

export function deleteTrackerAccount(id: string): void {
  const accounts = getTrackerAccounts().filter((a) => a.id !== id);
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(TRACKER_STORE_PATH, JSON.stringify(accounts, null, 2), 'utf-8');
  } catch (err) {
    console.warn('TrackerStore delete error:', err);
  }
}
