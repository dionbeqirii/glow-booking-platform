import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { feedbackSchema } from "@/lib/validation";
import { handle, readJson, ApiError } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

const ELIGIBLE = ["COMPLETED", "CANCELLED"] as const;

// PUT — the client leaves (or edits) feedback on their own finished booking.
// One feedback per booking: PUT upserts so a second submission just updates
// the existing rating/comment instead of erroring.
export async function PUT(req: Request, { params }: Ctx) {
  return handle(async () => {
    const session = await requireRole("CLIENT");
    const { id } = await params;
    const data = feedbackSchema.parse(await readJson(req));

    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking || booking.clientId !== session.userId) {
      throw new ApiError(404, "Rezervimi nuk u gjet");
    }
    if (!ELIGIBLE.includes(booking.status as (typeof ELIGIBLE)[number])) {
      throw new ApiError(400, "Feedback lejohet vetëm pas përfundimit ose anulimit të termini");
    }

    const feedback = await prisma.feedback.upsert({
      where: { bookingId: id },
      create: { bookingId: id, clientId: session.userId, rating: data.rating, comment: data.comment },
      update: { rating: data.rating, comment: data.comment },
    });

    return { feedback };
  });
}
