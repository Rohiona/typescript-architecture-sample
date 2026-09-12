export interface DemoStateCommandPort {
  advanceMinutes(minutes: number): number;
  reset(): void;
}
