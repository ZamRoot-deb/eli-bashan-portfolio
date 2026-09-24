// TEMPORARY STUB (replaced by the constellation builder).
export interface ConstellationOptions {
  reducedMotion: boolean
  onDiscover?: (id: string, discovered: number, total: number) => void
  onComplete?: () => void
}
export function mountConstellation(_root: HTMLElement, _opts: ConstellationOptions): { destroy(): void } {
  return { destroy() {} }
}
