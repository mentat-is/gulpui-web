export namespace Images {
  export function LeftCap() {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 60 42"
        width="60"
        height="42"
        preserveAspectRatio="none"
        style={{
          position: "absolute",
          top: "-1px",
          left: "10%",
          zIndex: 1,
          pointerEvents: "none"
        }}
      >
        <defs>
          <clipPath id="clipCurve">
            <path
              d="M1.5 0.5 L10.5 0.5 C18.5 0.5 23.5 4 26 11 L35 30 C38 36 45 41 53 41 H60 V0 H0 Z"
            />
          </clipPath>
        </defs>
        <rect
          width="60"
          height="42"
          fill="var(--background-200)"
          clipPath="url(#clipCurve)"
        />
        <path
          d="M1.5 0.5 L10.5 0.5 C18.5 0.5 23.5 4 26 11 L35 30 C38 36 45 41 53 41 H60"
          fill="none"
          stroke="var(--gray-400)"
          strokeWidth="1"
          shapeRendering="crispEdges"
        />
        <rect
          x={-2}
          y={0}
          width={10}
          height={1}
          fill="var(--gray-400)"
          shapeRendering="crispEdges"
        />
      </svg>
    );
  }

  export function MiddleLine() {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 42"
        preserveAspectRatio="none"
        style={{
          position: "absolute",
          zIndex: 1,
          top: '-1px',
          left: "calc(10% + 55px)",
          width: 'calc(100% - 30% - 110px)',
          height: "42px",
        }}
      >
        <rect width="100%" height="100%" fill="var(--background-200)" />
        <rect width="100%" height="100%" fill="var(--background-200)" />
        <line
          x1="0"
          y1="41"
          x2="100"
          y2="41"
          stroke="var(--gray-400)"
          strokeWidth="1"
        />
      </svg>
    )
  }

  export function RightCap() {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 60 42"
        width="60"
        height="42"
        preserveAspectRatio="none"
        style={{
          position: "absolute",
          top: "-1px",
          right: "20%",
          transform: "scaleX(-1)",
          zIndex: 1,
          pointerEvents: "none"
        }}
      >
        <defs>
          <clipPath id="clipCurveRight">
            <path d="M1.5 0.5 L10.5 0.5 C18.5 0.5 23.5 4 26 11 L35 30 C38 36 45 41 53 41 H60 V0 H0 Z" />
          </clipPath>
        </defs>
        <rect width="60" height="42" fill="var(--background-200)" clipPath="url(#clipCurveRight)" />
        <path
          d="M1.5 0.5 L10.5 0.5 C18.5 0.5 23.5 4 26 11 L35 30 C38 36 45 41 53 41 H60"
          fill="none"
          stroke="var(--gray-400)"
          strokeWidth="1"
          shapeRendering="crispEdges"
        />
        <rect x={-2} y={0} width={10} height={1} fill="var(--gray-400)" shapeRendering="crispEdges" />
      </svg>
    );
  }
}
