import { HTMLAttributes } from "react";
import { Button } from "./Button";
import { toast } from "sonner";
import { copy } from "./utils";

type XMLTreeProps = HTMLAttributes<HTMLDivElement> & { xml: string };

function parseXML(xml: string): string[] {
  return xml.split(/(<[^>]+>)/g).filter(part => part.trim());
}

export function XMLTree({ xml, ...props }: XMLTreeProps) {
  let indentLevel = 1;

  return (
    <div {...props}>
      <Button onClick={() => copy(xml)} style={{ width: '100%', marginBottom: '8px' }}>Copy</Button>
      {parseXML(xml).map((part, index) => {
        if (part.startsWith('</')) indentLevel--;
        
        const element = (
          <div key={index} style={{ marginLeft: `${indentLevel * 12}px`, whiteSpace: 'nowrap' }}>
            {part}
          </div>
        );
        
        if (part.startsWith('<') && !part.startsWith('</') && !part.endsWith('/>')) indentLevel++;
        
        return element;
      })}
    </div>
  );
}
