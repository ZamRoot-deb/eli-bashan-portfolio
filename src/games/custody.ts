// TEMPORARY STUB (replaced by the builder's game). Keeps the core buildable.
import type { GameModule } from './types'

const game: GameModule = {
  id: 'custody',
  title: 'custody',
  blurb: '',
  controls: 'SPACE',
  mount(host) {
    host.root.dataset.state = 'ready'
    const b = document.createElement('button')
    b.type = 'button'
    b.textContent = 'START'
    let t = 0
    b.onclick = () => {
      host.root.dataset.state = 'playing'
      t = window.setTimeout(() => {
        host.root.dataset.state = 'over'
        host.reportScore(10)
        host.awardXP(10, 'stub run')
      }, 800)
    }
    host.root.append(b)
    return { destroy: () => { window.clearTimeout(t); b.remove() } }
  },
}
export default game
