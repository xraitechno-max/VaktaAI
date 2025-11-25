import { pgTable, text, timestamp, uuid, boolean, integer, jsonb, varchar, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title").notNull(),
  sourceType: varchar("source_type").notNull(), // 'pdf', 'docx', 'youtube', 'web', 'audio', 'video'
  sourceUrl: varchar("source_url"),
  fileKey: varchar("file_key"), // object storage key
  fileHash: varchar("file_hash"), // SHA-256 hash for deduplication
  pages: integer("pages"),
  language: varchar("lang").default('en'),
  tokens: integer("tokens"),
  status: varchar("status").default('processing'), // 'processing', 'partially_ready', 'ready', 'error'
  processingProgress: integer("processing_progress").default(0), // 0-100
  processingError: text("processing_error"),
  isNCERT: boolean("is_ncert").default(false),
  ncertClass: integer("ncert_class"),
  ncertSubject: varchar("ncert_subject"),
  sharedFrom: varchar("shared_from"), // Reference to original document
  totalChunks: integer("total_chunks").default(0),
  metadata: jsonb("metadata").$type<{
    videoId?: string;
    url?: string;
    duration?: string;
    segments?: number;
    extractedAt?: string;
    [key: string]: any;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table): any[] => [
  // Composite index for user documents ordered by creation
  index("documents_user_id_created_at_idx").on(table.userId, table.createdAt),
  // Index for filtering by status
  index("documents_status_idx").on(table.status),
  // Index for file hash deduplication
  index("documents_file_hash_idx").on(table.fileHash),
  // Index for NCERT documents
  index("documents_ncert_idx").on(table.isNCERT),
]);
