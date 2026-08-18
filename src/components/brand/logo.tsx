"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  shape?: "horizontal" | "icon";
  className?: string;
}

const SIZES = {
  horizontal: { width: 132, height: 33 },
  icon: { width: 28, height: 28 },
} as const;

/**
 * O sufixo do ficheiro indica o fundo em que a arte funciona:
 * `-dark` e o wordmark quase branco (tema escuro), `-light` o petroleo (tema claro).
 */
export function Logo({ shape = "horizontal", className }: LogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const variant = mounted && resolvedTheme === "light" ? "light" : "dark";
  const file = shape === "horizontal" ? "logo-horizontal" : "icon-logo-eccox";
  const { width, height } = SIZES[shape];

  return (
    <Image
      src={`/logos/${file}-${variant}.png`}
      alt="ECCOX"
      width={width}
      height={height}
      priority
      className={cn("h-auto w-auto object-contain", className)}
    />
  );
}
