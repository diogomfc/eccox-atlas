"use client";

import { Check, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { updateProcess } from "@/app/actions/processes";
import { AreaSelectField } from "@/components/areas/area-select-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { type UserOption, UserPicker } from "@/components/users/user-picker";
import type { ProcessPriority } from "@/generated/prisma/client";
import { PROCESS_PRIORITY_LABEL, PROCESS_PRIORITY_ORDER } from "@/lib/badges";

interface ProcessEditFormProps {
  id: string;
  name: string;
  objective: string | null;
  relatedPolicyRef: string | null;
  areaId: string;
  areas: Array<{ id: string; name: string; sigla: string }>;
  priority: ProcessPriority;
  ownerId: string | null;
  users: UserOption[];
}

export function ProcessEditForm({
  id,
  name,
  objective,
  relatedPolicyRef,
  areaId,
  areas,
  priority,
  ownerId,
  users: initialUsers,
}: ProcessEditFormProps) {
  const [values, setValues] = useState({
    name,
    objective: objective ?? "",
    relatedPolicyRef: relatedPolicyRef ?? "",
    areaId,
    priority,
    ownerId,
  });
  const [users, setUsers] = useState<UserOption[]>(initialUsers);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function save(next: typeof values) {
    setSaved(false);
    startTransition(async () => {
      const result = await updateProcess({
        id,
        name: next.name,
        objective: next.objective,
        relatedPolicyRef: next.relatedPolicyRef,
        areaId: next.areaId,
        priority: next.priority,
        ownerId: next.ownerId ?? "",
      });
      if (result.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      }
    });
  }

  function update<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    const next = { ...values, [key]: value };
    setValues(next);
    return next;
  }

  const priorityItems = Object.fromEntries(
    PROCESS_PRIORITY_ORDER.map((item) => [item, PROCESS_PRIORITY_LABEL[item]]),
  );

  return (
    <div className="surface-panel space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold tracking-tight">Dados do processo</h2>
        {pending ? <Loader2 className="size-3.5 animate-spin text-muted-foreground" /> : null}
        {saved ? <Check className="size-3.5 text-success" /> : null}
      </div>

      <AreaSelectField
        areas={areas}
        value={values.areaId}
        onValueChange={(next) => save(update("areaId", next))}
      />

      <div className="grid gap-1.5">
        <Label htmlFor="proc-name">Nome</Label>
        <Input
          id="proc-name"
          value={values.name}
          onChange={(event) => update("name", event.target.value)}
          onBlur={() => save(values)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-1.5">
          <Label>Prioridade</Label>
          <Select
            items={priorityItems}
            value={values.priority}
            onValueChange={(next) => save(update("priority", next as ProcessPriority))}
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
            value={values.ownerId}
            onChange={(id, user) => {
              save(update("ownerId", id));
              if (user && !users.some((existing) => existing.id === user.id)) {
                setUsers((prev) => [...prev, user]);
              }
            }}
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="proc-objective">Objetivo</Label>
        <Textarea
          id="proc-objective"
          rows={3}
          value={values.objective}
          onChange={(event) => update("objective", event.target.value)}
          onBlur={() => save(values)}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="proc-policy">Política relacionada</Label>
        <Input
          id="proc-policy"
          value={values.relatedPolicyRef}
          onChange={(event) => update("relatedPolicyRef", event.target.value)}
          onBlur={() => save(values)}
          placeholder="Ex: Política de Reembolso"
        />
      </div>
    </div>
  );
}
