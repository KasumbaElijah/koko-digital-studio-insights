import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export type TeamRole = 'ADMIN' | 'ACCOUNT_MANAGER';

export interface TeamUserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: TeamRole;
  assignedClientIds: string[]; // Client IDs, Page IDs, or '@handles' assigned to this user ('*' for ADMIN)
  createdAt: string;
  updatedAt: string;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: TeamRole;
  assignedClientIds: string[];
}

export const TEAM_SESSION_COOKIE = 'koko_team_session';
const SESSION_SECRET =
  process.env.AUTH_SESSION_SECRET || 'koko-digital-studio-agency-secret-key-2026';

const REPO_DATA_DIR = path.join(process.cwd(), '.data');
const REPO_TEAM_PATH = path.join(REPO_DATA_DIR, 'team_users.json');
const TMP_DATA_DIR = path.join('/tmp', '.koko-data');
const TMP_TEAM_PATH = path.join(TMP_DATA_DIR, 'team_users.json');

export function hashPassword(plain: string): string {
  return crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(plain.trim())
    .digest('hex');
}

export function getDefaultTeamUsers(): TeamUserRecord[] {
  const now = new Date().toISOString();
  const adminPass = process.env.ADMIN_PASSWORD || 'KokoAdmin2026!';
  const amPass = process.env.AM_DEFAULT_PASSWORD || 'KokoTeam2026!';

  return [
    {
      id: 'user_admin_elijah',
      email: 'elijah@kokodigitalstudio.com',
      name: 'Kasumba Zion Elijah (Management)',
      passwordHash: hashPassword(adminPass),
      role: 'ADMIN',
      assignedClientIds: ['*'],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'user_am_sarah',
      email: 'sarah@kokodigitalstudio.com',
      name: 'Sarah Namukasa (Account Manager)',
      passwordHash: hashPassword(amPass),
      role: 'ACCOUNT_MANAGER',
      assignedClientIds: [
        'page_total_tools_ug',
        'page_wadad_spa_ug',
        '@totaltoolsprostoreug',
        '@wadadspaug',
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'user_am_david',
      email: 'david@kokodigitalstudio.com',
      name: 'David Okello (Account Manager)',
      passwordHash: hashPassword(amPass),
      role: 'ACCOUNT_MANAGER',
      assignedClientIds: [
        'page_king_rhymes_music',
        'page_koko_digital_studio',
        '@kingrhymesmusic',
        '@koko_digital_studio',
      ],
      createdAt: now,
      updatedAt: now,
    },
  ];
}

let memoryTeamUsers: TeamUserRecord[] | null = null;

function readTeamFileSafe(filePath: string): TeamUserRecord[] | null {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return null;
}

function writeTeamUsers(users: TeamUserRecord[]): void {
  memoryTeamUsers = users;
  const serialized = JSON.stringify(users, null, 2);
  try {
    if (!fs.existsSync(REPO_DATA_DIR)) {
      fs.mkdirSync(REPO_DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(REPO_TEAM_PATH, serialized, 'utf-8');
  } catch {}

  try {
    if (!fs.existsSync(TMP_DATA_DIR)) {
      fs.mkdirSync(TMP_DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(TMP_TEAM_PATH, serialized, 'utf-8');
  } catch {}
}

export function getTeamUsers(): TeamUserRecord[] {
  const tmpUsers = readTeamFileSafe(TMP_TEAM_PATH);
  const repoUsers = readTeamFileSafe(REPO_TEAM_PATH);
  const users = tmpUsers || repoUsers || memoryTeamUsers || getDefaultTeamUsers();
  if (!tmpUsers && !repoUsers) {
    writeTeamUsers(users);
  }
  memoryTeamUsers = users;
  return users;
}

export function saveTeamUser(user: TeamUserRecord): TeamUserRecord {
  const users = [...getTeamUsers()];
  const idx = users.findIndex(
    (u) => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase()
  );
  if (idx >= 0) {
    users[idx] = { ...users[idx], ...user, updatedAt: new Date().toISOString() };
  } else {
    users.push(user);
  }
  writeTeamUsers(users);
  return user;
}

export function deleteTeamUser(id: string): void {
  const users = getTeamUsers().filter((u) => u.id !== id);
  writeTeamUsers(users);
}

export function authenticateTeamUser(
  identifier: string,
  password: string
): SessionUser | null {
  const cleanId = identifier.trim().toLowerCase().replace(/^@/, '');
  const passHash = hashPassword(password);
  const users = getTeamUsers();

  const matched = users.find((u) => {
    const emailLower = u.email.toLowerCase();
    const localPart = emailLower.split('@')[0];
    const nameLower = u.name.toLowerCase();
    const isAdminAlias =
      u.role === 'ADMIN' &&
      (cleanId === 'elijah' ||
        cleanId === 'elijah_kasumba' ||
        cleanId === 'admin' ||
        cleanId === 'admin@kokodigitalstudio.com');

    return (
      emailLower === cleanId ||
      localPart === cleanId ||
      nameLower === cleanId ||
      isAdminAlias
    );
  });

  if (!matched) return null;
  if (matched.passwordHash !== passHash) return null;

  return {
    id: matched.id,
    email: matched.email,
    name: matched.name,
    role: matched.role,
    assignedClientIds: matched.assignedClientIds || [],
  };
}

/**
 * Signs a SessionUser payload into a tamper-proof token suitable for an HttpOnly cookie
 */
export function createSessionToken(user: SessionUser): string {
  const payload = {
    ...user,
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  };
  const dataB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(dataB64)
    .digest('base64url');
  return `${dataB64}.${sig}`;
}

/**
 * Verifies a signed session token and returns the active SessionUser
 */
export function verifySessionToken(token?: string | null): SessionUser | null {
  if (!token || !token.includes('.')) return null;
  try {
    const [dataB64, sig] = token.split('.');
    if (!dataB64 || !sig) return null;
    const expectedSig = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(dataB64)
      .digest('base64url');
    if (sig !== expectedSig) return null;

    const payload = JSON.parse(Buffer.from(dataB64, 'base64url').toString('utf-8'));
    if (!payload || !payload.id || (payload.exp && Date.now() > payload.exp)) {
      return null;
    }

    // Refresh assignedClientIds from latest server store if available
    const latestUser = getTeamUsers().find((u) => u.id === payload.id);
    if (latestUser) {
      return {
        id: latestUser.id,
        email: latestUser.email,
        name: latestUser.name,
        role: latestUser.role,
        assignedClientIds: latestUser.assignedClientIds || [],
      };
    }

    return {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      assignedClientIds: Array.isArray(payload.assignedClientIds)
        ? payload.assignedClientIds
        : [],
    };
  } catch {
    return null;
  }
}

/**
 * Helper to check if a given client or page is accessible to a SessionUser
 */
export function canUserAccessAccount(
  user: SessionUser | null,
  identifiers: Array<string | undefined | null>
): boolean {
  if (!user) return false;
  if (user.role === 'ADMIN' || user.assignedClientIds.includes('*')) return true;

  const normalizedAssigned = new Set(
    (user.assignedClientIds || []).map((x) =>
      String(x || '')
        .toLowerCase()
        .replace(/^@/, '')
        .trim()
    )
  );

  for (const raw of identifiers) {
    if (!raw) continue;
    const clean = String(raw).toLowerCase().replace(/^@/, '').trim();
    if (normalizedAssigned.has(clean) || normalizedAssigned.has(`@${clean}`)) {
      return true;
    }
  }
  return false;
}
