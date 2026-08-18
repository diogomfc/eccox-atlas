"use client";

import { Check, ChevronsUpDown, Loader2, UserPlus } from "lucide-react";
import { useState, useTransition } from "react";
import { resolvePendingOwner } from "@/app/actions/users";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface UserOption {
  id: string;
  name: string;
  email: string;
}

interface UserPickerProps {
  users: UserOption[];
  value: string | null;
  selectedLabel?: string;
  onChange: (userId: string | null, user: UserOption | null) => void;
  noneLabel?: string;
}

/**
 * Seletor de responsável: busca entre quem já logou no Atlas, ou cadastra
 * alguém que ainda não logou (nome + e-mail corporativo) — vira um usuário
 * "pendente" que assume a identidade real no primeiro login via Entra ID.
 */
export function UserPicker({
  users,
  value,
  selectedLabel,
  onChange,
  noneLabel = "Sem responsável definido",
}: UserPickerProps) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selected = users.find((user) => user.id === value);
  const label = selected?.name ?? selectedLabel ?? (value ? "Responsável" : noneLabel);

  function reset() {
    setAdding(false);
    setName("");
    setEmail("");
    setError(null);
  }

  function handleAddPending() {
    setError(null);
    startTransition(async () => {
      const result = await resolvePendingOwner({ name, email });
      if (!result.ok || !result.user) {
        setError(result.error ?? "Não foi possível cadastrar.");
        return;
      }
      onChange(result.user.id, result.user);
      setOpen(false);
      reset();
    });
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <PopoverTrigger className="flex h-9 w-full min-w-0 items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50">
        <span
          className={cn("min-w-0 flex-1 truncate text-left", !selected && "text-muted-foreground")}
        >
          {label}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-(--anchor-width) min-w-64 p-0" align="start">
        {adding ? (
          <div className="space-y-2 p-3">
            <p className="text-xs font-medium text-muted-foreground">
              Pessoa que ainda não logou no Atlas
            </p>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nome"
            />
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nome@eccox.com.br"
            />
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={pending || !name.trim() || !email.trim()}
                onClick={handleAddPending}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
              >
                {pending ? <Loader2 className="size-3 animate-spin" /> : null}
                Adicionar
              </button>
            </div>
          </div>
        ) : (
          <Command>
            <CommandInput placeholder="Buscar por nome ou e-mail…" />
            <CommandList>
              <CommandEmpty>Ninguém encontrado.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="__none__"
                  onSelect={() => {
                    onChange(null, null);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("size-4", !value ? "opacity-100" : "opacity-0")} />
                  {noneLabel}
                </CommandItem>
                {users.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={`${user.name} ${user.email}`}
                    onSelect={() => {
                      onChange(user.id, user);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn("size-4", user.id === value ? "opacity-100" : "opacity-0")}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {user.name}
                      <span className="ml-1.5 text-xs text-muted-foreground">{user.email}</span>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem value="__add_pending__" onSelect={() => setAdding(true)}>
                  <UserPlus className="size-4" />
                  Pessoa que ainda não logou…
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        )}
      </PopoverContent>
    </Popover>
  );
}
