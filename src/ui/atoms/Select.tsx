import clsx from 'clsx'
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { overlayContainer, useFloating, useOutsideDismiss } from './internal/anchored'
import styles from './Select.module.css'

export type SelectOption<T extends string> = { value: T; label: string }

export type SelectProps<T extends string> = {
  value: T
  options: readonly SelectOption<T>[]
  onChange: (next: T) => void
  /** 触发按钮与列表框的无障碍名称 */
  label: string
  placeholder?: string
  /** 触发器尺寸：md = 36px（表单默认），sm = 28px（塞进输入区工具条） */
  size?: 'sm' | 'md'
}

const ChevronIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
    <path
      d="M4 6l4 4 4-4"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const CheckIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
    <path
      d="M3 8.5l3.4 3.4L13 5"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

/**
 * 单选下拉。触发器是原生 button，列表挂在 body（或最上层 dialog）上按 rect 定位。
 * 键盘：↑/↓ 移动、Home/End 到首尾、Enter/Space 选中、Esc 关闭并回到触发器、Tab 关闭。
 */
export const Select = <T extends string>({
  value,
  options,
  onChange,
  label,
  placeholder,
  size = 'md',
}: SelectProps<T>) => {
  const [open, setOpen] = useState(false)
  const listId = useId()
  const { anchorRef, floatingRef, style } = useFloating<HTMLButtonElement, HTMLDivElement>(open, {
    side: 'bottom',
    align: 'start',
    offset: 4,
    matchWidth: true,
    maxHeight: 320,
  })
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const current = options.find(option => option.value === value)

  useOutsideDismiss(open, [anchorRef, floatingRef], () => setOpen(false))

  const close = (restoreFocus: boolean) => {
    setOpen(false)
    if (restoreFocus) {
      anchorRef.current?.focus()
    }
  }

  // 打开时把焦点放到当前项（没有就第一项）
  useEffect(() => {
    if (!open) {
      return
    }
    const index = options.findIndex(option => option.value === value)
    const target = optionRefs.current[index] ?? optionRefs.current[0]
    target?.focus()
  }, [open])

  const enabledOptions = () => optionRefs.current.filter(Boolean) as HTMLButtonElement[]

  const step = (delta: 1 | -1) => {
    const list = enabledOptions()
    if (list.length === 0) {
      return
    }
    const active = list.indexOf(document.activeElement as HTMLButtonElement)
    const next =
      active === -1
        ? delta === 1
          ? 0
          : list.length - 1
        : (active + delta + list.length) % list.length
    list[next]?.focus()
  }

  const choose = (next: T) => {
    close(true)
    onChange(next)
  }

  const onListKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        step(1)
        break
      case 'ArrowUp':
        event.preventDefault()
        step(-1)
        break
      case 'Home': {
        event.preventDefault()
        enabledOptions()[0]?.focus()
        break
      }
      case 'End': {
        event.preventDefault()
        const list = enabledOptions()
        list[list.length - 1]?.focus()
        break
      }
      case 'Escape':
        event.preventDefault()
        event.stopPropagation()
        close(true)
        break
      case 'Tab':
        // 不拦截 Tab：焦点先回到触发器，默认行为继续往后走
        close(true)
        break
      default:
        break
    }
  }

  const onTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (open || (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')) {
      return
    }
    event.preventDefault()
    setOpen(true)
  }

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className={clsx(styles.trigger, size === 'sm' && styles.sm)}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? close(true) : setOpen(true))}
        onKeyDown={onTriggerKeyDown}
      >
        {current ? (
          <span className={styles.value}>{current.label}</span>
        ) : (
          <span className={clsx(styles.value, styles.placeholder)}>{placeholder}</span>
        )}
        <span className={styles.chevron}>
          <ChevronIcon />
        </span>
      </button>
      {open
        ? createPortal(
            <div
              ref={floatingRef}
              id={listId}
              role="listbox"
              aria-label={label}
              data-atom-overlay="listbox"
              className={styles.listbox}
              style={style}
              onKeyDown={onListKeyDown}
            >
              {options.map((option, index) => {
                const selected = option.value === value
                return (
                  <button
                    key={option.value}
                    ref={element => {
                      optionRefs.current[index] = element
                    }}
                    type="button"
                    role="option"
                    tabIndex={-1}
                    aria-selected={selected}
                    className={styles.option}
                    onClick={() => choose(option.value)}
                    onPointerEnter={event => event.currentTarget.focus()}
                  >
                    <span className={styles.optionLabel}>{option.label}</span>
                    {selected ? (
                      <span className={styles.check}>
                        <CheckIcon />
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>,
            overlayContainer()
          )
        : null}
    </>
  )
}
