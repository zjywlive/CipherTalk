import * as fs from 'fs'
import * as path from 'path'

interface TemplateMonthDirectory {
  dirPath: string
  month: string
}

const TEMPLATE_MONTH_PATTERN = /(?:^|[\\/])(\d{4}-\d{2})(?:[\\/]|$)/
const TEMPLATE_MONTH_DIRECTORY_PATTERN = /^\d{4}-\d{2}$/

function collectTemplateFiles(rootDir: string, files: string[], maxFiles: number): void {
  const stack = [rootDir]
  while (stack.length && files.length < maxFiles) {
    const dir = stack.pop() as string
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      continue
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        stack.push(fullPath)
      } else if (entry.isFile() && entry.name.endsWith('_t.dat')) {
        files.push(fullPath)
        if (files.length >= maxFiles) break
      }
    }
  }
}

/**
 * Find recent WeChat image templates without depending on filesystem traversal order.
 *
 * Accounts can contain tens of thousands of `_t.dat` files. Stopping after the first
 * matches may select years-old ciphertext that cannot validate the key currently in
 * WeChat memory, so the whole tree is enumerated while only a bounded recent set is kept.
 */
export function findRecentTemplateDatFiles(rootDir: string, maxFiles = 64): string[] {
  if (maxFiles <= 0) return []

  const preferredRoot = path.join(rootDir, 'msg', 'attach')
  const searchRoot = fs.existsSync(preferredRoot) ? preferredRoot : rootDir
  const monthDirectories: TemplateMonthDirectory[] = []
  const ungroupedFiles: string[] = []
  const stack = [searchRoot]

  while (stack.length) {
    const dir = stack.pop() as string
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      continue
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (TEMPLATE_MONTH_DIRECTORY_PATTERN.test(entry.name)) {
          monthDirectories.push({ dirPath: fullPath, month: entry.name })
        } else {
          stack.push(fullPath)
        }
        continue
      }
      if (!entry.isFile() || !entry.name.endsWith('_t.dat')) continue
      ungroupedFiles.push(fullPath)
    }
  }

  monthDirectories.sort((a, b) => b.month.localeCompare(a.month))

  const files: string[] = []
  for (const directory of monthDirectories) {
    collectTemplateFiles(directory.dirPath, files, maxFiles)
    if (files.length >= maxFiles) break
  }

  if (files.length < maxFiles) {
    files.push(...ungroupedFiles.slice(0, maxFiles - files.length))
  }

  return files.sort((a, b) => {
    const monthA = a.match(TEMPLATE_MONTH_PATTERN)?.[1] ?? ''
    const monthB = b.match(TEMPLATE_MONTH_PATTERN)?.[1] ?? ''
    return monthB.localeCompare(monthA)
  })
}
