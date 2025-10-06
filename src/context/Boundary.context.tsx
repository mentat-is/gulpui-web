import React from "react";
import { Stack } from "@/ui/Stack";
import { SVGerrors } from "../components/SVGErrors";
import { ErrorPanel } from "../components/ErrorPanel";

import s from "../components/styles/ErrorBoundary.module.css";

type Props = { 
  children: React.ReactNode 
};
type ErrorWithDescription = {
  name?: string;
  message: string;
  stack?: string;
};

type State = { 
  errors: ErrorWithDescription[]; 
  componentStack: string | any 
};

class ErrorBoundary extends React.Component<Props, State> {
  static instance: ErrorBoundary | null = null;
  banners: React.ReactNode[] = [];

  constructor(props: Props) {
    super(props);
    this.state = { errors: [], componentStack: "" };
  }

  static getDerivedStateFromError(error: Error) {
    return { errors: [{ name: error.name, message: error.message, stack: error.stack }] };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[UI Error]", error, info.componentStack);
    this.setState({ componentStack: info.componentStack });
  }

  componentDidMount() {
    ErrorBoundary.instance = this;
  }

  componentWillUnmount() {
    ErrorBoundary.instance = null;
  }

  showError(error: Error) {
    this.setState((prev) => ({
      errors: [...prev.errors, { name: error.name, message: error.message, stack: error.stack }],
    }));
  }

  closeError = () => {
    this.setState(() => ({ errors: [] }));
  };

  spawnBannerFunc = (node: React.ReactNode) => {
    this.banners.push(node);
    this.forceUpdate();
  };

  render() {
    if (this.state.errors.length > 0) {
      return (
        <Stack ai="center" jc="center" className={s.wrapper}>
          <Stack pos="relative" className={s.block}>
            <SVGerrors.LeftCap />
            <SVGerrors.MiddleLine />
            <SVGerrors.RightCap />
            <ErrorPanel errors={this.state.errors} onClose={this.closeError} />
            {this.banners.map((banner, index) => (
              <React.Fragment key={index}>{banner}</React.Fragment>
            ))}
          </Stack>
        </Stack>
      );
    }
    return this.props.children;
  }
}

export namespace Boundary {
  export const Provider = (props: Props) => <ErrorBoundary {...props} />;
  export const instance = (): ErrorBoundary | null => ErrorBoundary.instance;
}
