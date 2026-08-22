import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/rbac";
import { handle, ApiError } from "@/lib/api";

// Local avatar upload — any signed-in user, for their own account only.
// Same local-disk approach as /api/uploads (no cloud storage in this
// project); kept in a separate uploads/avatars folder from offer photos.
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(req: Request) {
  return handle(async () => {
    const session = await requireSession();

    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!file || !(file instanceof File)) {
      throw new ApiError(400, "Asnjë skedar nuk u dërgua");
    }
    if (!ALLOWED[file.type]) {
      throw new ApiError(400, "Formati i lejuar: JPG, PNG ose WEBP");
    }
    if (file.size > MAX_BYTES) {
      throw new ApiError(400, "Skedari nuk duhet të kalojë 5 MB");
    }

    const dir = path.join(process.cwd(), "public", "uploads", "avatars");
    await mkdir(dir, { recursive: true });

    const filename = `${randomUUID()}.${ALLOWED[file.type]}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, filename), bytes);

    const url = `/uploads/avatars/${filename}`;
    await prisma.user.update({ where: { id: session.userId }, data: { avatarUrl: url } });

    return { url };
  });
}

// DELETE — remove the current user's avatar, reverting to initials.
export async function DELETE() {
  return handle(async () => {
    const session = await requireSession();
    await prisma.user.update({ where: { id: session.userId }, data: { avatarUrl: null } });
    return { ok: true };
  });
}
