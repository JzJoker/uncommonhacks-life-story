"use client";

import Image from "next/image";
import { Images } from "lucide-react";
import { useId, useRef, useState, type ChangeEvent } from "react";

type ImageUploadProps = {
  name?: string;
  label?: string;
  className?: string;
  onChange?: (file: File | null) => void;
};

export function ImageUpload({
  name,
  label = "Add a Photo",
  className = "",
  onChange,
}: ImageUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
    onChange?.(file);
  };

  return (
    <div
      className={[
        "bg-paper border border-cream-100 rounded-[4px]",
        "w-full p-4 pb-8",
        "shadow-[4px_4px_4px_0_rgba(0,0,0,0.04)]",
        className,
      ].join(" ")}
    >
      <label
        htmlFor={inputId}
        className={[
          "flex h-[252px] w-full items-center justify-center",
          "bg-[#f1f1f1] rounded-[4px] cursor-pointer overflow-hidden",
          "relative group",
        ].join(" ")}
      >
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt="Uploaded preview"
            fill
            sizes="354px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex flex-col items-center gap-2.5 text-muted">
            <Images size={48} strokeWidth={1.5} />
            <span className="text-xs">{label}</span>
          </div>
        )}
        <input
          id={inputId}
          ref={inputRef}
          name={name}
          type="file"
          accept="image/*"
          onChange={handleChange}
          className="sr-only"
        />
      </label>
    </div>
  );
}

export default ImageUpload;
