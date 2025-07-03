// Mock database for development
// In production, this would be replaced with actual database queries

interface MockUpload {
  id: string;
  uploadSession: string;
  fileName: string;
  fileSize: number;
  sheets: string[];
  createdAt: Date;
  fileBuffer?: ArrayBuffer;
}

interface MockDatabase {
  uploads: MockUpload[];
}

// Singleton instance
let mockDb: MockDatabase | null = null;

export function getMockDatabase(): MockDatabase {
  if (!mockDb) {
    mockDb = {
      uploads: []
    };
  }
  return mockDb;
}

export function addUpload(upload: MockUpload) {
  const db = getMockDatabase();
  db.uploads.push(upload);
}

export function getUpload(uploadSession: string): MockUpload | undefined {
  const db = getMockDatabase();
  return db.uploads.find(u => u.uploadSession === uploadSession);
}

export function clearDatabase() {
  mockDb = null;
}