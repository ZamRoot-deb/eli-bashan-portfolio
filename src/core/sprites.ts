// Pixel sprites: string grids, one character per pixel, drawn crisp onto canvases.
// Sanko is the site's original mascot: a gold Sankofa-inspired bird ("go back and fetch it",
// the Akan idea of learning from what came before, which is also what forensics does) carrying an
// egg, with a red/gold/green tail and a black star on the chest.

export type Sprite = readonly string[]

/** Character to colour. '.' and ' ' are transparent. */
export const SPRITE_PALETTE: Record<string, string> = {
  k: '#0b0f14', // outline
  s: '#14141c', // pupil, star
  w: '#ffffff',
  y: '#ffd75f', // gold
  Y: '#ffeca9', // light gold
  o: '#e6a037', // gold shade
  O: '#ff8c3c', // beak, legs
  e: '#fff6de', // egg
  E: '#e2d0a5', // egg shade
  r: '#ff5a6e',
  g: '#4dff9e',
  G: '#2a9e66',
  c: '#45e6ff',
  m: '#ff4fd8',
  v: '#a78bff',
  b: '#6aa8ff',
  p: '#d9f2e4',
  d: '#3d6b55',
  n: '#1c2a33', // dark slate
}

export const SANKO: Record<"idle0" | "idle1" | "run0" | "run1" | "jump" | "hurt", Sprite> = {
  idle0: [
    '........................',
    '.....kk.......kkk.......',
    '....keek....kkyyykk.....',
    '...keeeek..kyyyyYYyk....',
    '...keeeek..kywwyyYyk....',
    '..keeeeeekkyywsyyyyyk...',
    '...keeeekOOOyyyyyyyyk...',
    '...keeeEkkOOyyyyyyyk....',
    '.kk.keEEkkkkyyyyyyyk....',
    'krrkkkkkkyyyyyyyyyyk....',
    '.krrrrkyyyyyyyyyyyyk....',
    'kYYrrryyyyyyyyyyyyyk....',
    'YYYYYyyyyyyyyyyyyyyyk...',
    'kkkgyyyyooooyyyyysyyyk..',
    '.kggyyyooYYooyysssssyk..',
    'kggkyyyyooooyyyysssyyk..',
    '.kk.kyyyyyyyyyyysysyk...',
    '.....kyyyyyyyyyyyyyk....',
    '......kyoyoyoyoyoyk.....',
    '.......kkoooooookk......',
    '.........kOkkkOk........',
    '..........O...O.........',
    '..........OOO.OOO.......',
    '........................',
  ],
  idle1: [
    '........................',
    '.....kk.......kkk.......',
    '....keek....kkyyykk.....',
    '...keeeek..kyyyyYYyk....',
    '...keeeek..kyyyyyYyk....',
    '..keeeeeekkyyssyyyyyk...',
    '...keeeekOOOyyyyyyyyk...',
    '...keeeEkkOOyyyyyyyk....',
    '.kk.keEEkkkkyyyyyyyk....',
    'krrkkkkkkyyyyyyyyyyk....',
    '.krrrrkyyyyyyyyyyyyk....',
    'kYYrrryyyyyyyyyyyyyk....',
    'YYYYYyyyyyyyyyyyyyyyk...',
    'kkkgyyyyooooyyyyysyyyk..',
    '.kggyyyooYYooyysssssyk..',
    'kggkyyyyooooyyyysssyyk..',
    '.kk.kyyyyyyyyyyysysyk...',
    '.....kyyyyyyyyyyyyyk....',
    '......kyoyoyoyoyoyk.....',
    '.......kkoooooookk......',
    '.........kOkkkOk........',
    '..........O...O.........',
    '..........OOO.OOO.......',
    '........................',
  ],
  run0: [
    '........................',
    '.....kk.......kkk.......',
    '....keek....kkyyykk.....',
    '...keeeek..kyyyyYYyk....',
    '...keeeek..kywwyyYyk....',
    '..keeeeeekkyywsyyyyyk...',
    '...keeeekOOOyyyyyyyyk...',
    '...keeeEkkOOyyyyyyyk....',
    '.kk.keEEkkkkyyyyyyyk....',
    'krrkkkkkkyyyyyyyyyyk....',
    '.krrrrkyyooyyyyyyyyk....',
    'kYYrrryyoYYoyyyyyyyk....',
    'YYYYYyyyoooooyyyyyyyk...',
    'kkkgyyyyyoooyyyyysyyyk..',
    '.kggyyyyyyyyyyysssssyk..',
    'kggkyyyyyyyyyyyysssyyk..',
    '.kk.kyyyyyyyyyyysysyk...',
    '.....kyyyyyyyyyyyyyk....',
    '......kyoyoyoyoyoyk.....',
    '.......kkoooooookk......',
    '.........kOkkkOk........',
    '...........O.O..........',
    '...........OOOO.........',
    '........................',
  ],
  run1: [
    '........................',
    '.....kk.......kkk.......',
    '....keek....kkyyykk.....',
    '...keeeek..kyyyyYYyk....',
    '...keeeek..kywwyyYyk....',
    '..keeeeeekkyywsyyyyyk...',
    '...keeeekOOOyyyyyyyyk...',
    '...keeeEkkOOyyyyyyyk....',
    '.kk.keEEkkkkyyyyyyyk....',
    'krrkkkkkkyyyyyyyyyyk....',
    '.krrrrkyyyyyyyyyyyyk....',
    'kYYrrryyyyyyyyyyyyyk....',
    'YYYYYyyyyyyyyyyyyyyyk...',
    'kkkgyyyyooooyyyyysyyyk..',
    '.kggyyyooYYooyysssssyk..',
    'kggkyyyyooooyyyysssyyk..',
    '.kk.kyyyyyyyyyyysysyk...',
    '.....kyyyyyyyyyyyyyk....',
    '......kyoyoyoyoyoyk.....',
    '.......kkoooooookk......',
    '.........OkkkkkO........',
    '........O.......O.......',
    '.......OO.......OO......',
    '........................',
  ],
  jump: [
    '........................',
    '.....kk.......kkk.......',
    '....keek....kkyyykk.....',
    '...keeeek..kyyyyYYyk....',
    '...keeeek..kywwyyYyk....',
    '..keeeeeekkyywsyyyyyk...',
    '...keeeekOOOyyyyyyyyk...',
    '...keeeEkkOOyyyyyyyk....',
    '.kk.keEEkkkkyyyyyyyk....',
    'krrkkkkkkyyyyyyyyyyk....',
    '.krrrrkyyooyyyyyyyyk....',
    'kYYrrryyoYYoyyyyyyyk....',
    'YYYYYyyyoooooyyyyyyyk...',
    'kkkgyyyyyoooyyyyysyyyk..',
    '.kggyyyyyyyyyyysssssyk..',
    'kggkyyyyyyyyyyyysssyyk..',
    '.kk.kyyyyyyyyyyysysyk...',
    '.....kyyyyyyyyyyyyyk....',
    '......kyoyoyoyoyoyk.....',
    '.......kkoooooookk......',
    '.........OkkkkkO........',
    '........O.......O.......',
    '.......OO.......OO......',
    '........................',
  ],
  hurt: [
    '........................',
    '..............kkk.......',
    '............kkyyykk.....',
    '...........kyyyyYYyk....',
    '...........kyssyyYyk....',
    '.........kkyyssyyyyyk...',
    '........kOOOyyyyyyyyk...',
    '.........kOOyyyyyyyk....',
    '.kk......kkkyyyyyyyk....',
    'krrkkk.kkyyyyyyyyyyk....',
    '.krrrrkyyyyyyyyyyyyk....',
    'kYYrrryyyyyyyyyyyyyk....',
    'YYYYYyyyyyyyyyyyyyyyk...',
    'kkkgyyyyooooyyyyysyyyk..',
    '.kggyyyooYYooyysssssyk..',
    'kggkyyyyooooyyyysssyyk..',
    '.kk.kyyyyyyyyyyysysyk...',
    '.....kyyyyyyyyyyyyyk....',
    '......kyoyoyoyoyoyk.....',
    '.......kkoooooookk......',
    '.........kOkkkOk........',
    '..........O...O.........',
    '..........OOO.OOO.......',
    '........................',
  ],
}

