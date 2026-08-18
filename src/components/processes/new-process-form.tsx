"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { createProcess, listTemplateProcesses } from "@/app/actions/processes";
import { listUserOptions } from "@/app/actions/users";
import { AreaSelectField } from "@/components/areas/area-select-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { type UserOption, UserPicker } from "@/components/users/user-picker";
import type { ProcessPriority } from "@/generated/prisma/client";
import { PROCESS_PRIORITY_LABEL, PROCESS_PRIORITY_ORDER } from "@/lib/badges";

interface NewProcessFormProps {
  areas: Array<{ id: string; name: string; sigla: string }>;
  onCreated?: (processId: string) => void;
}

export function NewProcessForm({ areas, onCreated }: NewProcessFormProps) {
  const router = useRouter();
  const [areaId, setAreaId] = useState(areas[0]?.id ?? "");
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [relatedPolicyRef, setRelatedPolicyRef] = useState("");
  const [priority, setPriority] = useState<ProcessPriority>("MEDIA");
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [startFromTemplate, setStartFromTemplate] = useState(true);
  const [templateProcessId, setTemplateProcessId] = useState<string | null>(null);
  const [templateOptions, setTemplateOptions] = useState<
    Array<{ id: string; code: string; name: string }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    listUserOptions().then(setUsers);
  }, []);

  useEffect(() => {
    if (startFromTemplate || !areaId) {
      setTemplateOptions([]);
      return;
    }
    listTemplateProcesses(areaId).then(setTemplateOptions);
  }, [startFromTemplate, areaId]);

  const priorityItems = Object.fromEntries(
    PROCESS_PRIORITY_ORDER.map((item) => [item, PROCESS_PRIORITY_LABEL[item]]),
  );

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await createProcess({
        areaId,
        name,
        objective,
        relatedPolicyRef,
        priority,
        ownerId: ownerId ?? undefined,
        startFromTemplate,
        templateProcessId: templateProcessId ?? undefined,
      });
      if (!result.ok || !result.id) {
        setError(result.error ?? "Não foi possível criar o processo.");
        return;
      }
      if (onCreated) {
        onCreated(result.id);
      } else {
        router.push(`/processos/${result.id}`);
      }
    });
  }

  return (
    <div className="space-y-4">
      <AreaSelectField areas={areas} value={areaId} onValueChange={setAreaId} />

      <div className="grid gap-1.5">
        <Label htmlFor="name">Nome do processo</Label>
        <Input id="name" value={name} onChange={(event) => setName(event.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-1.5">
          <Label>Prioridade</Label>
          <Select
            items={priorityItems}
            value={priority}
            onValueChange={(next) => setPriority(next as ProcessPriority)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROCESS_PRIORITY_ORDER.map((item) => (
                <SelectItem key={item} value={item}>
                  {PROCESS_PRIORITY_LABEL[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label>Responsável pelo processo</Label>
          <UserPicker
            users={users}
            value={ownerId}
            onChange={(id, user) => {
              setOwnerId(id);
              if (user && !users.some((existing) => existing.id === user.id)) {
                setUsers((prev) => [...prev, user]);
              }
            }}
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="objective">Objetivo (opcional — a entrevista pode preencher)</Label>
        <Textarea
          id="objective"
          rows={3}
          value={objective}
          onChange={(event) => setObjective(event.target.value)}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="policy">Política relacionada (opcional)</Label>
        <Input
          id="policy"
          value={relatedPolicyRef}
          onChange={(event) => setRelatedPolicyRef(event.target.value)}
          placeholder="Ex: Política de Reembolso"
        />
      </div>

      <div className="flex items-center gap-2.5 text-sm">
        <Switch
          id="start-from-template"
          checked={startFromTemplate}
          onCheckedChange={(checked) => {
            setStartFromTemplate(checked);
            if (checked) setTemplateProcessId(null);
          }}
        />
        <Label htmlFor="start-from-template" className="font-normal">
          Começar com o roteiro padrão (Objetivo, Responsável, Ferramentas, Passos)
        </Label>
      </div>

      {!startFromTemplate && templateOptions.length > 0 ? (
        <div className="grid gap-1.5">
          <Label>Usar como modelo (opcional)</Label>
          <Select
            items={{
              __none__: "Começar em branco",
              ...Object.fromEntries(
                templateOptions.map((option) => [option.id, `${option.code} — ${option.name}`]),
              ),
            }}
            value={templateProcessId ?? "__none__"}
            onValueChange={(next) =>
              setTemplateProcessId(next === "__none__" ? null : String(next))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Começar em branco</SelectItem>
              {templateOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.code} — {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Clona as perguntas de um roteiro personalizado já usado nesta área.
          </p>
        </div>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <Button disabled={pending || !name.trim() || !areaId} onClick={handleSubmit}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        Criar processo
      </Button>
    </div>
  );
}
