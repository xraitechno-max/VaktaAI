import { pgTable, text, timestamp, uuid, varchar, jsonb, integer, boolean, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const notes = pgTable("notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title").notNull(),
  content: text("content").notNull(),
  tags: jsonb("tags").$type<string[]>(),
  isPublic: boolean("is_public").default(false),
  views: integer("views").default(0),
  likes: integer("likes").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table): any[] => [
  // Index for user notes
  index("notes_user_id_idx").on(table.userId),
  // Index for public notes
  index("notes_public_idx").on(table.isPublic),
]);
