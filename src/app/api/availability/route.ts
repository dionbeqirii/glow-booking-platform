import { requireSession } from "@/lib/rbac";
import { availableSlots } from "@/lib/availability";
import { handle, ApiError } from "@/lib/api";

// FR-04 — free slots for a service on a given day.
export async function GET(req: Request) {
  return handle(async () => {
    const session = await requireSession();
    const url = new URL(req.url);
    const serviceId = url.searchParams.get("serviceId");
    const date = url.searchParams.get("date");
    const staffId = url.searchParams.get("staffId") || undefined;

    if (!serviceId || !date) {
      throw new ApiError(400, "serviceId dhe date janë të detyrueshme");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new ApiError(400, "Formati i datës duhet të jetë YYYY-MM-DD");
    }

    return availableSlots({
      serviceId,
      date,
      staffId,
      requestingClientId: session.role === "CLIENT" ? session.userId : undefined,
    });
  });
}
