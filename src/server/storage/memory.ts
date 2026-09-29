import type { ObjectStorage, PutObjectInput } from "./types";

/** In-memory adapter for unit/integration tests. */
export class MemoryStorage implements ObjectStorage {
  readonly objects = new Map<string, PutObjectInput>();

  constructor(private readonly baseUrl = "https://media.test") {}

  async put(input: PutObjectInput): Promise<void> {
    this.objects.set(input.key, input);
  }

  async deleteMany(keys: readonly string[]): Promise<void> {
    for (const k of keys) this.objects.delete(k);
  }

  publicUrl(key: string): string {
    return `${this.baseUrl}/${key}`;
  }
}
