import { sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

/**
 * Published sightings shown on the public map. A row only exists here once an
 * admin has approved a submission.
 */
export const locations = sqliteTable(
  "locations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    label: text("label"),
    description: text("description"),
    // approved | archived
    status: text("status").notNull().default("approved"),
    firstSeen: text("first_seen"),
    currentImageId: integer("current_image_id"),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text("updated_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => ({
    bboxIdx: index("locations_bbox_idx").on(t.lat, t.lng),
    statusIdx: index("locations_status_idx").on(t.status),
  }),
);

/**
 * Incoming submissions queue. Nothing here is visible on the public map until
 * an admin approves it (which creates/updates a `locations` row).
 */
export const submissions = sqliteTable(
  "submissions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    // new | update
    type: text("type").notNull(),
    targetLocationId: integer("target_location_id"),
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    note: text("note"),
    deviceId: text("device_id").notNull(),
    ipHash: text("ip_hash"),
    // pending | approved | rejected
    status: text("status").notNull().default("pending"),
    reviewerNote: text("reviewer_note"),
    submittedAt: text("submitted_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
    decidedAt: text("decided_at"),
  },
  (t) => ({
    statusIdx: index("submissions_status_idx").on(t.status),
    deviceIdx: index("submissions_device_idx").on(t.deviceId, t.submittedAt),
  }),
);

export const submissionImages = sqliteTable("submission_images", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  submissionId: integer("submission_id").notNull(),
  path: text("path").notNull(),
  thumbPath: text("thumb_path").notNull(),
  mime: text("mime").notNull(),
  width: integer("width"),
  height: integer("height"),
  createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

/** Soft "hardware ID" tracking + abuse controls. */
export const devices = sqliteTable("devices", {
  deviceId: text("device_id").primaryKey(),
  firstSeen: text("first_seen").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  lastSeen: text("last_seen").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  submissionCount: integer("submission_count").notNull().default(0),
  blocked: integer("blocked", { mode: "boolean" }).notNull().default(false),
});

export type Location = typeof locations.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type SubmissionImage = typeof submissionImages.$inferSelect;
export type Device = typeof devices.$inferSelect;
