import { prisma } from "./prisma";
import { hashPassword, verifyPassword } from "./auth";

const BOOTSTRAP_ADMIN_EMAIL = "admin@pottyfavor.com";
const BOOTSTRAP_ADMIN_PASSWORD = "admin-password-change-me";

export type BootstrapAdminResult = {
  checked: boolean;
  created: boolean;
  adminCount: number;
  userCount: number;
  email: string;
  passwordHashValid: boolean;
  error?: string;
};

export async function ensureBootstrapAdmin(): Promise<BootstrapAdminResult> {
  try {
    const [adminCount, userCount] = await Promise.all([
      prisma.user.count({ where: { role: { in: ["SUPER_ADMIN", "ADMIN"] as any } } }),
      prisma.user.count()
    ]);

    if (adminCount > 0) {
      const bootstrapAdmin = await prisma.user.findUnique({ where: { email: BOOTSTRAP_ADMIN_EMAIL } });
      return {
        checked: true,
        created: false,
        adminCount,
        userCount,
        email: BOOTSTRAP_ADMIN_EMAIL,
        passwordHashValid: bootstrapAdmin ? verifyPassword(BOOTSTRAP_ADMIN_PASSWORD, bootstrapAdmin.passwordHash) : false
      };
    }

    const passwordHash = hashPassword(BOOTSTRAP_ADMIN_PASSWORD);
    await prisma.user.upsert({
      where: { email: BOOTSTRAP_ADMIN_EMAIL },
      update: { name: "Emergency Bootstrap Admin", role: "ADMIN", status: "ACTIVE", passwordHash },
      create: { email: BOOTSTRAP_ADMIN_EMAIL, name: "Emergency Bootstrap Admin", role: "ADMIN", status: "ACTIVE", passwordHash }
    });

    return {
      checked: true,
      created: true,
      adminCount: 1,
      userCount: userCount + 1,
      email: BOOTSTRAP_ADMIN_EMAIL,
      passwordHashValid: verifyPassword(BOOTSTRAP_ADMIN_PASSWORD, passwordHash)
    };
  } catch (error) {
    return {
      checked: false,
      created: false,
      adminCount: 0,
      userCount: 0,
      email: BOOTSTRAP_ADMIN_EMAIL,
      passwordHashValid: false,
      error: error instanceof Error ? error.message : "Bootstrap admin check failed."
    };
  }
}
