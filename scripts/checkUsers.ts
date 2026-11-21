import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main(){
  const users = await prisma.user.findMany({select:{nipp:true,role:true}});
  console.log('🚀 Users in DB:', users);
}
main().catch(e=>{console.error(e);process.exit(1);}).finally(()=>prisma.$disconnect());