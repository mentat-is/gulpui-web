import React from "react";
import { Stack } from "@/ui/Stack";
import s from "../styles/StackItem.module.css";

interface ErrorStackItemProps {
  projectPath: string;
  clientType: string;
  filePath: string;
  line?: number;
  column?: number;
}

export const ErrorStackItem: React.FC<ErrorStackItemProps> = ({ projectPath, clientType, filePath, line, column }) => {
  return (
    <Stack ai='center' jc='center' dir='column' gap={'8px'} className={s.stackItem}>
      <Stack ai='center' jc='start' dir='row' gap={'6px'} className={s.stackHeader}>
        [project] {projectPath} [{clientType}]
      </Stack>
      <Stack className={s.stackPosition}>
        {filePath}{projectPath} {line && column ? `(${line}:${column})` : ""}
      </Stack>
    </Stack>
  );
};
