/**
 * 输入区座位示例：模型 / 权限 / 计划 / 活动指示。
 * 这些都属于 agent 场景，但组件不认识任何 agent 语义——选项与文案全在调用方。
 * 本文件随 `tsc --noEmit` 一起校验。
 */
import { useState } from 'react'
import { Composer } from '../src/chat/composer'
import { ActivityIndicator, PermissionSelect, PlanToggle } from '../src/chat/seats'
import { Select } from '../src/ui/atoms'
import { zh } from '../src/chat-protocol/labels.zh'
import { emptyComposerValue, type ComposerValue } from '../src/chat-protocol/types'

const MODELS = [
  { value: 'deepseek-flash', label: 'deepseek-flash' },
  { value: 'deepseek-v4-pro', label: 'deepseek-v4-pro' },
] as const

const PERMISSIONS = [
  { id: 'read', label: '只读' },
  { id: 'workspace', label: '工作区可写' },
  { id: 'full', label: '完全访问' },
] as const

export function AgentSeatsComposer() {
  const [value, setValue] = useState<ComposerValue>(emptyComposerValue)
  const [model, setModel] = useState<string>('deepseek-flash')
  const [permission, setPermission] = useState<string>('workspace')
  const [plan, setPlan] = useState(false)
  const [status, setStatus] = useState<'idle' | 'streaming'>('idle')

  return (
    <Composer
      value={value}
      onChange={setValue}
      onSubmit={() => setStatus('streaming')}
      onStop={() => setStatus('idle')}
      status={status}
      labels={zh.composer}
      slots={{
        model: (
          <Select
            label="模型"
            size="sm"
            value={model}
            options={MODELS}
            onChange={setModel}
          />
        ),
        permission: (
          <PermissionSelect
            label="权限模式"
            value={permission}
            options={PERMISSIONS}
            onChange={setPermission}
          />
        ),
        plan: <PlanToggle label="计划模式" active={plan} onToggle={setPlan} />,
        activity: (
          <ActivityIndicator
            status={status === 'streaming' ? 'running' : 'idle'}
            label={status === 'streaming' ? '生成中' : undefined}
          />
        ),
        dock: <div style={{ fontSize: 12, opacity: 0.6 }}>输入区下方的 dock 座位</div>,
      }}
    />
  )
}
