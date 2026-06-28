/** Size-bounded buffer; flushes via callback at maxSize. The recorder also flushes on an interval and on unload. */
export class GazeBatcher<T> {
  private buffer: T[] = [];
  constructor(
    private flushFn: (items: T[]) => void,
    private maxSize = 60,
  ) {}

  push(item: T): void {
    this.buffer.push(item);
    if (this.buffer.length >= this.maxSize) this.flush();
  }

  flush(): void {
    if (!this.buffer.length) return;
    const items = this.buffer;
    this.buffer = [];
    this.flushFn(items);
  }

  get size(): number {
    return this.buffer.length;
  }
}
