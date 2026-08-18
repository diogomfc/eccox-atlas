"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isLight = mounted && resolvedTheme === "light";

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={isLight ? "Ativar tema escuro" : "Ativar tema claro"}
      onClick={() => setTheme(isLight ? "dark" : "light")}
    >
      {isLight ? <Moon /> : <Sun />}
    </Button>
  );
}
