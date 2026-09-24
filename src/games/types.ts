// Contract between the arcade host (src/games/arcade.ts) and each mini-game module.
// A game is a lazily imported module whose default export is a GameModule.

export type GameId = 'runner' | 'threathunt' | 'phish' | 'custody'

export type SfxName =
  | 'blip' // UI hover / cursor move
  | 'select' // button press, menu confirm
  | 'start' // game start jingle
  | 'jump'
  | 'coin' // pickup / correct answer
  | 'hit' // damage / wrong answer
  | 'whack' // successful hit on a target
  | 'powerup'
  | 'win' // game won / round cleared
  | 'lose' // game over
  | 'tick' // countdown tick
  | 'type' // terminal keystroke
  | 'levelup'
  | 'error'

/** Achievement ids a game may unlock. The host ignores ids it does not know. */
export type GameAchievement =
  | 'runner-300' // Evidence Runner: score 300+
  | 'runner-1000' // Evidence Runner: score 1000+
  | 'hunter-10' // Threat Hunt: quarantine 10+ threats in one round
  | 'hunter-clean' // Threat Hunt: finish a round without hitting a legit process
  | 'phish-perfect' // Phish or Legit: every card correct
  | 'custody-solved' // Chain of Custody: order solved
  | 'custody-fast' // Chain of Custody: solved with 50%+ of the time left

export interface GameHost {
  /** Mount point. The game renders inside it and sets `root.dataset.state` to 'ready' | 'playing' | 'over'. */
  root: HTMLElement
  /** Award XP; the host updates the HUD and shows a toast. Call once per finished run with the run's reward. */
  awardXP(amount: number, reason: string): void
  unlock(id: GameAchievement): void
  sfx(name: SfxName): void
  /** Update the score readout in the overlay header while playing. */
  setScore(score: number): void
  /** Report a finished run; the host persists the best score and returns true when it is a new best. */
  reportScore(score: number): boolean
  /** Best score from previous runs (0 when none or storage is unavailable). */
  best: number
  /** prefers-reduced-motion: no screen shake, no flashing, calmer particles; the game must stay playable. */
  reducedMotion: boolean
  /** Test / speed-run mode (URL has ?fast): timed rounds last at most ~8 s so automation can reach 'over'. */
  fast: boolean
  /** Ask the host to close the overlay (same as pressing Escape). */
  exit(): void
}

export interface GameInstance {
  /** Remove every listener, timer, animation frame and DOM node the game created. Called on close. */
  destroy(): void
  /** Optional: called when the tab is hidden or the overlay loses visibility. */
  pause?(): void
  resume?(): void
}

export interface GameModule {
  id: GameId
  title: string
  /** One line shown on the arcade cabinet. */
  blurb: string
  /** Controls hint shown on the cabinet and the start screen, e.g. "SPACE / TAP to jump". */
  controls: string
  mount(host: GameHost): GameInstance
}
