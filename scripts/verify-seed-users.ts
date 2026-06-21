import { PrismaClient } from "@prisma/client";
import { verifySeedLoginUsers } from "../lib/seed-users";

const prisma = new PrismaClient();

async function main() {
  const users = await verifySeedLoginUsers(prisma);
  console.table(users);

  const missingOrInvalid = users.filter((user) => !user.exists || !user.passwordMatches);
  if (missingOrInvalid.length > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
