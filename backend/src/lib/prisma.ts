import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { DATABASE_URL } from '../config/env';

const pool = new Pool({
  connectionString: DATABASE_URL,
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });

export const disconnectPrisma = async (): Promise<void> => {
  await prisma.$disconnect();
  await pool.end();
};