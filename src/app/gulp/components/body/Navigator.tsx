import { Stack } from "@impactium/components";
import { cn } from "@impactium/utils";
import s from './styles/Navigator.module.css'
import { useApplication } from "@/context/Application.context";

export namespace Navigator {
  export interface Props extends Stack.Props {

  }
}

export function Navigator({ className, ...props }: Navigator.Props) {
  const { app } = useApplication();

  return (
    <Stack className={cn(className, s.navigator)} {...props}>
      
    </Stack>
  )
}