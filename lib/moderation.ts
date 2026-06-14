import { asc, desc, eq } from "drizzle-orm";
import { db } from "./db";
import { locations, submissionImages, submissions } from "./schema";

export type SubmissionWithImages = {
  submission: typeof submissions.$inferSelect;
  images: (typeof submissionImages.$inferSelect)[];
};

export function listSubmissions(status?: string): SubmissionWithImages[] {
  const rows = status
    ? db.select().from(submissions).where(eq(submissions.status, status)).orderBy(desc(submissions.submittedAt)).all()
    : db.select().from(submissions).orderBy(desc(submissions.submittedAt)).all();

  return rows.map((s) => ({
    submission: s,
    images: db
      .select()
      .from(submissionImages)
      .where(eq(submissionImages.submissionId, s.id))
      .orderBy(asc(submissionImages.id))
      .all(),
  }));
}

export type Adjustments = {
  lat?: number;
  lng?: number;
  label?: string | null;
  description?: string | null;
};

/**
 * Approve a submission. For `new`, creates a published location; for `update`,
 * applies changes to the target location. Admin-supplied adjustments override
 * the submitted values. Returns the affected location id.
 */
export function approveSubmission(id: number, adj: Adjustments = {}): number {
  return db.transaction((tx) => {
    const sub = tx.select().from(submissions).where(eq(submissions.id, id)).get();
    if (!sub) throw new Error("submission not found");
    if (sub.status !== "pending") throw new Error("submission already decided");

    const firstImage = tx
      .select()
      .from(submissionImages)
      .where(eq(submissionImages.submissionId, id))
      .orderBy(asc(submissionImages.id))
      .get();

    const lat = adj.lat ?? sub.lat;
    const lng = adj.lng ?? sub.lng;
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);

    let locationId: number;
    if (sub.type === "update" && sub.targetLocationId) {
      locationId = sub.targetLocationId;
      tx.update(locations)
        .set({
          lat,
          lng,
          ...(adj.label !== undefined ? { label: adj.label } : {}),
          ...(adj.description !== undefined ? { description: adj.description } : {}),
          ...(firstImage ? { currentImageId: firstImage.id } : {}),
          updatedAt: now,
        })
        .where(eq(locations.id, locationId))
        .run();
    } else {
      const inserted = tx
        .insert(locations)
        .values({
          lat,
          lng,
          label: adj.label ?? null,
          description: adj.description ?? sub.note ?? null,
          status: "approved",
          firstSeen: sub.submittedAt.slice(0, 10),
          currentImageId: firstImage?.id ?? null,
        })
        .returning({ id: locations.id })
        .get();
      locationId = inserted.id;
    }

    tx.update(submissions)
      .set({ status: "approved", decidedAt: now })
      .where(eq(submissions.id, id))
      .run();

    return locationId;
  });
}

export function rejectSubmission(id: number, note?: string): void {
  const now = new Date().toISOString().replace("T", " ").slice(0, 19);
  const res = db
    .update(submissions)
    .set({ status: "rejected", reviewerNote: note ?? null, decidedAt: now })
    .where(eq(submissions.id, id))
    .run();
  if (res.changes === 0) throw new Error("submission not found");
}
