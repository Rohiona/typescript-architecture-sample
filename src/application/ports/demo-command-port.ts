export interface DemoCommandPort {
  advanceTime(minutes: 15 | 60): Promise<{ now: number }>;
  resetDemo(): Promise<{ ok: true }>;
}
