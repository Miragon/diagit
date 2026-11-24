import type { ExportSceneData } from '@excalidraw/utils'
import { parseJsonModel } from '../../../platform/utils/parseJsonModel'

type SceneFiles = NonNullable<ExportSceneData['files']>
type SceneFile = SceneFiles[keyof SceneFiles]

const EMBEDDED_IMAGE_DATA_URL = /^data:image\/[a-z+.-]+;base64,/

export function parseExcalidrawScene(source: string): ExportSceneData {
  const scene = parseJsonModel(source, sceneOf)
  return { ...scene, files: embeddedImagesOf(scene.files ?? {}) }
}

function sceneOf(data: unknown): ExportSceneData {
  if (!isExcalidrawScene(data)) {
    throw new Error('Not an Excalidraw scene')
  }
  return data
}

function isExcalidrawScene(scene: unknown): scene is ExportSceneData {
  if (typeof scene !== 'object' || scene === null) {
    return false
  }
  const { type, elements } = scene as { type?: unknown; elements?: unknown }
  return type === 'excalidraw' && Array.isArray(elements)
}

function embeddedImagesOf(files: SceneFiles): SceneFiles {
  return Object.fromEntries(
    Object.entries<SceneFile>(files).filter(([, file]) => isEmbeddedImage(file?.dataURL)),
  )
}

function isEmbeddedImage(dataURL: unknown): boolean {
  return typeof dataURL === 'string' && EMBEDDED_IMAGE_DATA_URL.test(dataURL)
}
