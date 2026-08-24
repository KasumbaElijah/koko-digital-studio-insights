import { PrismaClient } from '@prisma/client';
import { INITIAL_CLIENTS, INITIAL_REPORTS } from '../src/lib/mockData';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Koko Digital Studio Analytics database...');

  // Clear existing records
  await prisma.contentPost.deleteMany({});
  await prisma.monthlyReport.deleteMany({});
  await prisma.socialAccount.deleteMany({});
  await prisma.client.deleteMany({});

  for (const clientData of INITIAL_CLIENTS) {
    const client = await prisma.client.create({
      data: {
        id: clientData.id,
        name: clientData.name,
        logoUrl: clientData.logoUrl,
        socialAccounts: {
          create: clientData.socialAccounts?.map((sa) => ({
            id: sa.id,
            platform: sa.platform,
            platformAccountId: sa.platformAccountId,
            accessToken: sa.accessToken,
            refreshToken: sa.refreshToken,
            tokenExpiresAt: sa.tokenExpiresAt ? new Date(sa.tokenExpiresAt) : null,
          })),
        },
      },
    });

    const reportData = INITIAL_REPORTS[client.id];
    if (reportData) {
      await prisma.monthlyReport.create({
        data: {
          id: reportData.id,
          clientId: client.id,
          startDate: new Date(reportData.startDate),
          endDate: new Date(reportData.endDate),
          goals: reportData.goals,
          insights: reportData.insights,
          nextSteps: reportData.nextSteps,
          igFollowersGrowth: reportData.igFollowersGrowth,
          igViews: BigInt(reportData.igViews),
          igViewsPctChange: reportData.igViewsPctChange,
          igEngagementRate: reportData.igEngagementRate,
          ttFollowersGrowth: reportData.ttFollowersGrowth,
          ttViews: BigInt(reportData.ttViews),
          ttViewsPctChange: reportData.ttViewsPctChange,
          ttEngagementRate: reportData.ttEngagementRate,
          posts: {
            create: reportData.posts.map((p) => ({
              id: p.id,
              platform: p.platform,
              postId: p.postId,
              contentFormat: p.contentFormat,
              viewsCount: p.viewsCount,
              likesCount: p.likesCount,
              commentsCount: p.commentsCount,
              sharesCount: p.sharesCount,
              thumbnailUrl: p.thumbnailUrl,
              isTopPerformer: p.isTopPerformer,
              publishedAt: new Date(p.publishedAt),
            })),
          },
        },
      });
    }
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
