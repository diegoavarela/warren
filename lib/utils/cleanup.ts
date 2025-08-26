import { readdir, stat, unlink } from 'fs/promises';
import path from 'path';

/**
 * Clean up old temporary upload files
 * @param maxAgeMinutes - Maximum age in minutes for files to be kept
 */
export async function cleanupOldUploads(maxAgeMinutes: number = 60): Promise<void> {
  try {
    const uploadDir = path.join(process.cwd(), 'tmp', 'uploads');
    const files = await readdir(uploadDir);
    const now = Date.now();
    const maxAge = maxAgeMinutes * 60 * 1000; // Convert to milliseconds
    
    for (const file of files) {
      if (file.endsWith('.xlsx')) {
        const filePath = path.join(uploadDir, file);
        const stats = await stat(filePath);
        
        // Check if file is older than maxAge
        if (now - stats.mtime.getTime() > maxAge) {
          await unlink(filePath);
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up old uploads:', error);
  }
}

/**
 * Initialize cleanup interval
 */
export function initializeCleanupInterval(): void {
  // Clean up old files every 30 minutes
  setInterval(() => {
    cleanupOldUploads(60); // Delete files older than 60 minutes
  }, 30 * 60 * 1000); // Run every 30 minutes
}