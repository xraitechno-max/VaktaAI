import { pgTable, text, timestamp, uuid, varchar, jsonb, integer, boolean, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const voiceSessions = pgTable("voice_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  sessionType: varchar("session_type").notNull(), // 'tutor', 'practice', 'assessment'
  subject: varchar("subject").notNull(),
  level: varchar("level"),
  topic: varchar("topic").notNull(),
  duration: integer("duration"), // in seconds
  transcript: text("transcript"),
  analysis: jsonb("analysis").$type<{
    fluency: number;
    pronunciation: number;
    grammar: number;
    vocabulary: number;
    overallScore: number;
  }>(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table): any[] => [
  // Index for user voice sessions
  index("voice_sessions_user_id_idx").on(table.userId),
  // Index for session type
  index("voice_sessions_type_idx").on(table.sessionType),
]);
