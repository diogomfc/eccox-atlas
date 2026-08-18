"use client";

import { Sparkles } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ProcessTabsProps {
  overview: ReactNode;
  aiFirst: ReactNode;
  invites: ReactNode;
}

const TAB_VALUES = new Set(["overview", "ai-first", "invites"]);

export function ProcessTabs({ overview, aiFirst, invites }: ProcessTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeTab = TAB_VALUES.has(searchParams.get("tab") ?? "")
    ? (searchParams.get("tab") as string)
    : "overview";

  function handleTabChange(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "overview") params.delete("tab");
    else params.set("tab", next);
    const query = params.toString();
    router.replace(
      `${pathname}${query ? `?${query}` : ""}` as Parameters<typeof router.replace>[0],
      {
        scroll: false,
      },
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={(next) => handleTabChange(String(next))}>
      <TabsList>
        <TabsTrigger value="overview">Visão geral</TabsTrigger>
        <TabsTrigger value="ai-first">
          <Sparkles className="size-3.5" />
          Fluxo AI-First
        </TabsTrigger>
        <TabsTrigger value="invites">Convites & Entrevistas</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="space-y-8 pt-6">
        {overview}
      </TabsContent>
      <TabsContent value="ai-first" className="space-y-8 pt-6">
        {aiFirst}
      </TabsContent>
      <TabsContent value="invites" className="space-y-8 pt-6">
        {invites}
      </TabsContent>
    </Tabs>
  );
}
