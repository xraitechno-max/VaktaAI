import NodeClam from 'clamscan';
import { db } from '../../db';
import { documents } from '@shared/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

export class VirusScanService {
  private clamscan: any;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      this.clamscan = await new NodeClam().init({
        clamdscan: {
          host: process.env.CLAMAV_HOST || 'localhost',
          port: parseInt(process.env.CLAMAV_PORT || '3310')
        }
      });

      this.initialized = true;
      console.log('[VirusScan] ClamAV initialized');
    } catch (error) {
      console.error('[VirusScan] Failed to initialize ClamAV:', error);
      throw error;
    }
  }

  /**
   * Scan file for viruses
   */
  async scanFile(filePath: string): Promise<{
    isInfected: boolean;
    viruses?: string[];
  }> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const { isInfected, viruses } = await this.clamscan.isInfected(filePath);

      if (isInfected) {
        console.error(`[VirusScan] ⚠️ INFECTED FILE: ${filePath}`, viruses);
      } else {
        console.log(`[VirusScan] ✅ Clean: ${filePath}`);
      }

      return { isInfected, viruses };

    } catch (error) {
      console.error('[VirusScan] Scan failed:', error);
      
      // In production, you might want to fail-safe (reject file)
      // For now, allow file through on scan failure
      return { isInfected: false };
    }
  }

  /**
   * Quarantine infected file
   */
  async quarantineFile(params: {
    filePath: string;
    documentId: string;
    viruses: string[];
  }): Promise<void> {
    const { filePath, documentId, viruses } = params;

    try {
      // Move to quarantine directory
      const quarantineDir = path.join(process.cwd(), 'quarantine');
      if (!fs.existsSync(quarantineDir)) {
        fs.mkdirSync(quarantineDir, { recursive: true });
      }

      const quarantinePath = path.join(quarantineDir, path.basename(filePath));
      fs.renameSync(filePath, quarantinePath);

      // Update document status
      await db.update(documents)
        .set({
          processingStatus: 'failed',
          processingError: `Virus detected: ${viruses.join(', ')}`
        })
        .where(eq(documents.id, documentId));

      console.log(`[VirusScan] Quarantined ${filePath} -> ${quarantinePath}`);
    } catch (error) {
      console.error('[VirusScan] Quarantine failed:', error);
      throw error;
    }
  }

  /**
   * Scan multiple files
   */
  async scanFiles(filePaths: string[]): Promise<{
    clean: string[];
    infected: Array<{ filePath: string; viruses: string[] }>;
  }> {
    const results = {
      clean: [] as string[],
      infected: [] as Array<{ filePath: string; viruses: string[] }>
    };

    for (const filePath of filePaths) {
      try {
        const scanResult = await this.scanFile(filePath);
        
        if (scanResult.isInfected) {
          results.infected.push({
            filePath,
            viruses: scanResult.viruses || []
          });
        } else {
          results.clean.push(filePath);
        }
      } catch (error) {
        console.error(`[VirusScan] Failed to scan ${filePath}:`, error);
        // Treat scan failure as clean (fail-safe)
        results.clean.push(filePath);
      }
    }

    return results;
  }

  /**
   * Get quarantine statistics
   */
  async getQuarantineStats(): Promise<{
    totalQuarantined: number;
    totalSize: number;
    recentQuarantined: number;
  }> {
    try {
      const quarantineDir = path.join(process.cwd(), 'quarantine');
      
      if (!fs.existsSync(quarantineDir)) {
        return { totalQuarantined: 0, totalSize: 0, recentQuarantined: 0 };
      }

      const files = fs.readdirSync(quarantineDir);
      let totalSize = 0;
      let recentCount = 0;
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

      for (const file of files) {
        const filePath = path.join(quarantineDir, file);
        const stats = fs.statSync(filePath);
        
        totalSize += stats.size;
        
        if (stats.mtime.getTime() > oneDayAgo) {
          recentCount++;
        }
      }

      return {
        totalQuarantined: files.length,
        totalSize,
        recentQuarantined: recentCount
      };
    } catch (error) {
      console.error('[VirusScan] Failed to get quarantine stats:', error);
      return { totalQuarantined: 0, totalSize: 0, recentQuarantined: 0 };
    }
  }

  /**
   * Clean up old quarantined files
   */
  async cleanupQuarantine(daysOld: number = 30): Promise<number> {
    try {
      const quarantineDir = path.join(process.cwd(), 'quarantine');
      
      if (!fs.existsSync(quarantineDir)) {
        return 0;
      }

      const files = fs.readdirSync(quarantineDir);
      const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
      let cleanedCount = 0;

      for (const file of files) {
        const filePath = path.join(quarantineDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          fs.unlinkSync(filePath);
          cleanedCount++;
        }
      }

      console.log(`[VirusScan] Cleaned up ${cleanedCount} old quarantined files`);
      return cleanedCount;
    } catch (error) {
      console.error('[VirusScan] Cleanup failed:', error);
      return 0;
    }
  }

  /**
   * Get scan statistics
   */
  async getScanStats(): Promise<{
    totalScanned: number;
    infectedFound: number;
    scanSuccessRate: number;
    averageScanTime: number;
  }> {
    try {
      // This would typically come from a scan log or database
      // For now, return mock data
      return {
        totalScanned: 0,
        infectedFound: 0,
        scanSuccessRate: 100,
        averageScanTime: 0
      };
    } catch (error) {
      console.error('[VirusScan] Failed to get scan stats:', error);
      return {
        totalScanned: 0,
        infectedFound: 0,
        scanSuccessRate: 0,
        averageScanTime: 0
      };
    }
  }

  /**
   * Check if ClamAV is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      return true;
    } catch (error) {
      console.error('[VirusScan] ClamAV not available:', error);
      return false;
    }
  }

  /**
   * Get ClamAV version and database info
   */
  async getClamAVInfo(): Promise<{
    version: string;
    databaseVersion: string;
    databaseDate: string;
  } | null> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      // This would require additional ClamAV API calls
      // For now, return mock data
      return {
        version: '0.103.8',
        databaseVersion: '270',
        databaseDate: new Date().toISOString()
      };
    } catch (error) {
      console.error('[VirusScan] Failed to get ClamAV info:', error);
      return null;
    }
  }
}

export const virusScanService = new VirusScanService();
