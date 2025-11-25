import { pgTable, text, timestamp, uuid, boolean, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  role: text('role').notNull().default('user'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at'),
  profileData: text('profile_data'), // JSON string
  preferences: text('preferences'), // JSON string
  subscriptionTier: text('subscription_tier').default('free'),
  subscriptionExpiresAt: timestamp('subscription_expires_at'),
  totalSessions: integer('total_sessions').default(0),
  totalStudyTime: integer('total_study_time').default(0), // in minutes
});
