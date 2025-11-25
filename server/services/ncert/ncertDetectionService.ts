import { db } from '../../db';
import { documents, ncertBooks } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import axios from 'axios';

interface NCERTBook {
  class: number;
  subject: string;
  board: string;
  chapters: Array<{
    ch: number;
    title: string;
    url: string;
  }>;
}

interface NCERTDetectionResult {
  isNCERT: boolean;
  book?: NCERTBook;
  confidence: number;
  detectionMethod: 'hash' | 'metadata' | 'none';
}

export class NCERTDetectionService {
  private dikshaApiKey: string;
  private dikshaBaseUrl = 'https://diksha.gov.in/api/content/v1';

  constructor() {
    this.dikshaApiKey = process.env.DIKSHA_API_KEY || '';
  }

  /**
   * Detect if document is NCERT
   */
  async detectNCERT(params: {
    filePath: string;
    fileName: string;
    fileHash: string;
    fileSize: number;
    userId: string;
  }): Promise<NCERTDetectionResult> {
    const { filePath, fileName, fileHash, fileSize, userId } = params;

    console.log(`[NCERTDetection] Analyzing: ${fileName}`);

    // Method 1: Hash-based detection (instant)
    const hashResult = await this.detectByHash(fileHash);
    if (hashResult.isNCERT) {
      console.log(`[NCERTDetection] ✅ Hash match found: ${hashResult.book?.subject} Class ${hashResult.book?.class}`);
      return hashResult;
    }

    // Method 2: Metadata-based detection
    const metadataResult = await this.detectByMetadata(fileName, fileSize);
    if (metadataResult.isNCERT) {
      console.log(`[NCERTDetection] ✅ Metadata match: ${metadataResult.book?.subject} Class ${metadataResult.book?.class}`);
      return metadataResult;
    }

    console.log(`[NCERTDetection] ❌ Not NCERT: ${fileName}`);
    return { isNCERT: false, confidence: 0, detectionMethod: 'none' };
  }

  /**
   * Detect by file hash (instant)
   */
  private async detectByHash(fileHash: string): Promise<NCERTDetectionResult> {
    try {
      const existingBook = await db.query.ncertBooks.findFirst({
        where: eq(ncertBooks.fileHash, fileHash)
      });

      if (existingBook) {
        return {
          isNCERT: true,
          book: {
            class: existingBook.class,
            subject: existingBook.subject,
            board: existingBook.board,
            chapters: existingBook.chapters as any[]
          },
          confidence: 1.0,
          detectionMethod: 'hash'
        };
      }

      return { isNCERT: false, confidence: 0, detectionMethod: 'hash' };
    } catch (error) {
      console.error('[NCERTDetection] Hash detection failed:', error);
      return { isNCERT: false, confidence: 0, detectionMethod: 'hash' };
    }
  }

  /**
   * Detect by filename and size metadata
   */
  private async detectByMetadata(fileName: string, fileSize: number): Promise<NCERTDetectionResult> {
    try {
      // Extract class and subject from filename
      const metadata = this.extractMetadataFromFilename(fileName);
      if (!metadata) {
        return { isNCERT: false, confidence: 0, detectionMethod: 'metadata' };
      }

      // Check if similar book exists in database
      const similarBook = await db.query.ncertBooks.findFirst({
        where: and(
          eq(ncertBooks.class, metadata.class),
          eq(ncertBooks.subject, metadata.subject),
          eq(ncertBooks.board, metadata.board)
        )
      });

      if (similarBook) {
        // Calculate confidence based on size similarity
        const sizeDiff = Math.abs(similarBook.fileSize - fileSize);
        const sizeSimilarity = Math.max(0, 1 - (sizeDiff / similarBook.fileSize));
        
        if (sizeSimilarity > 0.8) {
          return {
            isNCERT: true,
            book: {
              class: similarBook.class,
              subject: similarBook.subject,
              board: similarBook.board,
              chapters: similarBook.chapters as any[]
            },
            confidence: sizeSimilarity,
            detectionMethod: 'metadata'
          };
        }
      }

      return { isNCERT: false, confidence: 0, detectionMethod: 'metadata' };
    } catch (error) {
      console.error('[NCERTDetection] Metadata detection failed:', error);
      return { isNCERT: false, confidence: 0, detectionMethod: 'metadata' };
    }
  }

