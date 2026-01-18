import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating test data...');
  
  const hashedPassword = await bcrypt.hash('Admin123!@#', 12);
  
  // Create plan first
  const plan = await prisma.plan.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Enterprise',
      description: 'Full-featured enterprise plan',
      monthlyPrice: 50000,
      maxUsers: 1000,
      maxDiagnoses: 10000,
      features: JSON.stringify(['all_features']),
      isActive: true,
    },
  });
  
  console.log('Plan created:', plan.name);
  
  // Create company
  const company = await prisma.company.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'PeopleBooster Demo Company',
      planId: plan.id,
      diagnosisUrl: 'https://peoplebooster-hr-saas-v2.vercel.app/diagnosis/demo',
      contractStartDate: new Date('2026-01-01'),
      contractEndDate: new Date('2027-01-01'),
      isActive: true,
    },
  });
  
  console.log('Company created:', company.name);
  
  // Create admin user
  const user = await prisma.user.upsert({
    where: { email: 'admin@peoplebooster.com' },
    update: {
      passwordHash: hashedPassword,
    },
    create: {
      email: 'admin@peoplebooster.com',
      passwordHash: hashedPassword,
      nickname: 'Admin',
      fullName: 'Admin User',
      role: 'COMPANY_ADMIN',
      companyId: company.id,
      isActive: true,
    },
  });
  
  console.log('User created:', user.email);
  console.log('Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
