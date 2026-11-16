/** 侧栏内联图标：只用 currentColor 描边，不引入图标依赖。 */

export function NewChatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <rect
        x="2.75"
        y="2.75"
        width="10.5"
        height="10.5"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M8 5.6v4.8M5.6 8h4.8"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function PanelLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <rect
        x="2.25"
        y="3.25"
        width="11.5"
        height="9.5"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path d="M6.3 3.25v9.5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}

export function EllipsisIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <circle cx="3.6" cy="8" r="1.15" fill="currentColor" />
      <circle cx="8" cy="8" r="1.15" fill="currentColor" />
      <circle cx="12.4" cy="8" r="1.15" fill="currentColor" />
    </svg>
  )
}

export function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M3.25 12.75h2.2l7.05-7.05a1.4 1.4 0 0 0 0-1.98l-.22-.22a1.4 1.4 0 0 0-1.98 0L3.25 10.55z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M3.4 5h9.2M6.4 5V3.9c0-.45.35-.8.8-.8h1.6c.45 0 .8.35.8.8V5M4.9 5l.55 7.15c.04.5.46.85.96.85h3.18c.5 0 .92-.35.96-.85L11.1 5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
