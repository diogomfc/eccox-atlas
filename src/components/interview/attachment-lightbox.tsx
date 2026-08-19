"use client";

import { Download, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface AttachmentLightboxProps {
  src: string;
  fileName: string;
  onClose: () => void;
}

export function AttachmentLightbox({ src, fileName, onClose }: AttachmentLightboxProps) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <a
          href={src.replace("?inline=true", "")}
          download
          onClick={(event) => event.stopPropagation()}
        >
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
            <Download />
          </Button>
        </a>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20"
          onClick={onClose}
        >
          <X />
        </Button>
      </div>
      <img
        src={src}
        alt={fileName}
        className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      />
      <p className="absolute bottom-4 text-sm text-white/70">{fileName}</p>
    </div>
  );
}
