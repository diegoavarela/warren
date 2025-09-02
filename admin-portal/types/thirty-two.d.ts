declare module 'thirty-two' {
  export function encode(input: Buffer): string;
  export function decode(input: string): Buffer;
}