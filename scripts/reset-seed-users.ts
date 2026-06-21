import { PrismaClient } from "@prisma/client";
import { upsertSeedLoginUsers } from "../lib/seed-users";

const prisma = new PrismaClient();

async function main() {
  const users = await upsertSeedLoginUsers(prisma);
  console.log(JSON.stringify({ ok: true, users }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
