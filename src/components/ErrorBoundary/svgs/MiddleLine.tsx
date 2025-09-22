
export function MiddleLine () {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 42"
      preserveAspectRatio="none"
      style={{
        position: "absolute",
        zIndex: 1000,
        top: '-1px',
        left: "calc(10% + 55px)",
        width: 'calc(100% - 30% - 110px)',
        height: "42px",
      }}
    >
      <rect width="100%" height="100%" fill="black" />
      <rect width="100%" height="100%" fill="black" />
        <line
        x1="0"
        y1="41"
        x2="100"
        y2="41"
        stroke="#262626"
        strokeWidth="1"
      />
    </svg>
  )
}