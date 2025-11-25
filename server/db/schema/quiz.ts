import { pgTable, text, timestamp, uuid, integer, jsonb, varchar, boolean, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const quiz = pgTable("quiz", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title").notNull(),
  subject: varchar("subject").notNull(),
  level: varchar("level"),
  topic: varchar("topic").notNull(),
  questions: jsonb("questions").$type<{
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
  }[]>(),
  totalQuestions: integer("total_questions").notNull(),
  timeLimit: integer("time_limit"), // in minutes
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table): any[] => [
  // Index for user quizzes
  index("quiz_user_id_idx").on(table.userId),
  // Index for public quizzes
  index("quiz_public_idx").on(table.isPublic),
]);
