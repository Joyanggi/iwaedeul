/**
 * 첫 화면 크기 (PLAN v1.21 SS0) — `dist/index.html`이 처음 여는 순간 읽는 파일을 모은다.
 * 센다: `<script type="module" src>` · `<link rel="modulepreload" href>` · `<link rel="stylesheet" href>`.
 * 안 센다: `nomodule` 스크립트, `rel="icon"`, `apple-touch-startup-image`, manifest 등 (처음 그리는 데 안 쓴다).
 */
const attr = (tag, name) => {
  const m = new RegExp(String.raw`\s${name}\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))`, 'i').exec(tag)
  return m ? (m[1] ?? m[2] ?? m[3]) : null
}
const hasFlag = (tag, name) => new RegExp(String.raw`\s${name}(?=[\s=>/])`, 'i').test(tag)

/** @param {string} html @returns {string[]} 중복 없이, 나온 순서대로 */
export function collectFirstLoad(html) {
  const out = []
  const add = (p) => {
    if (p && !out.includes(p)) out.push(p)
  }
  for (const m of html.matchAll(/<(script|link)\b[^>]*>/gi)) {
    const tag = m[0]
    if (m[1].toLowerCase() === 'script') {
      if (attr(tag, 'type')?.toLowerCase() === 'module' && !hasFlag(tag, 'nomodule')) add(attr(tag, 'src'))
    } else {
      const rels = (attr(tag, 'rel') ?? '').toLowerCase().split(/\s+/)
      if (rels.includes('modulepreload') || rels.includes('stylesheet')) add(attr(tag, 'href'))
    }
  }
  return out
}
