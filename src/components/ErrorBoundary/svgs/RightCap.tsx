
export function RightCap () {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 60 42"
      width="60"
      height="42"
      preserveAspectRatio="none"
      style={{
        position: "absolute",
        top: '-1px',
        right: '20%',
        transform: "scaleX(-1)",
      }}
    >
      <rect width="60" height="42" fill="black" />
      
      <path
        d="M1.5 0.5 L10.5 0.5 C18.5 0.5 23.5 4 26 11 L35 30 C38 36 45 41 53 41 H60 H1 L1 0 Z"
        fill="black"
      />

      <path
        d="M1.5 0.5 L10.5 0.5 C18.5 0.5 23.5 4 26 11 L35 30 C38 36 45 41 53 41 H60"
        fill="none"
        stroke="#262626"
        strokeWidth="1"
        shapeRendering="crispEdges"
      />

      <rect
        x={-2}        
        y={0}           
        width={10}
        height={1}
        fill="#262626"
        shapeRendering="crispEdges"
      />
    </svg>
  )
}