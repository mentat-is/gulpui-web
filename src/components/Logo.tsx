import React from "react";

export namespace Logo {
  export interface Props extends React.ImgHTMLAttributes<HTMLImageElement> { }
}

export function Logo({ width = 256, height = 256, ...props }: Logo.Props) {
  return (
    <img
      src="/gulp-logo.svg"
      width={width}
      height={height}
      alt="GULP logo"
      {...props}
    />
  )
}
