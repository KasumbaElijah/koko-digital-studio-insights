import { NextResponse } from 'next/server';
import { prisma, serializeData } from '@/lib/prisma';
import { getServerClients, saveServerClient, deleteServerClient } from '@/lib/serverStore';

export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      include: {
        socialAccounts: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (clients && clients.length > 0) {
      clients.forEach((c) => {
        saveServerClient({
          id: c.id,
          name: c.name,
          logoUrl: c.logoUrl || '/logos/default.svg',
          createdAt: c.createdAt.toISOString(),
          socialAccounts: (c.socialAccounts || []).map((sa) => ({
            id: sa.id,
            clientId: sa.clientId,
            platform: sa.platform as any,
            platformAccountId: sa.platformAccountId,
            accessToken: sa.accessToken,
            refreshToken: sa.refreshToken || undefined,
            tokenExpiresAt: sa.tokenExpiresAt?.toISOString(),
          })),
        });
      });
      return NextResponse.json(serializeData(clients));
    }

    const fallbackClients = getServerClients();
    return NextResponse.json(fallbackClients);
  } catch (error) {
    const fallbackClients = getServerClients();
    return NextResponse.json(fallbackClients);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, logoUrl } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Client name is required' }, { status: 400 });
    }

    const clientObj = {
      id: `client-${Date.now()}`,
      name: name.trim(),
      logoUrl: logoUrl || '/logos/default.svg',
      createdAt: new Date().toISOString(),
      socialAccounts: [],
    };

    saveServerClient(clientObj);

    try {
      const newClient = await prisma.client.create({
        data: {
          id: clientObj.id,
          name: name.trim(),
          logoUrl: logoUrl || '/logos/default.svg',
        },
      });

      return NextResponse.json(serializeData(newClient));
    } catch (error) {
      console.warn('DB client creation notice (persisted in server store):', error);
      return NextResponse.json(clientObj);
    }
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    let clientId: string | null = null;
    try {
      const { searchParams } = new URL(request.url);
      clientId = searchParams.get('id');
    } catch (e) {
      console.warn('URL parse warning on client delete:', e);
    }

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
    }

    deleteServerClient(clientId);

    try {
      await prisma.contentPost.deleteMany({ where: { report: { clientId } } });
      await prisma.monthlyReport.deleteMany({ where: { clientId } });
      await prisma.socialAccount.deleteMany({ where: { clientId } });
      await prisma.client.delete({ where: { id: clientId } });
    } catch (dbErr) {
      console.warn('Prisma DB client delete notice (local state updated):', dbErr);
    }

    return NextResponse.json({ success: true, deletedId: clientId });
  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 });
  }
}
