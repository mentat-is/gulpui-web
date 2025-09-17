import React from "react";

type Props = { children: React.ReactNode };
type State = { error: Error | null };

export class AppErrorBoundary extends React.Component<Props, State> {
  static instance: AppErrorBoundary | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[UI Error]", error, info.componentStack);
  }

  componentDidMount() {
    AppErrorBoundary.instance = this;
  }

  componentWillUnmount() {
    AppErrorBoundary.instance = null;
  }

  // global method 
  showError(error: Error) {
    this.setState({ error });
  }

  render() {
    if (this.state.error) {
      return (
        <>
          <p>{this.state.error.message}</p>
          <pre style={{
            marginTop: 16,
            whiteSpace: "pre-wrap",
            maxHeight: "40vh",
            overflow: "auto",
            background: "#111",
            padding: 12,
            borderRadius: 6,
            width: "100%",
            maxWidth: 600,
          }}>
            {this.state.error.stack}
          </pre>
        </>
      );
    }
    return this.props.children;
  }
}
