import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { findRecentTemplateDatFiles } from '../electron/services/imageTemplateFinder.ts'

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ciphertalk-image-templates-'))

try {
  const createTemplates = (month: string, count: number) => {
    const branch = month === '2026-08' ? 'z-new' : 'a-old'
    const dir = path.join(root, 'msg', 'attach', branch, month, 'Img')
    fs.mkdirSync(dir, { recursive: true })
    for (let index = 0; index < count; index += 1) {
      fs.writeFileSync(path.join(dir, `${index}_t.dat`), Buffer.from([0x07, 0x08, 0x56, 0x32]))
    }
  }

  createTemplates('2023-05', 40)
  createTemplates('2026-08', 20)

  const selected = findRecentTemplateDatFiles(root, 16)
  assert.equal(selected.length, 16)
  assert.ok(
    selected.every(file => file.includes(`${path.sep}2026-08${path.sep}`)),
    'selection must prefer recent templates even when older files are encountered first',
  )

  console.log('image template finder: ok')
} finally {
  fs.rmSync(root, { recursive: true, force: true })
}
