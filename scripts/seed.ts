import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../lib/schema";

const dbPath = process.env.DATABASE_PATH || "./data/vizi.db";
const sqlite = new Database(dbPath);
const db = drizzle(sqlite, { schema });

// A few approved sightings around Washington State so the map isn't empty.
const seedLocations = [
  { lat: 47.6062, lng: -122.3321, label: "Seattle — Pike Place wall", firstSeen: "2024-08-12" },
  { lat: 47.6588, lng: -117.426, label: "Spokane — underpass", firstSeen: "2024-09-03" },
  { lat: 47.0379, lng: -122.9007, label: "Olympia — capitol way", firstSeen: "2024-10-19" },
  { lat: 47.2529, lng: -122.4443, label: "Tacoma — dome district", firstSeen: "2025-01-22" },
  { lat: 48.7519, lng: -122.4787, label: "Bellingham — railroad ave", firstSeen: "2025-03-05" },
];

const existing = db.select().from(schema.locations).all();
if (existing.length > 0) {
  console.log(`Locations already present (${existing.length}); skipping seed.`);
} else {
  db.insert(schema.locations).values(seedLocations).run();
  console.log(`Seeded ${seedLocations.length} locations.`);
}

sqlite.close();
