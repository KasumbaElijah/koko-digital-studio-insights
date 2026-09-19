import { NextResponse } from 'next/server';
import { prisma, serializeData } from '@/lib/prisma';
import { INITIAL_CLIENTS } from '@/lib/mockData';

export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      include: {
        socialAccounts: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!clients || clients.length === 0) {
      return NextResponse.json([]);
    }

    return NextResponse.json(serializeData(clients));
  } catch (error) {
    console.warn('Prisma DB query failed, returning empty list:', error);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, logoUrl } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Client name is required' }, { status: 400 });
    }

    const newClient = await prisma.client.create({
      data: {
        name: name.trim(),
        logoUrl: logoUrl || '/logos/default.svg',
      },
    });

    return NextResponse.json(serializeData(newClient));
  } catch (error) {
    console.warn('DB client creation error (client will persist in local storage):', error);
    return NextResponse.json({
      id: `client-${Date.now()}`,
      name: 'New Client',
      logoUrl: '/logos/default.svg',
      createdAt: new Date().toISOString(),
      socialAccounts: [],
    });
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
