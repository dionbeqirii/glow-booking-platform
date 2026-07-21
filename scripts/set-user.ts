import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

/**
 * Administrative helper for local development.
 *
 * Passwords are stored as bcrypt hashes and cannot be read back, so a
 * forgotten password is replaced rather than recovered. The same script can
 * also change a user's role.
 *
 *   npm run user -- <email> --password "FjalekalimiIRi"
 *   npm run user -- <email> --role ADMIN
 *   npm run user -- <email> --password "FjalekalimiIRi" --role ADMIN
 *   npm run user -- --list
 */

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const ROLES = ["ADMIN", "STAFF", "CLIENT"] as const;
type Role = (typeof ROLES)[number];

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main() {
  if (process.argv.includes("--list")) {
    const users = await prisma.user.findMany({
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: { name: true, email: true, role: true },
    });
    console.table(users);
    return;
  }

  const email = process.argv[2]?.toLowerCase();
  const password = arg("password");
  const role = arg("role")?.toUpperCase() as Role | undefined;

  if (!email || email.startsWith("--")) {
    console.error("Përdorimi: npm run user -- <email> --password \"...\" [--role ADMIN]");
    console.error("           npm run user -- --list");
    process.exit(1);
  }
  if (!password && !role) {
    console.error("Jep të paktën --password ose --role.");
    process.exit(1);
  }
  if (role && !ROLES.includes(role)) {
    console.error(`Roli duhet të jetë një nga: ${ROLES.join(", ")}`);
    process.exit(1);
  }
  if (password && password.length < 8) {
    console.error("Fjalëkalimi duhet të ketë të paktën 8 karaktere.");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    console.error(`Nuk u gjet asnjë përdorues me email ${email}.`);
    process.exit(1);
  }

  const updated = await prisma.user.update({
    where: { email },
    data: {
      ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
      ...(role ? { role } : {}),
    },
    select: { name: true, email: true, role: true },
  });

  console.log("U përditësua:", updated);
  if (password) console.log("Fjalëkalimi i ri u vendos.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
