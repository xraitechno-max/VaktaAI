import crypto from 'crypto';
import type {
  NCERTChunk,
  NCERTChunkMetadata,
  NCERTChapterContent,
  ClassLevel,
  SubjectCode,
  ChunkType,
  DifficultyTag,
} from '@shared/schema';

const MAX_TOKENS = 480;
const MIN_TOKENS = 90;
const WORD_OVERLAP = 60;

interface SectionContent {
  number: string;
  title: string;
  pageRange: [number, number];
  content: string;
  difficultyTag?: DifficultyTag;
}

interface ChapterMeta {
  classLevel: ClassLevel;
  subject: SubjectCode;
  book: string;
  chapterNumber: string;
  chapterTitle: string;
  language: 'english' | 'hindi';
  examWeightage?: number;
}

export class NCERTChunker {
  countTokens(text: string): number {
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    return Math.ceil(words.length / 0.75);
  }

  generateChunkId(metadata: NCERTChunkMetadata): string {
    const baseId = `ncert_${metadata.classLevel}_${metadata.subject}_${metadata.chapterNumber}_${metadata.sectionNumber || 'main'}_${metadata.chunkType}_${metadata.chunkIndex || 0}`;
    
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(metadata))
      .digest('hex')
      .substring(0, 8);
    
    return `${baseId}_${hash}`;
  }

  chunkChapter(content: NCERTChapterContent): NCERTChunk[] {
    const chunks: NCERTChunk[] = [];
    const chapterMeta: ChapterMeta = {
      classLevel: content.classLevel,
      subject: content.subject,
      book: content.book,
      chapterNumber: content.chapterNumber,
      chapterTitle: content.chapterTitle,
      language: 'english',
      examWeightage: this.calculateExamWeightage(content),
    };

    for (const section of content.sections) {
      const sectionChunks = this.chunkSection(section, chapterMeta);
      chunks.push(...sectionChunks);
    }

    if (content.formulas && content.formulas.length > 0) {
      const formulaChunk = this.createFormulaChunk(content.formulas, chapterMeta);
      if (formulaChunk) {
        chunks.push(formulaChunk);
      }
    }

    if (content.summary) {
      const summaryChunk = this.createSummaryChunk(content.summary, chapterMeta);
      if (summaryChunk) {
        chunks.push(summaryChunk);
      }
    }

    if (content.keyPoints && content.keyPoints.length > 0) {
      const keyPointsChunk = this.createKeyPointsChunk(content.keyPoints, chapterMeta);
      if (keyPointsChunk) {
        chunks.push(keyPointsChunk);
      }
    }

    if (content.glossary && Object.keys(content.glossary).length > 0) {
      const glossaryChunk = this.createGlossaryChunk(content.glossary, chapterMeta);
      if (glossaryChunk) {
        chunks.push(glossaryChunk);
      }
    }

    return chunks;
  }

  chunkSection(section: SectionContent, chapterMeta: ChapterMeta): NCERTChunk[] {
    const chunks: NCERTChunk[] = [];
    const tokens = this.countTokens(section.content);

    if (tokens <= MAX_TOKENS) {
      const metadata: NCERTChunkMetadata = {
        source: 'ncert',
        classLevel: chapterMeta.classLevel,
        subject: chapterMeta.subject,
        book: chapterMeta.book,
        chapterNumber: chapterMeta.chapterNumber,
        chapterTitle: chapterMeta.chapterTitle,
        sectionNumber: section.number,
        sectionTitle: section.title,
        chunkType: 'section',
        chunkIndex: 0,
        isCompleteSection: true,
        pageRange: section.pageRange,
        language: chapterMeta.language,
        difficultyTag: section.difficultyTag,
        examWeightage: chapterMeta.examWeightage,
      };

      chunks.push({
        chunkId: this.generateChunkId(metadata),
        content: section.content,
        tokens,
        metadata,
      });
    } else {
      const parts = this.splitWithOverlap(section.content);
      
      for (let i = 0; i < parts.length; i++) {
        const partTokens = this.countTokens(parts[i]);
        
        const metadata: NCERTChunkMetadata = {
          source: 'ncert',
          classLevel: chapterMeta.classLevel,
          subject: chapterMeta.subject,
          book: chapterMeta.book,
          chapterNumber: chapterMeta.chapterNumber,
          chapterTitle: chapterMeta.chapterTitle,
          sectionNumber: section.number,
          sectionTitle: section.title,
          chunkType: 'section_part',
          chunkIndex: i,
          isCompleteSection: false,
          pageRange: section.pageRange,
          language: chapterMeta.language,
          difficultyTag: section.difficultyTag,
          examWeightage: chapterMeta.examWeightage,
        };

        chunks.push({
          chunkId: this.generateChunkId(metadata),
          content: parts[i],
          tokens: partTokens,
          metadata,
        });
      }
    }

    return chunks;
  }

  private splitWithOverlap(text: string): string[] {
    const words = text.trim().split(/\s+/);
    const parts: string[] = [];
    
    const targetWordsPerChunk = Math.floor(MAX_TOKENS * 0.75);
    
    let startIndex = 0;
    
    while (startIndex < words.length) {
      const endIndex = Math.min(startIndex + targetWordsPerChunk, words.length);
      const chunk = words.slice(startIndex, endIndex).join(' ');
      
      const chunkTokens = this.countTokens(chunk);
      if (chunkTokens >= MIN_TOKENS || parts.length === 0) {
        parts.push(chunk);
      } else if (parts.length > 0) {
        parts[parts.length - 1] += ' ' + chunk;
      }
      
      if (endIndex >= words.length) break;
      
      startIndex = endIndex - WORD_OVERLAP;
      if (startIndex <= 0 && parts.length > 0) {
        startIndex = endIndex;
      }
    }

    return parts;
  }

  private createFormulaChunk(formulas: string[], chapterMeta: ChapterMeta): NCERTChunk | null {
    const formulaContent = formulas.map((f, i) => `${i + 1}. ${f}`).join('\n');
    const tokens = this.countTokens(formulaContent);
    
    if (tokens < MIN_TOKENS) return null;

    const metadata: NCERTChunkMetadata = {
      source: 'ncert',
      classLevel: chapterMeta.classLevel,
      subject: chapterMeta.subject,
      book: chapterMeta.book,
      chapterNumber: chapterMeta.chapterNumber,
      chapterTitle: chapterMeta.chapterTitle,
      chunkType: 'formulas',
      chunkIndex: 0,
      language: chapterMeta.language,
      formulaCount: formulas.length,
      examWeightage: chapterMeta.examWeightage,
    };

    return {
      chunkId: this.generateChunkId(metadata),
      content: `Key Formulas for ${chapterMeta.chapterTitle}:\n\n${formulaContent}`,
      tokens,
      metadata,
    };
  }

  private createSummaryChunk(summary: string, chapterMeta: ChapterMeta): NCERTChunk | null {
    const tokens = this.countTokens(summary);
    
    if (tokens < MIN_TOKENS) return null;

    const metadata: NCERTChunkMetadata = {
      source: 'ncert',
      classLevel: chapterMeta.classLevel,
      subject: chapterMeta.subject,
      book: chapterMeta.book,
      chapterNumber: chapterMeta.chapterNumber,
      chapterTitle: chapterMeta.chapterTitle,
      chunkType: 'summary',
      chunkIndex: 0,
      language: chapterMeta.language,
      examWeightage: chapterMeta.examWeightage,
    };

    return {
      chunkId: this.generateChunkId(metadata),
      content: `Chapter Summary - ${chapterMeta.chapterTitle}:\n\n${summary}`,
      tokens,
      metadata,
    };
  }

  private createKeyPointsChunk(keyPoints: string[], chapterMeta: ChapterMeta): NCERTChunk | null {
    const keyPointsContent = keyPoints.map((kp, i) => `• ${kp}`).join('\n');
    const tokens = this.countTokens(keyPointsContent);
    
    if (tokens < MIN_TOKENS) return null;

    const metadata: NCERTChunkMetadata = {
      source: 'ncert',
      classLevel: chapterMeta.classLevel,
      subject: chapterMeta.subject,
      book: chapterMeta.book,
      chapterNumber: chapterMeta.chapterNumber,
      chapterTitle: chapterMeta.chapterTitle,
      chunkType: 'key_points',
      chunkIndex: 0,
      language: chapterMeta.language,
      keyPointCount: keyPoints.length,
      examWeightage: chapterMeta.examWeightage,
    };

    return {
      chunkId: this.generateChunkId(metadata),
      content: `Key Points - ${chapterMeta.chapterTitle}:\n\n${keyPointsContent}`,
      tokens,
      metadata,
    };
  }

  private createGlossaryChunk(glossary: Record<string, string>, chapterMeta: ChapterMeta): NCERTChunk | null {
    const glossaryEntries = Object.entries(glossary)
      .map(([term, definition]) => `${term}: ${definition}`)
      .join('\n\n');
    
    const tokens = this.countTokens(glossaryEntries);
    
    if (tokens < MIN_TOKENS) return null;

    const metadata: NCERTChunkMetadata = {
      source: 'ncert',
      classLevel: chapterMeta.classLevel,
      subject: chapterMeta.subject,
      book: chapterMeta.book,
      chapterNumber: chapterMeta.chapterNumber,
      chapterTitle: chapterMeta.chapterTitle,
      chunkType: 'glossary',
      chunkIndex: 0,
      language: chapterMeta.language,
      examWeightage: chapterMeta.examWeightage,
    };

    return {
      chunkId: this.generateChunkId(metadata),
      content: `Glossary - ${chapterMeta.chapterTitle}:\n\n${glossaryEntries}`,
      tokens,
      metadata,
    };
  }

  private calculateExamWeightage(content: NCERTChapterContent): number {
    let weightage = 5;
    
    if (content.examRelevance) {
      const { boards, jee, neet } = content.examRelevance;
      
      if (jee && jee.length > 0) weightage += 2;
      if (neet && neet.length > 0) weightage += 2;
      if (boards && boards.length > 0) weightage += 1;
    }

    return Math.min(weightage, 10);
  }

  estimateChunkCount(content: NCERTChapterContent): number {
    let count = 0;

    for (const section of content.sections) {
      const tokens = this.countTokens(section.content);
      if (tokens <= MAX_TOKENS) {
        count += 1;
      } else {
        count += Math.ceil(tokens / (MAX_TOKENS - WORD_OVERLAP));
      }
    }

    if (content.formulas && content.formulas.length > 0) count += 1;
    if (content.summary) count += 1;
    if (content.keyPoints && content.keyPoints.length > 0) count += 1;
    if (content.glossary && Object.keys(content.glossary).length > 0) count += 1;

    return count;
  }
}

export const ncertChunker = new NCERTChunker();
