import { ChatDemoPage } from './ChatDemo'
import { PocPage } from '../bench/PocPage'
import { FullChat } from '../../examples/full'
import { MinimalChat } from '../../examples/minimal'

/** ?poc = markdown 基准；?example = 文档里的完整示例；?minimal = 最小示例 */
export function App() {
  const search = typeof location !== 'undefined' ? location.search : ''
  if (search.includes('poc')) return <PocPage />
  if (search.includes('example')) return <FullChat />
  if (search.includes('minimal')) return <MinimalChat />
  return <ChatDemoPage />
}
