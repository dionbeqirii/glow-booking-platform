import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { businessSettingsSchema } from "@/lib/validation";
import { handle, readJson } from "@/lib/api";
import { audit } from "@/lib/audit";

const ID = "business";
const DEFAULTS = { id: ID, name: "Glow By Diellza", address: null, phone: null, email: null, description: null };

// GET — the business profile (admin only).
export async function GET() {
  return handle(async () => {
    await requireRole("ADMIN");
    const settings = await prisma.businessSettings.findUnique({ where: { id: ID } });
    return { settings: settings ?? DEFAULTS };
  });
}

// PUT — create or update the business profile (admin only), stored in Supabase.
export async function PUT(req: Request) {
  return handle(async () => {
    const session = await requireRole("ADMIN");
    const data = businessSettingsSchema.parse(await readJson(req));

    const settings = await prisma.businessSettings.upsert({
      where: { id: ID },
      create: { id: ID, ...data },
      update: data,
    });

    await audit({
      userId: session.userId,
      action: "BUSINESS_SETTINGS_UPDATE",
      entity: "BusinessSettings",
      entityId: ID,
      details: settings.name,
    });

    return { settings };
  });
}
