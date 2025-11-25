import OpenAI from 'openai';
import Tesseract from 'tesseract.js';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

interface OCRResult {
  text: string;
  confidence: number;
  method: 'gpt4v' | 'tesseract' | 'hybrid';
  language: 'hi' | 'en' | 'mixed';
  processingTime: number;
}

interface ImagePreprocessingOptions {
  enhance: boolean;
  denoise: boolean;
  contrast: number;
  brightness: number;
}

export class HindiOCRService {
  private openai: OpenAI;
  private tesseractOptions = {
    logger: (m: any) => console.log(`[Tesseract] ${m.status}: ${m.progress * 100}%`),
  };

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Main OCR method with fallback strategy
   */
  async extractTextFromImage(params: {
    imagePath: string;
    language?: 'hi' | 'en' | 'mixed';
    useGPT4V?: boolean;
    preprocessing?: ImagePreprocessingOptions;
  }): Promise<OCRResult> {
    const { imagePath, language = 'mixed', useGPT4V = true, preprocessing } = params;
    
    console.log(`[HindiOCR] Processing: ${path.basename(imagePath)}`);

    const startTime = Date.now();

    try {
      // Step 1: Preprocess image if needed
      const processedImagePath = preprocessing ? 
        await this.preprocessImage(imagePath, preprocessing) : 
        imagePath;

      let result: OCRResult;

      if (useGPT4V) {
        // Try GPT-4V first (best for Hindi)
        result = await this.extractWithGPT4V(processedImagePath, language);
        
        // If confidence is low, try Tesseract as backup
        if (result.confidence < 0.7) {
          console.log(`[HindiOCR] GPT-4V confidence low (${result.confidence}), trying Tesseract...`);
          const tesseractResult = await this.extractWithTesseract(processedImagePath, language);
          
          // Use Tesseract if it's better
          if (tesseractResult.confidence > result.confidence) {
            result = tesseractResult;
          }
        }
      } else {
        // Use Tesseract directly
        result = await this.extractWithTesseract(processedImagePath, language);
      }

      // Clean up processed image if created
      if (processedImagePath !== imagePath) {
        fs.unlinkSync(processedImagePath);
      }

      result.processingTime = Date.now() - startTime;
      
      console.log(`[HindiOCR] ✅ Extracted ${result.text.length} chars (${result.method}, ${result.confidence.toFixed(2)} confidence)`);
      
      return result;

    } catch (error) {
      console.error('[HindiOCR] OCR failed:', error);
      
      return {
        text: '',
        confidence: 0,
        method: 'tesseract',
        language: 'en',
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Extract text using GPT-4V (best for Hindi)
   */
  private async extractWithGPT4V(imagePath: string, language: string): Promise<OCRResult> {
    try {
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');

      const prompt = language === 'hi' ? 
        'Extract all Hindi text from this image. Include English text if present. Return only the extracted text without any additional formatting or explanation.' :
        language === 'en' ?
        'Extract all English text from this image. Return only the extracted text without any additional formatting or explanation.' :
        'Extract all text from this image (both Hindi and English). Return only the extracted text without any additional formatting or explanation.';

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
        temperature: 0.1
      });

      const extractedText = response.choices[0]?.message?.content || '';
      
      // Calculate confidence based on text quality
      const confidence = this.calculateTextConfidence(extractedText, language);
      
      return {
        text: extractedText,
        confidence,
        method: 'gpt4v',
        language: this.detectLanguage(extractedText),
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('[HindiOCR] GPT-4V failed:', error);
      throw error;
    }
  }

  /**
   * Extract text using Tesseract.js (fallback)
   */
  private async extractWithTesseract(imagePath: string, language: string): Promise<OCRResult> {
    try {
      // Configure language for Tesseract
      const lang = language === 'hi' ? 'hin+eng' : 
                   language === 'en' ? 'eng' : 'hin+eng';

      const { data: { text, confidence } } = await Tesseract.recognize(
        imagePath,
        lang,
        this.tesseractOptions
      );

      return {
        text: text.trim(),
        confidence: confidence / 100, // Convert to 0-1 scale
        method: 'tesseract',
        language: this.detectLanguage(text),
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('[HindiOCR] Tesseract failed:', error);
      throw error;
    }
  }

  /**
   * Preprocess image for better OCR
   */
  private async preprocessImage(
    imagePath: string, 
    options: ImagePreprocessingOptions
  ): Promise<string> {
    const outputPath = path.join(
      path.dirname(imagePath),
      `processed_${path.basename(imagePath)}`
    );

    let pipeline = sharp(imagePath);

    if (options.enhance) {
      // Enhance image quality
      pipeline = pipeline
        .normalize()
        .sharpen()
        .modulate({
          brightness: options.brightness || 1.1,
          saturation: options.saturation || 1.2
        });
    }

    if (options.denoise) {
      // Apply denoising
      pipeline = pipeline.median(3);
    }

    await pipeline
      .jpeg({ quality: 95 })
      .toFile(outputPath);

    return outputPath;
  }

  /**
   * Calculate text confidence based on quality indicators
   */
  private calculateTextConfidence(text: string, expectedLanguage: string): number {
    if (!text || text.length < 10) return 0;

    let confidence = 0.5; // Base confidence

    // Length factor
    if (text.length > 100) confidence += 0.1;
    if (text.length > 500) confidence += 0.1;

    // Language detection factor
    const detectedLang = this.detectLanguage(text);
    if (detectedLang === expectedLanguage || detectedLang === 'mixed') {
      confidence += 0.2;
    }

    // Character quality factor
    const alphaRatio = (text.match(/[a-zA-Z\u0900-\u097F]/g) || []).length / text.length;
    if (alphaRatio > 0.7) confidence += 0.1;

    // Word count factor
    const wordCount = text.split(/\s+/).length;
    if (wordCount > 10) confidence += 0.1;

    return Math.min(confidence, 0.95);
  }

  /**
   * Detect language of extracted text
   */
  private detectLanguage(text: string): 'hi' | 'en' | 'mixed' {
    const hindiChars = (text.match(/[\u0900-\u097F]/g) || []).length;
    const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
    const totalChars = text.replace(/\s/g, '').length;

    if (totalChars === 0) return 'en';

    const hindiRatio = hindiChars / totalChars;
    const englishRatio = englishChars / totalChars;

    if (hindiRatio > 0.3 && englishRatio > 0.3) return 'mixed';
    if (hindiRatio > englishRatio) return 'hi';
    return 'en';
  }

  /**
   * Batch process multiple images
   */
  async batchExtractText(imagePaths: string[], options?: {
    language?: 'hi' | 'en' | 'mixed';
    useGPT4V?: boolean;
    preprocessing?: ImagePreprocessingOptions;
  }): Promise<OCRResult[]> {
    console.log(`[HindiOCR] Batch processing ${imagePaths.length} images`);

    const results: OCRResult[] = [];
    
    for (const imagePath of imagePaths) {
      try {
        const result = await this.extractTextFromImage({
          imagePath,
          ...options
        });
        results.push(result);
      } catch (error) {
        console.error(`[HindiOCR] Failed to process ${imagePath}:`, error);
        results.push({
          text: '',
          confidence: 0,
          method: 'tesseract',
          language: 'en',
          processingTime: 0
        });
      }
    }

    return results;
  }

  /**
   * Extract text from PDF pages (convert to images first)
   */
  async extractFromPDFPages(pdfPath: string, pageNumbers?: number[]): Promise<OCRResult[]> {
    // This would require pdf2pic or similar library
    // For now, return empty array
    console.log(`[HindiOCR] PDF extraction not implemented yet: ${pdfPath}`);
    return [];
  }

  /**
   * Get OCR statistics
   */
  getOCRStats(): {
    supportedLanguages: string[];
    methods: string[];
    maxImageSize: string;
  } {
    return {
      supportedLanguages: ['Hindi', 'English', 'Mixed'],
      methods: ['GPT-4V', 'Tesseract.js'],
      maxImageSize: '20MB'
    };
  }
}

export const hindiOCRService = new HindiOCRService();


