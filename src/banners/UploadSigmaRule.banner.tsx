import { Banner } from '@/ui/Banner';
import { Button } from '@impactium/components';
import { Input } from '@/ui/Input';
import { useState } from 'react';

export function UploadSigmaRuleBanner() {
  const [file, setFile] = useState<File | null>(null);

  return (
    <Banner title='Upload sigma rule'>
      <Input type='file' onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <Button img='CheckCheck' variant={file ? 'default' : 'disabled'}>Apply</Button>
    </Banner>
  )
}