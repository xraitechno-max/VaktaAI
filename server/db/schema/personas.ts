import { pgTable, text, timestamp, uuid, varchar, jsonb, boolean, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const personas = pgTable("personas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  personality: jsonb("personality").$type<{
    traits: string[];
    communicationStyle: string;
    expertise: string[];
  }>(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table): any[] => [
  // Index for active personas
  index("personas_active_idx").on(table.isActive),
]);
