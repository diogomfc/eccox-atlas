"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { NewProcessForm } from "@/components/processes/new-process-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface NewProcessDialogProps {
  areas: Array<{ id: string; name: string; sigla: string }>;
}

export function NewProcessDialog({ areas }: NewProcessDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus data-icon="inline-start" />
            Novo processo
          </Button>
        }
      />
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo processo</DialogTitle>
          <DialogDescription>
            Cadastre o processo e monte o roteiro da entrevista na tela seguinte.
          </DialogDescription>
        </DialogHeader>
        <NewProcessForm
          areas={areas}
          onCreated={(processId) => {
            setOpen(false);
            router.push(`/processos/${processId}`);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