  /**
   * Extract class, subject, board from filename
   */
  private extractMetadataFromFilename(fileName: string): {
    class: number;
    subject: string;
    board: string;
  } | null {
    const name = fileName.toLowerCase();

    // Class patterns
    const classMatch = name.match(/(?:class|grade)\s*(\d+)|(\d+)(?:th|st|nd|rd)/);
    if (!classMatch) return null;

    const classNum = parseInt(classMatch[1] || classMatch[2]);

    // Subject patterns
    const subjects = {
      'mathematics': 'Mathematics',
      'maths': 'Mathematics',
      'science': 'Science',
      'physics': 'Physics',
      'chemistry': 'Chemistry',
      'biology': 'Biology',
      'english': 'English',
      'hindi': 'Hindi',
      'social': 'Social Science',
      'history': 'History',
      'geography': 'Geography',
      'civics': 'Civics',
      'economics': 'Economics'
    };

    let subject = 'General';
    for (const [key, value] of Object.entries(subjects)) {
      if (name.includes(key)) {
        subject = value;
        break;
      }
    }

    // Board detection
    const board = name.includes('cbse') ? 'CBSE' : 
                  name.includes('icse') ? 'ICSE' : 
                  name.includes('state') ? 'State Board' : 'CBSE';

    return { class: classNum, subject, board };
  }

  /**
   * Auto-fetch complete NCERT book from DIKSHA
   */
  async autoFetchNCERTBook(params: {
    class: number;
    subject: string;
    board: string;
    userId: string;
  }): Promise<{
    success: boolean;
    bookId?: string;
    chapters?: any[];
    error?: string;
  }> {
    const { class: classNum, subject, board, userId } = params;

    try {
      console.log(`[NCERTDetection] Auto-fetching: ${subject} Class ${classNum}`);

      // Search DIKSHA for NCERT content
      const searchResponse = await axios.get(`${this.dikshaBaseUrl}/search`, {
        params: {
          request: {
            filters: {
              contentType: ['TextBook'],
              board: [board],
              gradeLevel: [classNum.toString()],
              subject: [subject],
              publisher: ['NCERT']
            },
            limit: 1
          }
        },
        headers: {
          'Authorization': `Bearer ${this.dikshaApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const content = searchResponse.data?.result?.content?.[0];
      if (!content) {
        return { success: false, error: 'NCERT book not found on DIKSHA' };
      }

      // Get detailed content with chapters
      const detailResponse = await axios.get(`${this.dikshaBaseUrl}/read/${content.identifier}`, {
        headers: {
          'Authorization': `Bearer ${this.dikshaApiKey}`
        }
      });

      const chapters = detailResponse.data?.result?.content?.children || [];

      // Store in database
      const bookId = crypto.randomUUID();
      const fileHash = crypto.createHash('sha256')
        .update(`${classNum}-${subject}-${board}-${Date.now()}`)
        .digest('hex');

      await db.insert(ncertBooks).values({
        id: bookId,
        class: classNum,
        subject,
        board,
        title: content.name,
        fileHash,
        fileSize: 0, // Virtual book
        chapters: chapters.map((ch: any, index: number) => ({
          ch: index + 1,
          title: ch.name,
          url: ch.identifier
        })),
        isVirtual: true,
        createdAt: new Date()
      });

      console.log(`[NCERTDetection] ✅ Auto-fetched: ${chapters.length} chapters`);

      return {
        success: true,
        bookId,
        chapters: chapters.map((ch: any, index: number) => ({
          ch: index + 1,
          title: ch.name,
          url: ch.identifier
        }))
      };

    } catch (error: any) {
      console.error('[NCERTDetection] Auto-fetch failed:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch from DIKSHA'
      };
    }
  }

  /**
   * Store NCERT book in database
   */
  async storeNCERTBook(params: {
    class: number;
    subject: string;
    board: string;
    fileHash: string;
    fileSize: number;
    chapters: any[];
    userId: string;
  }): Promise<string> {
    const { class: classNum, subject, board, fileHash, fileSize, chapters, userId } = params;

    const bookId = crypto.randomUUID();

    await db.insert(ncertBooks).values({
      id: bookId,
      class: classNum,
      subject,
      board,
      title: `${subject} Class ${classNum}`,
      fileHash,
      fileSize,
      chapters,
      isVirtual: false,
      userId,
      createdAt: new Date()
    });

    console.log(`[NCERTDetection] Stored NCERT book: ${bookId}`);
    return bookId;
  }

  /**
   * Get NCERT book details
   */
  async getNCERTBook(bookId: string): Promise<any> {
    return await db.query.ncertBooks.findFirst({
      where: eq(ncertBooks.id, bookId)
    });
  }

  /**
   * Check if user already has this NCERT book
   */
  async checkExistingNCERT(params: {
    class: number;
    subject: string;
    userId: string;
  }): Promise<{ exists: boolean; bookId?: string }> {
    const { class: classNum, subject, userId } = params;

    const existing = await db.query.ncertBooks.findFirst({
      where: and(
        eq(ncertBooks.class, classNum),
        eq(ncertBooks.subject, subject),
        eq(ncertBooks.userId, userId)
      )
    });

    return {
      exists: !!existing,
      bookId: existing?.id
    };
  }
}

export const ncertDetectionService = new NCERTDetectionService();
