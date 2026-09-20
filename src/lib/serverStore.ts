import fs from 'fs';
import path from 'path';
import { ClientData, SocialAccountData } from './types';

interface ServerStoreData {
  clients: ClientData[];
  socialAccounts: SocialAccountData[];
  activeClientId?: string;
}

const DATA_DIR = path.join(process.cwd(), '.data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');

function ensureStoreExists(): ServerStoreData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(STORE_PATH)) {
      const initial: ServerStoreData = {
        clients: [],
        socialAccounts: [],
        activeClientId: undefined,
      };
      fs.writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    return JSON.parse(raw) as ServerStoreData;
  } catch (err) {
    console.warn('ServerStore init error, using memory fallback:', err);
    return { clients: [], socialAccounts: [] };
  }
}

function writeStore(data: ServerStoreData): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('ServerStore write error:', err);
  }
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
  if (store.activeClientId === id) {
    store.activeClientId = store.clients[0]?.id || undefined;
  }
  writeStore(store);
}

export function getServerSocialAccounts(clientId?: string): SocialAccountData[] {
  const store = ensureStoreExists();
  const list = store.socialAccounts || [];
  if (!clientId) return list;
  return list.filter((a) => a.clientId === clientId);
}

export function saveServerSocialAccount(account: SocialAccountData): SocialAccountData {
  const store = ensureStoreExists();
  const list = store.socialAccounts || [];
  const idx = list.findIndex(
    (a) => a.id === account.id || (a.clientId === account.clientId && a.platform === account.platform)
  );
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...account };
  } else {
    list.unshift(account);
  }
  store.socialAccounts = list;
  if (account.clientId) {
    store.activeClientId = account.clientId;
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
    list = list.filter((a) => a.id !== idOrClientId && !(a.clientId === idOrClientId));
  }
  store.socialAccounts = list;
  writeStore(store);
}

export function getServerActiveClientId(): string | null {
  const store = ensureStoreExists();
  return store.activeClientId || null;
}

export function setServerActiveClientId(clientId: string): void {
  const store = ensureStoreExists();
  store.activeClientId = clientId;
  writeStore(store);
}
