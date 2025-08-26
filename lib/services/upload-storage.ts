// Temporary upload storage service
// This service stores uploaded files temporarily in memory during the upload/mapping process
// Files are automatically cleaned up after 15 minutes

interface UploadRecord {
  id: string;
  uploadSession: string;
  fileName: string;
  fileSize: number;
  sheets: string[];
  createdAt: Date;
  fileBuffer: ArrayBuffer;
}

class UploadStorageService {
  private uploads: Map<string, UploadRecord> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly TTL = 15 * 60 * 1000; // 15 minutes

  constructor() {
    // Start cleanup interval
    if (typeof window === 'undefined') {
      this.startCleanupInterval();
    }
  }

  private startCleanupInterval() {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000); // Run cleanup every minute
  }

  private cleanup() {
    const now = Date.now();
    const expiredSessions: string[] = [];

    this.uploads.forEach((upload, session) => {
      if (now - upload.createdAt.getTime() > this.TTL) {
        expiredSessions.push(session);
      }
    });

    expiredSessions.forEach(session => {
      this.uploads.delete(session);
    });
  }

  addUpload(record: UploadRecord): void {
    this.uploads.set(record.uploadSession, record);
  }

  getUpload(uploadSession: string): UploadRecord | undefined {
    return this.uploads.get(uploadSession);
  }

  removeUpload(uploadSession: string): void {
    this.uploads.delete(uploadSession);
  }

  getAllUploads(): UploadRecord[] {
    return Array.from(this.uploads.values());
  }

  clear(): void {
    this.uploads.clear();
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

// Create singleton instance
const uploadStorage = new UploadStorageService();

// Export functions for temporary upload storage
export function addUpload(record: UploadRecord): void {
  uploadStorage.addUpload(record);
}

export function getUploadBySession(uploadSession: string): UploadRecord | undefined {
  return uploadStorage.getUpload(uploadSession);
}

export function removeUpload(uploadSession: string): void {
  uploadStorage.removeUpload(uploadSession);
}

export function getAllUploads(): UploadRecord[] {
  return uploadStorage.getAllUploads();
}

export default uploadStorage;