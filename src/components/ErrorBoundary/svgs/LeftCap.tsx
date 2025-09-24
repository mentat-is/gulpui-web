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
        fill="black"
        clipPath="url(#clipCurve)"
      />

      <path
        d="M1.5 0.5 L10.5 0.5 C18.5 0.5 23.5 4 26 11 L35 30 C38 36 45 41 53 41 H60"
        fill="transparent"
        stroke="#2e2e2e"
        strokeWidth="1"
        shapeRendering="crispEdges"
      />

      <rect
        x={-2}
        y={0}
        width={10}
        height={1}
        fill="#2e2e2e"
        shapeRendering="crispEdges"
      />
    </svg>
  );
}
