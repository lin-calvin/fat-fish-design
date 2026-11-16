/** 列表内联图标：只用 currentColor 描边，不引入图标依赖。 */

export function ArrowDownIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M8 3.25v9.5m0 0 3.1-3.1M8 12.75 4.9 9.65"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
