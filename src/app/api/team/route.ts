import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  TEAM_SESSION_COOKIE,
  verifySessionToken,
  getTeamUsers,
  saveTeamUser,
  deleteTeamUser,
  hashPassword,
  TeamRole,
  TeamUserRecord,
} from '@/lib/teamAuth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function getCallerAdmin() {
  const cookieStore = cookies();
  const token = cookieStore.get(TEAM_SESSION_COOKIE)?.value;
  const user = verifySessionToken(token);
  if (!user || user.role !== 'ADMIN') return null;
  return user;
}

export async function GET() {
  const admin = getCallerAdmin();
  if (!admin) {
    return NextResponse.json(
      { success: false, error: 'Management (Admin) access required.' },
      { status: 403 }
    );
  }

  const users = getTeamUsers().map(({ passwordHash, ...rest }) => rest);
  return NextResponse.json({ success: true, users });
}

export async function POST(request: Request) {
  const admin = getCallerAdmin();
  if (!admin) {
    return NextResponse.json(
      { success: false, error: 'Only Management (Admin) can invite or update team members.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { id, name, email, password, role, assignedClientIds } = body;

    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: 'Name and email/username are required.' },
        { status: 400 }
      );
    }

    const existingUsers = getTeamUsers();
    const existing = existingUsers.find(
      (u) => u.id === id || u.email.toLowerCase() === String(email).trim().toLowerCase()
    );

    if (!existing && (!password || String(password).trim().length < 4)) {
      return NextResponse.json(
        { success: false, error: 'A password (min 4 characters) is required when creating a new team member.' },
        { status: 400 }
      );
    }

    const validRole: TeamRole = role === 'ADMIN' ? 'ADMIN' : 'ACCOUNT_MANAGER';
    const cleanAssigned: string[] =
      validRole === 'ADMIN'
        ? ['*']
        : Array.isArray(assignedClientIds)
        ? assignedClientIds.map((x: any) => String(x).trim()).filter(Boolean)
        : existing?.assignedClientIds || [];

    const now = new Date().toISOString();
    const record: TeamUserRecord = {
      id: existing?.id || id || `user_${Date.now()}`,
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      passwordHash:
        password && String(password).trim()
          ? hashPassword(String(password))
          : existing!.passwordHash,
      role: validRole,
      assignedClientIds: cleanAssigned,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    saveTeamUser(record);

    try {
      await prisma.teamUser.upsert({
        where: { email: record.email },
        update: {
          name: record.name,
          passwordHash: record.passwordHash,
          role: record.role,
          assignedClientIds: record.assignedClientIds,
        },
        create: {
          id: record.id,
          email: record.email,
          name: record.name,
          passwordHash: record.passwordHash,
          role: record.role,
          assignedClientIds: record.assignedClientIds,
        },
      });
    } catch {
      // Saved in serverStore
    }

    const { passwordHash: _ph, ...safeUser } = record;
    return NextResponse.json({
      success: true,
      user: safeUser,
      users: getTeamUsers().map(({ passwordHash, ...rest }) => rest),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save team member' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const admin = getCallerAdmin();
  if (!admin) {
    return NextResponse.json(
      { success: false, error: 'Only Management (Admin) can remove team members.' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ success: false, error: 'User ID required' }, { status: 400 });
  }
  if (id === 'user_admin_elijah' || id === admin.id) {
    return NextResponse.json(
      { success: false, error: 'Cannot delete the active primary Management account.' },
      { status: 400 }
    );
  }

  deleteTeamUser(id);
  try {
    await prisma.teamUser.delete({ where: { id } });
  } catch {}

  return NextResponse.json({
    success: true,
    deletedId: id,
    users: getTeamUsers().map(({ passwordHash, ...rest }) => rest),
  });
}
