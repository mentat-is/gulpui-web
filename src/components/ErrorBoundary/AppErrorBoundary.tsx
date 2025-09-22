import React from "react";
import { MiddleLine } from "./svgs/MiddleLine";
import { RightCap } from "./svgs/RightCap";
import { LeftCap } from "./svgs/LeftCap";
import { ErrorPanel } from "./ErrorPanel";

import s from '../styles/ErrorBoundary.module.css'

type Props = { children: React.ReactNode };
type ErrorWithDescription = { message: string; stack?: string };
type State = { errors: ErrorWithDescription[]; componentStack: string | any };

export class AppErrorBoundary extends React.Component<Props, State> {
  static instance: AppErrorBoundary | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { errors: [], componentStack: "" };
  }

  static getDerivedStateFromError(error: Error) {
    return { errors: [{ message: error.message, stack: error.stack }] };
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
    this.setState((prev) => ({
      errors: [...prev.errors, { message: error.message, stack: error.stack }],
    }));
  }

  render() {
    if (this.state.errors.length > 0) {
      return (
        <div className={s.wrapper}>
          <div className={s.block}>
            <LeftCap />
            <MiddleLine/>
            <RightCap/>
            <ErrorPanel errors={this.state.errors} />
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
