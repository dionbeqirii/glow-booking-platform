import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { requireRole } from "@/lib/rbac";
import { handle, ApiError } from "@/lib/api";

// Local image upload for admin-authored content (offer photos). No cloud
// storage is wired into this project, so files are written under
// public/uploads — fine for a self-contained thesis demo, not for a
// multi-instance production deploy (files wouldn't survive a redeploy on
// most hosts).
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(req: Request) {
  return handle(async () => {
    await requireRole("ADMIN");

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

    const dir = path.join(process.cwd(), "public", "uploads", "ofertat");
    await mkdir(dir, { recursive: true });

    // A random filename — never trust the client-supplied name.
    const filename = `${randomUUID()}.${ALLOWED[file.type]}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, filename), bytes);

    return { url: `/uploads/ofertat/${filename}` };
  });
}
