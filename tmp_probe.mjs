import { prisma } from './lib/prisma.ts';

async function main() {
  try {
    const rows = await prisma.user.findMany();
    console.log('rows', rows.length);
  } catch (error) {
    console.error('ERROR', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

await main();
