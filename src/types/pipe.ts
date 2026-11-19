/** Bearers only — overlays use `OverlayPipe`. */
export type BearerPipe = 'thin' | 'fat' | 'both'

export type OverlayPipe = 'none'

export type PipeFit = BearerPipe | OverlayPipe

export function isBearerPipe(pipe: PipeFit): pipe is BearerPipe {
  return pipe !== 'none'
}

export function isOverlayPipe(pipe: PipeFit): pipe is OverlayPipe {
  return pipe === 'none'
}