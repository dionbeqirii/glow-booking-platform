import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Database-level guarantee against double booking (NFR-01).
 *
 * The application already re-checks for conflicts before writing a booking,
 * but that check has a race: two requests can both pass it and then both
 * insert. A PostgreSQL exclusion constraint closes the race. It forbids two
 * active bookings for the same staff member whose time ranges overlap, and
 * the database enforces it atomically regardless of how many requests arrive
 * at once.
 *
 * Run once after `db:push`:  npm run db:constraints
 */
const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // btree_gist lets an exclusion constraint combine equality (staff_id) with
  // range overlap (&&) in the same GiST index.
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS btree_gist;`);

  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS booking_no_overlap;`
  );

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Booking"
    ADD CONSTRAINT booking_no_overlap
    EXCLUDE USING gist (
      "staffId" WITH =,
      tsrange("startTime", "endTime") WITH &&
    )
    WHERE (status IN ('CONFIRMED', 'CHECKED_IN', 'IN_SERVICE'));
  `);

  console.log("OK — constraint 'booking_no_overlap' u aplikua.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
