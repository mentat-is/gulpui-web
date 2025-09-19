import React from "react";
import s from './styles/ErrorBoundary.module.css'

type Props = { children: React.ReactNode };
type State = { error: Error | null; componentStack: any };

export class AppErrorBoundary extends React.Component<Props, State> {
  static instance: AppErrorBoundary | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { error: null, componentStack: "" };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[UI Error]", error, info.componentStack);
    this.setState({ componentStack: info.componentStack });
  }

  componentDidMount() {
    AppErrorBoundary.instance = this;
  }

  componentWillUnmount() {
    AppErrorBoundary.instance = null;
  }

  showError(error: Error) {
    this.setState({ error });
  }

  render() {
    if (this.state.error) {
      return (
        <div className={s.wrapper}>
          <div className={s.panel}>

            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 60 42"
              width="60"
              height="42"
              preserveAspectRatio="none"
              style={{ 
                position: "absolute", 
                top: '-1px', 
                left: "10%" 
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

            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 100 42"
              preserveAspectRatio="none"
              style={{
                position: "absolute",
                zIndex: 1000,
                top: '-1px',
                left: "calc(10% + 55px)",
                width: 'calc(100% - 20% - 110px)',
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
            
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 60 42"
              width="60"
              height="42"
              preserveAspectRatio="none"
              style={{
                position: "absolute",
                top: '-1px',
                right: '10%',
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

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
