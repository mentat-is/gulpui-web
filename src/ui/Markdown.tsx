import { cn } from "@impactium/utils";
import { HTMLAttributes } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypePrismPlus from "rehype-prism-plus";
import s from "./styles/Markdown.module.css";
import "./styles/prism-tomorrow.css";

export namespace Markdown {
  export interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
    value: string;
  }
}

export function Markdown({ className, value, ...props }: Markdown.Props) {
  return (
    <div className={cn(s.markdown, className)} {...props}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypePrismPlus]}
      >
        {value}
      </ReactMarkdown>
    </div>
  );
}
