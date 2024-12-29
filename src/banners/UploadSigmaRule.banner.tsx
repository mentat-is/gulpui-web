import { Banner } from '@/ui/Banner';
import { Button } from '@impactium/components';
import { Input } from '@/ui/Input';
import { useState } from 'react';

export function UploadSigmaRuleBanner() {
  const [file, setFile] = useState<File | null>(null);

  const DoneButton = () => {
    return (
      <Button img='Check' variant='ghost' disabled={!file}></Button>
    )
  }

  return (
    <Banner title='Upload sigma rule' done={<DoneButton />}>
      <Input type='file' onChange={(e) => setFile(e.target.files?.[0] || null)} />
    </Banner>
  )
}