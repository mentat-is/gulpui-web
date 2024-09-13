import { useState } from "react";
import { useLanguage } from "../context/Language.context";
import { Banner } from "../ui/Banner";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { useApplication } from "../context/Application.context";
import { OperationCreate } from "../dto/OperationCreate.dto";

export function CreateOperationBanner() {
  const { lang } = useLanguage();
  const { api, Info, destroyBanner } = useApplication();
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const createOperation = () => {
    setLoading(true)
    api<OperationCreate>('/operation_create', {
      method: 'POST',
      data: {
        name
      },
      body: description
    }).then(response => response.isSuccess() ? Info.operations_reload().then(_ => (destroyBanner())) : null);
  };

  return (
    <Banner title={lang.operation.create}>
      <Input
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
        placeholder={lang.operation.set_name} />
      <Input
        value={description}
        onChange={(e) => setDescription(e.currentTarget.value)}
        placeholder={lang.operation.set_description} />
      <Button
        variant={!name && !description ? 'disabled' : 'default'}
        loading={loading}
        img={'https://cdn.impactium.fun/ui/action/add-plus.svg'}
        onClick={createOperation}>{lang.operation.create_with_name + name}</Button>,
    </Banner>
  )
}