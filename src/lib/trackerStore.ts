import fs from 'fs';
import path from 'path';

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
    id: 'acc_total_tools',
    name: 'Total Tools',
    pod: 'Alpha',
    platform: 'tiktok',
    tiktokHandle: '@totaltools',
    instagramHandle: '@totaltools',
    targetVideos: 12,
    targetGraphics: 8,
    expectedAvgViews: 15000,
    notes: 'Contract Tier 1: Hardware & Industrial power tools video showcase',
  },
  {
    id: 'acc_wadad_spa',
    name: 'Wadad Spa',
    pod: 'Alpha',
    platform: 'tiktok',
    tiktokHandle: '@wadadspa',
    instagramHandle: '@wadadspa',
    targetVideos: 8,
    targetGraphics: 4,
    expectedAvgViews: 8500,
    notes: 'Luxury wellness & beauty studio treatments and lifestyle content',
  },
  {
    id: 'acc_safeboda',
    name: 'SafeBoda Life',
    pod: 'Millions',
    platform: 'tiktok',
    tiktokHandle: '@safeboda',
    instagramHandle: '@safeboda',
    targetVideos: 16,
    targetGraphics: 10,
    expectedAvgViews: 35000,
    notes: 'High-frequency urban mobility and food delivery campaign',
  },
  {
    id: 'acc_elijah_kasumba',
    name: 'Elijah Kasumba',
    pod: 'Alpha',
    platform: 'tiktok',
    tiktokHandle: '@kasumba95',
    instagramHandle: '@kasumba95',
    targetVideos: 10,
    targetGraphics: 5,
    expectedAvgViews: 12000,
    notes: 'Executive personal brand and creative direction videos',
  },
  {
    id: 'acc_ezra_creative',
    name: 'Ezra Creative',
    pod: 'Millions',
    platform: 'tiktok',
    tiktokHandle: '@ezracreative',
    instagramHandle: '@ezracreative',
    targetVideos: 14,
    targetGraphics: 6,
    expectedAvgViews: 22000,
    notes: 'Brand entertainment and comedy series skits',
  },
  {
    id: 'acc_koko_studio',
    name: 'Koko Digital Studio',
    pod: 'Alpha',
    platform: 'both',
    tiktokHandle: '@kokodigital',
    instagramHandle: '@kokodigital',
    targetVideos: 20,
    targetGraphics: 12,
    expectedAvgViews: 28000,
    notes: 'Agency master showcase and creative production portfolio',
  },
];

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
      return parsed;
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
