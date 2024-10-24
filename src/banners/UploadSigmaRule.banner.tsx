import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { Input } from "@/ui/Input";
import { useState } from "react";

export function UploadSigmaRuleBanner() {
  const [file, setFile] = useState<File | null>(null);
  
  const upload = () => {
    if (!file) return;
    console.log(file);
  }

  return (
    <Banner title='Upload sigma rule'>
      <Input type='file' onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <Button img='Bookmark' variant={file ? 'default' : 'disabled'} onClick={upload}>Done</Button>
    </Banner>
  )
}