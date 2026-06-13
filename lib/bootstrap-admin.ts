import { prisma } from "./prisma";
import { hashPassword, verifyPassword } from "./auth";

const BOOTSTRAP_ADMIN_EMAIL = "admin@pottyfavor.com";
const BOOTSTRAP_ADMIN_PASSWORD = "admin-password-change-me";
const ADMIN_SETUP_ERROR = "Sign in is temporarily unavailable because the admin account could not be confirmed. The database schema is present, but the seed/bootstrap admin step needs to be rerun.";
const SCHEMA_SETUP_ERROR = "Sign in is temporarily unavailable because the authentication schema could not be confirmed. Please contact support.";

type AuthSchemaProbe = {
  userTable: string | null;
  authSessionTable: string | null;
  roleEnum: string | null;
  roleValues: string[];
};

export type BootstrapAdminResult = {
  checked: boolean;
  created: boolean;
  adminCount: number;
  userCount: number;
  email: string;
  passwordHashValid: boolean;
  error?: string;
};

function logAuthSetupFailure(context: string, error: unknown, probe?: AuthSchemaProbe) {
  const err = error as { code?: string; meta?: unknown; name?: string };
  console.error("[auth-setup]", {
    context,
    prismaCode: err?.code,
    errorName: err?.name,
    meta: err?.meta,
    userTable: probe?.userTable ?? "unknown",
    authSessionTable: probe?.authSessionTable ?? "unknown",
    roleEnum: probe?.roleEnum ?? "unknown",
    roleValues: probe?.roleValues ?? []
  });
}

async function probeAuthSchema(): Promise<AuthSchemaProbe> {
  const [probe] = await prisma.$queryRaw<AuthSchemaProbe[]>`
    SELECT
      to_regclass('public."User"')::text AS "userTable",
      to_regclass('public."AuthSession"')::text AS "authSessionTable",
      to_regtype('public."Role"')::text AS "roleEnum",
      COALESCE(array_agg(e.enumlabel ORDER BY e.enumsortorder) FILTER (WHERE e.enumlabel IS NOT NULL), ARRAY[]::text[]) AS "roleValues"
    FROM pg_type t
    LEFT JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'Role';
  `;

  return probe ?? { userTable: null, authSessionTable: null, roleEnum: null, roleValues: [] };
}

function hasAuthSchema(probe: AuthSchemaProbe) {
  return probe.userTable === '"User"' && probe.authSessionTable === '"AuthSession"' && probe.roleEnum === '"Role"' && probe.roleValues.includes("ADMIN");
}

export async function ensureBootstrapAdmin(): Promise<BootstrapAdminResult> {
  let probe: AuthSchemaProbe | undefined;
  try {
    probe = await probeAuthSchema();
    if (!hasAuthSchema(probe)) {
      logAuthSetupFailure("schema_probe", new Error("auth schema incomplete"), probe);
      return {
        checked: false,
        created: false,
        adminCount: 0,
        userCount: 0,
        email: BOOTSTRAP_ADMIN_EMAIL,
        passwordHashValid: false,
        error: SCHEMA_SETUP_ERROR
      };
    }

    const [adminCountResult, userCount] = await Promise.all([
      prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*)::bigint AS count FROM "User" WHERE role::text IN ('SUPER_ADMIN', 'ADMIN')`,
      prisma.user.count()
    ]);
    const adminCount = Number(adminCountResult[0]?.count ?? 0);

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
    logAuthSetupFailure("bootstrap_admin", error, probe);
    return {
      checked: false,
      created: false,
      adminCount: 0,
      userCount: 0,
      email: BOOTSTRAP_ADMIN_EMAIL,
      passwordHashValid: false,
      error: probe && hasAuthSchema(probe) ? ADMIN_SETUP_ERROR : SCHEMA_SETUP_ERROR
    };
  }
}
