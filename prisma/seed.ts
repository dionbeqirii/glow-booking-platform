import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

// The seed runs as a standalone script, so it builds its own adapter.
// DIRECT_URL (non-pooled) is preferred for bulk writes; falls back to DATABASE_URL.
const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

// All data below is SYNTHETIC (thesis requirement NFR-04).
// Business demo: "Glow By Diellza" — a skincare studio.

async function main() {
  const passwordHash = await bcrypt.hash("Password123", 10);

  // ---------- Users ----------
  const admin = await prisma.user.upsert({
    where: { email: "admin@glowbydiellza.demo" },
    update: {},
    create: {
      name: "Diellza (Administratore)",
      email: "admin@glowbydiellza.demo",
      phone: "+38344000001",
      passwordHash,
      role: "ADMIN",
    },
  });

  const staffDiellza = await prisma.user.upsert({
    where: { email: "diellza@glowbydiellza.demo" },
    update: {},
    create: {
      name: "Diellza",
      email: "diellza@glowbydiellza.demo",
      phone: "+38344000002",
      passwordHash,
      role: "STAFF",
    },
  });

  const staffEra = await prisma.user.upsert({
    where: { email: "era@glowbydiellza.demo" },
    update: {},
    create: {
      name: "Era",
      email: "era@glowbydiellza.demo",
      phone: "+38344000003",
      passwordHash,
      role: "STAFF",
    },
  });

  const client = await prisma.user.upsert({
    where: { email: "arta@example.demo" },
    update: {},
    create: {
      name: "Arta K.",
      email: "arta@example.demo",
      phone: "+38344111111",
      passwordHash,
      role: "CLIENT",
    },
  });

  // ---------- Skincare services ----------
  const serviceData = [
    { name: "Pastrim fytyre", description: "Pastrim i thellë i fytyrës", durationMin: 45, price: 25 },
    { name: "Trajtim hidratues", description: "Trajtim hidratues për lëkurë të thatë", durationMin: 60, price: 35 },
    { name: "Peeling kimik", description: "Eksfolim me acide të buta", durationMin: 40, price: 40 },
    { name: "Trajtim kundër akneve", description: "Trajtim i synuar për lëkurë me akne", durationMin: 50, price: 38 },
    { name: "Masazh fytyre", description: "Masazh relaksues i fytyrës", durationMin: 30, price: 20 },
  ];

  const services = [];
  for (const s of serviceData) {
    const svc = await prisma.service.upsert({
      where: { id: `seed-${s.name}` },
      update: {},
      create: { id: `seed-${s.name}`, ...s },
    });
    services.push(svc);
  }

  // ---------- Staff skills (both staff can do all services in the demo) ----------
  for (const staff of [staffDiellza, staffEra]) {
    for (const svc of services) {
      await prisma.staffService.upsert({
        where: { staffId_serviceId: { staffId: staff.id, serviceId: svc.id } },
        update: {},
        create: { staffId: staff.id, serviceId: svc.id },
      });
    }
  }

  // ---------- Working hours: Mon–Sat 09:00–17:00 ----------
  for (const staff of [staffDiellza, staffEra]) {
    await prisma.workingHours.deleteMany({ where: { staffId: staff.id } });
    for (let weekday = 1; weekday <= 6; weekday++) {
      await prisma.workingHours.create({
        data: { staffId: staff.id, weekday, startTime: "09:00", endTime: "17:00" },
      });
    }
  }

  console.log("Seed complete:");
  console.table([
    { role: "ADMIN", email: admin.email, password: "Password123" },
    { role: "STAFF", email: staffDiellza.email, password: "Password123" },
    { role: "STAFF", email: staffEra.email, password: "Password123" },
    { role: "CLIENT", email: client.email, password: "Password123" },
  ]);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
