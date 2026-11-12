// Phone photos are huge. Shrink to a sensible size and bake in the EXIF rotation
// before uploading, so it is fast on mobile data and the right way up.
export async function shrink(file, max = 2000, quality = 0.9) {
  try {
    if (file.type === 'image/jpeg' && file.size < 1.5 * 1024 * 1024) return file
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height))
    const c = document.createElement('canvas')
    c.width = Math.round(bmp.width * k)
    c.height = Math.round(bmp.height * k)
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height)
    bmp.close?.()
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', quality))
    return blob ? new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' }) : file
  } catch {
    return file
  }
}
