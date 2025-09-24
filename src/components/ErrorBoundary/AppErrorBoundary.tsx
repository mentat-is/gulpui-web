import React from "react";
import { LeftCap } from "./svgs/LeftCap";
import { ErrorPanel } from "./ErrorPanel";
import { RightCap } from "./svgs/RightCap";
import { MiddleLine } from "./svgs/MiddleLine";

import s from '../styles/ErrorBoundary.module.css'
import { Stack } from "@/ui/Stack";

type Props = { children: React.ReactNode };
type ErrorWithDescription = { 
  name?: string;
  message: string; 
  stack?: string;
};
type State = { errors: ErrorWithDescription[]; componentStack: string | any };

export class AppErrorBoundary extends React.Component<Props, State> {
  static instance: AppErrorBoundary | null = null;

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
    AppErrorBoundary.instance = this;
  }

  componentWillUnmount() {
    AppErrorBoundary.instance = null;
  }

  showError(error: Error) {
    this.setState((prev) => ({
      errors: [...prev.errors, { name: error.name, message: error.message, stack: error.stack, timestamp: new Date().toISOString() }],
    }));
  }

  render() {
    if (this.state.errors.length > 0) {
      return (
        <Stack ai='center' jc='center' className={s.wrapper}>
          <Stack pos='relative' className={s.block}>
            <LeftCap />
            <MiddleLine/>
            <RightCap/>
            <ErrorPanel errors={this.state.errors} />
          </Stack>
        </Stack>
      );
    }
    return this.props.children;
  }
}
