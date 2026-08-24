import { NextResponse } from 'next/server';
import { prisma, serializeData } from '@/lib/prisma';
import { INITIAL_CLIENTS } from '@/lib/mockData';

export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      include: {
        socialAccounts: true,
      },
    });

    if (!clients || clients.length === 0) {
      return NextResponse.json(INITIAL_CLIENTS);
    }

    return NextResponse.json(serializeData(clients));
  } catch (error) {
    console.warn('Prisma DB query failed, falling back to mock clients:', error);
    return NextResponse.json(INITIAL_CLIENTS);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, logoUrl } = body;

    const newClient = await prisma.client.create({
      data: {
        name,
        logoUrl: logoUrl || '/logos/default.svg',
      },
    });

    return NextResponse.json(serializeData(newClient));
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}
