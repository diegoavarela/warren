// Global types for serverless environment compatibility

declare global {
  var fileCache: Map<string, {
    buffer: Buffer;
    timestamp: number;
    filename: string;
  }> | undefined;
}

export {};