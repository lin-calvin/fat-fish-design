/**
 * 输入区自用的 16px 线性图标。
 * 全部使用 currentColor，颜色由所在按钮的 token 决定，图标里不写颜色。
 */

const Frame = ({ children }: { children: React.ReactNode }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden
    focusable="false"
  >
    {children}
  </svg>
)

export const IconSend = () => (
  <Frame>
    <path
      d="M8 13V3m0 0L4 6.9M8 3l4 3.9"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Frame>
)

export const IconStop = () => (
  <Frame>
    <rect x="4" y="4" width="8" height="8" rx="2" fill="currentColor" />
  </Frame>
)

export const IconMic = () => (
  <Frame>
    <rect
      x="6"
      y="1.75"
      width="4"
      height="7.5"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.4"
    />
    <path
      d="M3.75 7.25a4.25 4.25 0 0 0 8.5 0M8 11.5V14"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </Frame>
)

export const IconPaperclip = () => (
  <Frame>
    <path
      d="M12.4 7.3l-4.6 4.6a2.55 2.55 0 0 1-3.6-3.6l4.9-4.9a1.7 1.7 0 0 1 2.4 2.4l-4.9 4.9a.85.85 0 0 1-1.2-1.2l4.4-4.4"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Frame>
)

export const IconClose = () => (
  <Frame>
    <path
      d="M4.5 4.5l7 7m0-7l-7 7"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </Frame>
)

export const IconRetry = () => (
  <Frame>
    <path
      d="M13 8a5 5 0 1 1-1.9-3.9"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
    <path
      d="M13 2.6V5.2h-2.6"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Frame>
)

export const IconFile = () => (
  <Frame>
    <path
      d="M9 1.8H5.6c-.9 0-1.4 0-1.75.18a1.6 1.6 0 0 0-.7.7c-.18.35-.18.85-.18 1.75v7.14c0 .9 0 1.4.18 1.75.15.3.4.55.7.7.35.18.85.18 1.75.18h4.8c.9 0 1.4 0 1.75-.18.3-.15.55-.4.7-.7.18-.35.18-.85.18-1.75V5.3L9 1.8Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
    <path d="M9 1.9v3.4h3.4" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
  </Frame>
)

export const IconThink = () => (
  <Frame>
    <path
      d="M8 1.9a4.3 4.3 0 0 0-2.6 7.72c.3.22.43.5.43.78v.72h4.34v-.72c0-.28.13-.56.43-.78A4.3 4.3 0 0 0 8 1.9Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
    <path
      d="M6.4 13.2h3.2M6.9 14.4h2.2"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  </Frame>
)

export const IconSearch = () => (
  <Frame>
    <circle cx="8" cy="8" r="5.6" stroke="currentColor" strokeWidth="1.3" />
    <path
      d="M1.9 8h12.2M8 2.4c1.5 1.6 2.2 3.5 2.2 5.6S9.5 12 8 13.6C6.5 12 5.8 10.1 5.8 8S6.5 4 8 2.4Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
  </Frame>
)
