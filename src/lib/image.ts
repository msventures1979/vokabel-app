// Foto der Belohnung vorbereiten: verkleinern, auf Wunsch weißen Hintergrund entfernen, als kleine Data-URL speichern.

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

// Weißen Hintergrund vom Bildrand aus transparent machen (typische Produktfotos)
function removeWhiteBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data
  const isWhite = (i: number) => d[i] > 232 && d[i + 1] > 232 && d[i + 2] > 232
  const seen = new Uint8Array(w * h)
  const stack: number[] = []
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x)
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1)
  while (stack.length) {
    const p = stack.pop()!
    if (seen[p]) continue
    seen[p] = 1
    if (!isWhite(p * 4)) continue
    d[p * 4 + 3] = 0
    const x = p % w
    const y = (p - x) / w
    if (x > 0) stack.push(p - 1)
    if (x < w - 1) stack.push(p + 1)
    if (y > 0) stack.push(p - w)
    if (y < h - 1) stack.push(p + w)
  }
  // Kanten weich machen: halbtransparent, wo ein Nachbar entfernt wurde
  for (let p = 0; p < w * h; p++) {
    if (d[p * 4 + 3] === 0) continue
    const x = p % w
    const n = [p - 1, p + 1, p - w, p + w].filter((q) => q >= 0 && q < w * h && Math.abs((q % w) - x) <= 1)
    if (n.some((q) => d[q * 4 + 3] === 0)) d[p * 4 + 3] = 170
  }
  ctx.putImageData(img, 0, 0)
}

export async function prizeImage(file: File, removeBackground: boolean, max = 512): Promise<string> {
  const img = await loadImage(await readFile(file))
  const scale = Math.min(1, max / Math.max(img.width, img.height))
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0, w, h)
  if (removeBackground) removeWhiteBackground(ctx, w, h)
  // WebP behält Transparenz und ist klein; ältere Browser liefern sonst PNG
  let url = canvas.toDataURL('image/webp', 0.82)
  if (!url.startsWith('data:image/webp')) url = canvas.toDataURL('image/png')
  if (url.length > 380_000) url = canvas.toDataURL('image/jpeg', 0.8)
  return url
}
