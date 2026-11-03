// Crops a screenshot to the drawn content (its dark strokes and text) plus a margin and pads it
// to 16:9 in the canvas colour, so every render fills the same frame on the landing page.
/* global Buffer, document, Image */
const darkestBackground = 170
const edge = 16
const padding = 96
const frameRatio = 16 / 9

export async function cropToContent(page, png) {
  const dataUrl = await page.evaluate(
    async ({ base64, darkestBackground, edge, padding, frameRatio }) => {
      const image = new Image()
      image.src = `data:image/png;base64,${base64}`
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const context = canvas.getContext('2d')
      context.drawImage(image, 0, 0)
      const { data } = context.getImageData(0, 0, image.width, image.height)
      let top = image.height
      let left = image.width
      let bottom = 0
      let right = 0
      for (let y = edge; y < image.height - edge; y++) {
        for (let x = edge; x < image.width - edge; x++) {
          const i = (y * image.width + x) * 4
          const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
          if (luminance < darkestBackground) {
            top = Math.min(top, y)
            left = Math.min(left, x)
            bottom = Math.max(bottom, y)
            right = Math.max(right, x)
          }
        }
      }
      const x = Math.max(0, left - padding)
      const y = Math.max(0, top - padding)
      const width = Math.min(image.width, right + padding) - x
      const height = Math.min(image.height, bottom + padding) - y
      const frameWidth = Math.round(Math.max(width, height * frameRatio))
      const frameHeight = Math.round(frameWidth / frameRatio)
      const corner = (y * image.width + x) * 4
      const framed = document.createElement('canvas')
      framed.width = frameWidth
      framed.height = frameHeight
      const frame = framed.getContext('2d')
      frame.fillStyle = `rgb(${data[corner]}, ${data[corner + 1]}, ${data[corner + 2]})`
      frame.fillRect(0, 0, frameWidth, frameHeight)
      frame.drawImage(
        canvas,
        x,
        y,
        width,
        height,
        Math.round((frameWidth - width) / 2),
        Math.round((frameHeight - height) / 2),
        width,
        height,
      )
      return framed.toDataURL('image/png')
    },
    { base64: png.toString('base64'), darkestBackground, edge, padding, frameRatio },
  )
  return Buffer.from(dataUrl.split(',')[1], 'base64')
}
