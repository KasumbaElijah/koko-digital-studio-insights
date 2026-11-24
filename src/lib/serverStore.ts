import fs from 'fs';
import path from 'path';
import { ClientData, SocialAccountData, MonthlyReportData } from './types';

export interface ServerStoreData {
  clients: ClientData[];
  socialAccounts: SocialAccountData[];
  reports: Record<string, MonthlyReportData>;
  bonusTrackedVideos: any[];
  activeClientId?: string;
  tokenRefreshLog?: {
    lastRefreshedAt?: string;
    refreshedCount?: number;
  };
}

const REPO_DATA_DIR = path.join(process.cwd(), '.data');
const REPO_STORE_PATH = path.join(REPO_DATA_DIR, 'store.json');
const TMP_DATA_DIR = path.join('/tmp', '.koko-data');
const TMP_STORE_PATH = path.join(TMP_DATA_DIR, 'store.json');

const DEFAULT_PRIMARY_CLIENT_ID = 'client-elijah-primary';

function getDefaultSeedStore(): ServerStoreData {
  const nowIso = new Date().toISOString();
  const igExpiry = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
  const ttExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  const defaultSocialAccounts: SocialAccountData[] = [
    {
      id: `sa_${DEFAULT_PRIMARY_CLIENT_ID}_instagram`,
      clientId: DEFAULT_PRIMARY_CLIENT_ID,
      platform: 'instagram',
      platformAccountId: '@elijah_kasumba',
      accessToken: 'ig_direct_elijah_kasumba_persistent',
      pageId: '4360643764182218',
      pageName: 'Kasumba Zion Elijah',
      tokenExpiresAt: igExpiry,
    },
    {
      id: `sa_${DEFAULT_PRIMARY_CLIENT_ID}_tiktok`,
      clientId: DEFAULT_PRIMARY_CLIENT_ID,
      platform: 'tiktok',
      platformAccountId: '@kash8342',
      accessToken: 'tt_direct_kash8342_persistent',
      tokenExpiresAt: ttExpiry,
    },
  ];

  const defaultClients: ClientData[] = [
    {
      id: DEFAULT_PRIMARY_CLIENT_ID,
      name: 'Elijah Account',
      logoUrl: '/logos/default.svg',
      createdAt: nowIso,
      socialAccounts: defaultSocialAccounts,
    },
  ];

  return {
    clients: defaultClients,
    socialAccounts: defaultSocialAccounts,
    reports: {},
    bonusTrackedVideos: [],
    activeClientId: DEFAULT_PRIMARY_CLIENT_ID,
    tokenRefreshLog: {
      lastRefreshedAt: nowIso,
      refreshedCount: defaultSocialAccounts.length,
    },
  };
}

// In-memory singleton cache for serverless warm instances
let memoryStoreCache: ServerStoreData | null = null;

function readJsonFileSafe(filePath: string): ServerStoreData | null {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          clients: Array.isArray(parsed.clients) ? parsed.clients : [],
          socialAccounts: Array.isArray(parsed.socialAccounts) ? parsed.socialAccounts : [],
          reports: parsed.reports && typeof parsed.reports === 'object' ? parsed.reports : {},
          bonusTrackedVideos: Array.isArray(parsed.bonusTrackedVideos)
            ? parsed.bonusTrackedVideos
            : [],
          activeClientId: parsed.activeClientId,
          tokenRefreshLog: parsed.tokenRefreshLog,
        };
      }
    }
  } catch {}
  return null;
}

function ensureStoreExists(): ServerStoreData {
  // 1. Check writable /tmp store first (used on Vercel serverless) or repo .data store
  const tmpData = readJsonFileSafe(TMP_STORE_PATH);
  const repoData = readJsonFileSafe(REPO_STORE_PATH);

  let store: ServerStoreData =
    tmpData ||
    repoData ||
    memoryStoreCache ||
    getDefaultSeedStore();

  // If store has 0 clients and 0 socialAccounts (e.g. empty initial store.json), seed default workspace
  if (store.clients.length === 0 && store.socialAccounts.length === 0) {
    const seeded = getDefaultSeedStore();
    store = {
      ...seeded,
      reports: store.reports || {},
      bonusTrackedVideos: store.bonusTrackedVideos || [],
    };
    writeStore(store);
  }

  // Ensure every client's embedded socialAccounts array stays synced with store.socialAccounts
  store.clients = store.clients.map((c) => ({
    ...c,
    socialAccounts: store.socialAccounts.filter((sa) => sa.clientId === c.id),
  }));

  memoryStoreCache = store;
  return store;
}

