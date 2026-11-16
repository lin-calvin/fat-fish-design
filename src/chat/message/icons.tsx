import type { ReactNode, SVGProps } from 'react'

/** 组件内自带的 16px 线性图标，不引入图标依赖。 */
function Icon({ children, ...rest }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const CopyIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <rect x="5.6" y="5.6" width="8" height="8" rx="1.6" />
    <path d="M10.4 5.4V3.4a1.2 1.2 0 0 0-1.2-1.2H3.4a1.2 1.2 0 0 0-1.2 1.2v5.8a1.2 1.2 0 0 0 1.2 1.2h2" />
  </Icon>
)

export const CheckIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M2.8 8.4 6.2 11.8 13.2 4.4" />
  </Icon>
)

export const EditIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M11.3 2.5a1.4 1.4 0 0 1 2 2l-7.5 7.5-2.9.9.9-2.9z" />
    <path d="M9.9 3.9 12 6" />
  </Icon>
)

export const RefreshIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M13.2 8a5.2 5.2 0 1 1-1.9-4" />
    <path d="M13.4 2.4v3.4H10" />
  </Icon>
)

export const StopIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <rect x="4.4" y="4.4" width="7.2" height="7.2" rx="1.6" />
  </Icon>
)

export const ContinueIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M8 2.6v10" />
    <path d="M4 8.9 8 12.9l4-4" />
  </Icon>
)

export const ChevronLeftIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M9.8 3.4 5.2 8l4.6 4.6" />
  </Icon>
)

export const ChevronRightIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M6.2 3.4 10.8 8l-4.6 4.6" />
  </Icon>
)

export const ChevronDownIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M3.4 6 8 10.4 12.6 6" />
  </Icon>
)

export const WarningIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M8 2.5 14.2 13.3H1.8z" />
    <path d="M8 6.3v3.2" />
    <path d="M8 11.5h.01" />
  </Icon>
)

export const ToolIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M10.4 2.4a3.5 3.5 0 0 0-3 5.3L2.7 12.4a1.2 1.2 0 0 0 1.7 1.7l4.7-4.7a3.5 3.5 0 0 0 5-4.3l-2.1 2.1-1.9-1.9z" />
  </Icon>
)

export const FileIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M9 2.2H4.4a1.2 1.2 0 0 0-1.2 1.2v9.2a1.2 1.2 0 0 0 1.2 1.2h7.2a1.2 1.2 0 0 0 1.2-1.2V5.8z" />
    <path d="M9 2.2v3.6h3.8" />
  </Icon>
)

export const ImageIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <rect x="2.2" y="3.2" width="11.6" height="9.6" rx="1.6" />
    <circle cx="5.9" cy="6.5" r="1" />
    <path d="M2.6 11.5 6.1 8.4l2.3 2.2 2-1.8 3.2 2.8" />
  </Icon>
)

export const ThinkIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M8 2.2a4 4 0 0 0-2.4 7.2v1.5h4.8V9.4A4 4 0 0 0 8 2.2z" />
    <path d="M6.5 13.4h3" />
  </Icon>
)
