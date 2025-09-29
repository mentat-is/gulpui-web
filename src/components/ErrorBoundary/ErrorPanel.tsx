  import { useState, useCallback, useEffect} from "react";
  import { copy } from "@/ui/utils";
  import { Action } from "./Action";
  import { Stack } from "@/ui/Stack";
  import { Badge } from "@/ui/Badge";
  import { Button } from "@/ui/Button";
  import { ErrorStackItem } from "./ErrorStackItem";
  import { useApplication } from "@/context/Application.context";
  import s from "../styles/ErrorBoundary.module.css";

  interface ErrorWithDescription {
    name?: string;
    message: string;
    stack?: string;
  }

  interface ErrorPanelProps {
    errors: ErrorWithDescription[];
    sessionAutosaver?: () => Promise<void>;
    onClose?: () => void;
  }

  const getBadgeStyle = (disabled: boolean) => ({
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.5 : 1,
    fontFamily: "var(--font-mono)",
  });

  const HINTS = [
    "You might have mismatching versions of React and the renderer (such as React DOM)",
    "You might be breaking the Rules of Hooks",
    "You might have more than one copy of React in the same app",
    "We recommend reporting this error so our developers can investigate and fix it."
  ];

  const parseStack = (stack?: string) =>
    stack?.split("\n")
      .map(line => {
        const match = line.match(/\(?([^\s()]+):(\d+):(\d+)\)?/);
        if (!match) return null;

        const [, fullPath, lineStr, colStr] = match;
        const [, pathSuffix] = fullPath.split("/src/");

        return {
          projectPath: pathSuffix ? `[project]/src/${pathSuffix}` : fullPath,
          clientType: fullPath.includes("/app/") ? "app-client" : "unknown",
          filePath: `/src/${pathSuffix || ""}`,
          line: parseInt(lineStr, 10),
          column: parseInt(colStr, 10)
        };
      })
      .filter(Boolean) as {
        projectPath: string;
        clientType: string;
        filePath: string;
        line?: number;
        column?: number;
      }[];

  export function ErrorPanel({ errors, onClose }: ErrorPanelProps) {
    const { Info } = useApplication();
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [currentErrorIndex, setCurrentErrorIndex] = useState(0);

    useEffect(() => {
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
      };
    }, []);

    if (!errors?.length) return null;

    const isFirst = currentErrorIndex === 0;
    const isLast = currentErrorIndex === errors.length - 1;
    const currentError = errors[currentErrorIndex];

    const prevError = useCallback(() => !isFirst && setCurrentErrorIndex(i => i - 1), [isFirst]);
    const nextError = useCallback(() => !isLast && setCurrentErrorIndex(i => i + 1), [isLast]);

    const handleCopy = useCallback(() => {
      const textToCopy = `${currentError.message}\n${currentError.stack ?? ""}`;
      copy(textToCopy);
    }, [currentError]);

    return (
      <Stack ai='center' jc='start' dir='column' className={s.panel}>
        <Stack ai='center' jc='space-between' dir='row' className={s.header}>
          <Stack style={{ color: 'var(--gray-alpha-1000)', fontFamily: 'var(--font-mono)'}} ai='center' jc='center' dir="row" gap={'6px'} className={s.pagination}>
            <Badge variant="gray-subtle" size="md" style={getBadgeStyle(isFirst)} onClick={prevError} icon="ArrowLeft" />
            {currentErrorIndex + 1}/{errors.length}
            <Badge variant="gray-subtle" size="md" style={getBadgeStyle(isLast)} onClick={nextError} icon="ArrowRight" />
          </Stack>
          <Stack ai='center' jc='center' dir="row" gap={'6px'}>
            <p>Current version:</p>
            <Badge variant="gray-subtle" size="md" value="1.0.0" style={{ color: "var(--gray-alpha-900)" }} />
          </Stack>
        </Stack>
        <Action onCopy={handleCopy} />
        <Stack ai='flex-start' jc='center' dir='column' gap={'16px'} className={s.message}>
          <span>{currentError.message}</span>
          {HINTS.map((hint, idx) => <p key={idx}>{idx + 1}. {hint}</p>)}
          <Stack ai='center' jc='center' dir='column' className={s.stackContainer}>
            <Stack ai='center' jc='start' dir='row' gap={'6px'} className={s.stack}>
              <span style={{ color: "white" }}>Call Stack</span>
              <Badge variant="gray-subtle" size="sm" value={currentError.stack ? `${currentError.stack.split("\n").length}` : ""} />
            </Stack>
            <Stack dir="column" className={s.stackText}>
              {parseStack(currentError.stack).map((item, index) => (
                <ErrorStackItem
                  key={index}
                  projectPath={item.projectPath}
                  clientType={item.clientType}
                  filePath={item.filePath}
                  line={item.line}
                  column={item.column}
                />
              ))}
            </Stack>
          </Stack>
          <Stack jc="flex-end" gap={12} className={s.footer}>
            <Button variant='tertiary' size='lg'>Save log</Button>
            {isOnline && (
              <Button variant='tertiary' size='lg'>Report</Button>
            )}
            <Button variant='default' size='lg' icon='X' onClick={onClose}>Ignore</Button>
            <Button variant="default" size="lg" icon="Save" onClick={ async () => {Info.session_create({ name: `error ${new Date().toISOString()}`, icon: 'Bug', color: 'red'}); onClose?.() }}>Save sassion</Button>
          </Stack>
        </Stack>
      </Stack>
    );
  }
