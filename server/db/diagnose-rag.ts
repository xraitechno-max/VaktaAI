import { db } from '../db';
import { sql } from 'drizzle-orm';

async function diagnoseRAG() {
  console.log('='.repeat(60));
  console.log('RAG DIAGNOSIS - DATABASE STATE');
  console.log('='.repeat(60));

  const docId = 'dd5d0e0d-1a0b-48a8-9c59-6302182ec2ab';
  const chatId = '7c69c44f-316e-4871-850b-dbd6125362ce';

  try {
    // Query 1: Check if chunks exist
    console.log('\n1. CHECKING IF CHUNKS EXIST:');
    console.log('-'.repeat(60));
    const chunksQuery = sql`
      SELECT id, doc_id, ord,
             LEFT(text, 100) as text_preview,
             tokens
      FROM chunks
      WHERE doc_id = ${docId}
      LIMIT 5
    `;
    const chunksResult = await db.execute(chunksQuery);
    console.log(`Found ${chunksResult.rows.length} chunks`);
    console.log(JSON.stringify(chunksResult.rows, null, 2));

    // Query 2: Check embedding status
    console.log('\n2. CHECKING EMBEDDING STATUS:');
    console.log('-'.repeat(60));
    const embeddingQuery = sql`
      SELECT id, ord,
             CASE WHEN embedding IS NULL THEN 'NULL' ELSE 'EXISTS' END as embedding_status,
             array_length(embedding, 1) as embedding_dimension
      FROM chunks
      WHERE doc_id = ${docId}
      LIMIT 5
    `;
    const embeddingResult = await db.execute(embeddingQuery);
    console.log(`Embedding check for ${embeddingResult.rows.length} chunks:`);
    console.log(JSON.stringify(embeddingResult.rows, null, 2));

    // Query 3: Check chat-document relationship
    console.log('\n3. CHECKING CHAT-DOCUMENT RELATIONSHIP:');
    console.log('-'.repeat(60));
    const chatQuery = sql`
      SELECT id, doc_ids, mode, created_at
      FROM chats
      WHERE id = ${chatId}
    `;
    const chatResult = await db.execute(chatQuery);
    console.log(`Chat info:`);
    console.log(JSON.stringify(chatResult.rows, null, 2));

    // Query 4: Check document exists
    console.log('\n4. CHECKING DOCUMENT EXISTS:');
    console.log('-'.repeat(60));
    const docQuery = sql`
      SELECT id, title, source_type, status,
             (metadata->>'chunkCount')::int as chunk_count
      FROM documents
      WHERE id = ${docId}
    `;
    const docResult = await db.execute(docQuery);
    console.log(`Document info:`);
    console.log(JSON.stringify(docResult.rows, null, 2));

    // Query 5: Total chunks in database
    console.log('\n5. TOTAL CHUNKS IN DATABASE:');
    console.log('-'.repeat(60));
    const totalQuery = sql`
      SELECT COUNT(*) as total_chunks,
             COUNT(DISTINCT doc_id) as total_docs
      FROM chunks
    `;
    const totalResult = await db.execute(totalQuery);
    console.log(JSON.stringify(totalResult.rows, null, 2));

  } catch (error) {
    console.error('ERROR during diagnosis:', error);
  }

  console.log('\n' + '='.repeat(60));
  console.log('DIAGNOSIS COMPLETE');
  console.log('='.repeat(60));
  process.exit(0);
}

diagnoseRAG();
