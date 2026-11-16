/** 合成一段“最坏形态”的回答：超长段落 + 超长代码围栏 + 大表格 */
export interface AnswerShape {
  paragraphChars: number
  fenceLines: number
  tableRows: number
  tailParagraphs: number
}

export const DEFAULT_SHAPE: AnswerShape = {
  paragraphChars: 3000,
  fenceLines: 1200,
  tableRows: 120,
  tailParagraphs: 24,
}

const SENTENCE = '增量解析只重算尾巴，冻结块的对象引用跨帧稳定，React 因此可以跳过它们。'

function longParagraph(chars: number): string {
  let out = ''
  while (out.length < chars) out += SENTENCE
  return out.slice(0, chars)
}

export function buildAnswer(shape: AnswerShape = DEFAULT_SHAPE): string {
  const parts: string[] = []

  parts.push('下面是**合成的最坏形态**回答：一个超长段落、一个超长代码围栏、一张大表格，用来压测每次更新的解析成本。')
  parts.push('')
  parts.push(longParagraph(shape.paragraphChars))
  parts.push('')
  parts.push('```ts')
  for (let i = 0; i < shape.fenceLines; i += 1) {
    parts.push(`const value${i} = compute(${i}, 'row-${i}') // 围栏第 ${i} 行`)
  }
  parts.push('```')
  parts.push('')
  parts.push('| 序号 | 名称 | 数值 | 说明 |')
  parts.push('| -: | :- | :-: | - |')
  for (let i = 0; i < shape.tableRows; i += 1) {
    parts.push(`| ${i} | item-${i} | ${i * 37} | 表格第 ${i} 行，用来测试尾块重算 |`)
  }
  parts.push('')
  for (let i = 0; i < shape.tailParagraphs; i += 1) {
    parts.push(`第 ${i} 段收尾：这一段是完整的块，追加文本不会改写它，因此可以冻结。`)
    parts.push('')
  }

  return parts.join('\n')
}

/** 模拟服务端 token 流：切块大小随机一点，贴近真实 */
export function tokenize(text: string, size = 4): string[] {
  const tokens: string[] = []
  for (let i = 0; i < text.length;) {
    const step = size + ((i * 7) % 3)
    tokens.push(text.slice(i, i + step))
    i += step
  }
  return tokens
}