function writeStore(data: ServerStoreData): void {
  memoryStoreCache = data;
  const serialized = JSON.stringify(data, null, 2);

  // Try writing to project .data directory (works locally)
  try {
    if (!fs.existsSync(REPO_DATA_DIR)) {
      fs.mkdirSync(REPO_DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(REPO_STORE_PATH, serialized, 'utf-8');
  } catch {
    // On Vercel serverless, /var/task/.data is read-only — write to /tmp/.koko-data
  }

  try {
    if (!fs.existsSync(TMP_DATA_DIR)) {
      fs.mkdirSync(TMP_DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(TMP_STORE_PATH, serialized, 'utf-8');
  } catch {}
}

export function getServerClients(): ClientData[] {
  const store = ensureStoreExists();
  return store.clients || [];
}

export function saveServerClient(client: ClientData): ClientData {
  const store = ensureStoreExists();
  const list = store.clients || [];
  const idx = list.findIndex((c) => c.id === client.id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...client };
  } else {
    list.unshift(client);
  }
  store.clients = list;
  if (!store.activeClientId) {
    store.activeClientId = client.id;
  }
  writeStore(store);
  return client;
}

export function deleteServerClient(id: string): void {
  const store = ensureStoreExists();
  store.clients = (store.clients || []).filter((c) => c.id !== id);
  store.socialAccounts = (store.socialAccounts || []).filter((a) => a.clientId !== id);
  if (store.reports && store.reports[id]) {
    delete store.reports[id];
  }
  if (store.activeClientId === id) {
    store.activeClientId = store.clients[0]?.id || undefined;
  }
  writeStore(store);
}

export function getServerSocialAccounts(clientId?: string): SocialAccountData[] {
  const store = ensureStoreExists();
  const list = store.socialAccounts || [];
  if (!clientId || clientId === 'all') return list;
  return list.filter((a) => a.clientId === clientId);
}

export function saveServerSocialAccount(account: SocialAccountData): SocialAccountData {
  const store = ensureStoreExists();
  const list = store.socialAccounts || [];
  const idx = list.findIndex(
    (a) =>
      a.id === account.id ||
      (a.clientId === account.clientId && a.platform === account.platform)
  );
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...account };
  } else {
    list.unshift(account);
  }
  store.socialAccounts = list;

  // Ensure the client exists in store.clients so the account is never orphaned
  if (account.clientId && !store.clients.some((c) => c.id === account.clientId)) {
    store.clients.push({
      id: account.clientId,
      name: account.pageName || 'Connected Client',
      logoUrl: '/logos/default.svg',
      createdAt: new Date().toISOString(),
      socialAccounts: [account],
    });
  }

  writeStore(store);
  return account;
}

export function deleteServerSocialAccount(idOrClientId: string, platform?: string): void {
  const store = ensureStoreExists();
  let list = store.socialAccounts || [];
  if (platform) {
    list = list.filter((a) => !(a.clientId === idOrClientId && a.platform === platform));
  } else {
    list = list.filter((a) => a.id !== idOrClientId && a.clientId !== idOrClientId);
  }
  store.socialAccounts = list;
  writeStore(store);
}

export function getServerReport(clientId: string): MonthlyReportData | null {
  if (!clientId) return null;
  const store = ensureStoreExists();
  return store.reports?.[clientId] || null;
}

export function getServerReportById(reportId: string): MonthlyReportData | null {
  if (!reportId) return null;
  const store = ensureStoreExists();
  const reports = store.reports || {};
  for (const rep of Object.values(reports)) {
    if (rep && (rep.id === reportId || `report-${rep.clientId}` === reportId)) {
      return rep;
    }
  }
  if (reportId.startsWith('report-')) {
    const cid = reportId.slice('report-'.length);
    if (reports[cid]) return reports[cid];
  }
  return null;
}

export function saveServerReport(
  clientId: string,
  report: MonthlyReportData
): MonthlyReportData {
  const store = ensureStoreExists();
  if (!store.reports) {
    store.reports = {};
  }
  const normalized: MonthlyReportData = {
    ...report,
    id: report.id || `report-${clientId}`,
    clientId,
  };
  store.reports[clientId] = normalized;
  writeStore(store);
  return normalized;
}

export function getServerBonusTrackedVideos(): any[] {
  const store = ensureStoreExists();
  return store.bonusTrackedVideos || [];
}

export function saveServerBonusTrackedVideos(videos: any[]): any[] {
  const store = ensureStoreExists();
  store.bonusTrackedVideos = Array.isArray(videos) ? videos : [];
  writeStore(store);
  return store.bonusTrackedVideos;
}

export function recordServerTokenRefresh(refreshedCount: number): void {
  const store = ensureStoreExists();
  store.tokenRefreshLog = {
    lastRefreshedAt: new Date().toISOString(),
    refreshedCount,
  };
  writeStore(store);
}

export function getServerTokenRefreshLog(): {
  lastRefreshedAt?: string;
  refreshedCount?: number;
} {
  const store = ensureStoreExists();
  return store.tokenRefreshLog || {};
}

export function getServerActiveClientId(): string | null {
  const store = ensureStoreExists();
  return store.activeClientId || store.clients[0]?.id || null;
}

export function setServerActiveClientId(clientId: string): void {
  const store = ensureStoreExists();
  store.activeClientId = clientId;
  writeStore(store);
}
