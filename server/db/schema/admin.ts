import { pgTable, text, timestamp, uuid, varchar, jsonb, boolean, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const admin = pgTable("admin", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: varchar("role").notNull(), // 'admin', 'super_admin'
  permissions: jsonb("permissions").$type<string[]>(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table): any[] => [
  // Index for admin users
  index("admin_user_id_idx").on(table.userId),
  // Index for role
  index("admin_role_idx").on(table.role),
]);