/** Evidence floppy (collectible). 12x12. */
export const FLOPPY: Sprite = [
  'kkkkkkkkkkk.',
  'kbbkppppkbbk',
  'kbbkppppkbbk',
  'kbbkkkkkkbbk',
  'kbbbbbbbbbbk',
  'kbbbbbbbbbbk',
  'kbkkkkkkkkbk',
  'kbkppppppkbk',
  'kbkpddddpkbk',
  'kbkppppppkbk',
  'kbkpddddpkbk',
  'kkkkkkkkkkkk',
]

/** Malware bug (enemy). 12x10. */
export const BUG: Sprite = [
  '..k......k..',
  '...k....k...',
  '...kkkkkk...',
  '..kmmmmmmk..',
  'kkmwkmmwkmkk',
  '..kmmmmmmk..',
  'kkmmkkkkmmkk',
  '..kmmmmmmk..',
  '.k.kkkkkk.k.',
  'k..k....k..k',
]

const SPRITE_W = (s: Sprite): number => s[0].length
const SPRITE_H = (s: Sprite): number => s.length

const cache = new Map<string, HTMLCanvasElement>()

/** Pre-rendered canvas for a sprite at an integer scale (cached). flip mirrors horizontally. */
export function spriteCanvas(sprite: Sprite, scale = 1, flip = false): HTMLCanvasElement {
  const key = `${sprite.join('|')}@${scale}${flip ? 'f' : ''}`
  const hit = cache.get(key)
  if (hit) return hit
  const w = SPRITE_W(sprite)
  const h = SPRITE_H(sprite)
  const c = document.createElement('canvas')
  c.width = w * scale
  c.height = h * scale
  const ctx = c.getContext('2d')
  if (ctx) {
    for (let y = 0; y < h; y++) {
      const row = sprite[y]
      for (let x = 0; x < w; x++) {
        const col = SPRITE_PALETTE[row[x]]
        if (!col) continue
        ctx.fillStyle = col
        ctx.fillRect((flip ? w - 1 - x : x) * scale, y * scale, scale, scale)
      }
    }
  }
  cache.set(key, c)
  return c
}

/** Draw a sprite with its top-left corner at (x, y). Keeps pixels crisp. */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  sprite: Sprite,
  x: number,
  y: number,
  scale = 1,
  flip = false,
): void {
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(spriteCanvas(sprite, scale, flip), Math.round(x), Math.round(y))
}

/** PNG data URL for a sprite, for use in <img> tags. Returns '' when canvas is unavailable. */
export function spriteDataURL(sprite: Sprite, scale = 4, flip = false): string {
  try {
    return spriteCanvas(sprite, scale, flip).toDataURL('image/png')
  } catch {
    return ''
  }
}
