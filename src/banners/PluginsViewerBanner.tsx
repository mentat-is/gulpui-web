import { useApplication } from "@/context/Application.context";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";

export function PluginsViewerBanner() {
  const { app, Info } = useApplication();

  return (
    <Banner title='Review plugins'>
      {app.target.plugins_map.map(p => {
        return (
          <Button key={p.name}>Reveal {p.name}</Button>
        )
      })}
    </Banner>
  )
}