"use client";

import Image from "next/image";
import { Images } from "lucide-react";
import { useId, useRef, useState, type ChangeEvent, type ReactNode } from "react";

type ImageUploadProps = {
  name?: string;
  label?: string;
  className?: string;
  /** Tailwind classes applied to the inner image area. */
  frameClassName?: string;
  /** Absolutely-positioned content layered over the image. */
  overlay?: ReactNode;
  onChange?: (file: File | null) => void;
  /** Called with the object URL each time a new preview is created (null on clear). */
  onPreviewChange?: (url: string | null) => void;
  /** Called once the uploaded image element loads, with its natural dimensions. */
  onImageLoad?: (naturalWidth: number, naturalHeight: number) => void;
};

export function ImageUpload({
  name,
  label = "Add a Photo",
  className = "",
  frameClassName = "h-[252px]",
  overlay,
  onChange,
  onPreviewChange,
  onImageLoad,
}: ImageUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    const url = file ? URL.createObjectURL(file) : null;
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    onPreviewChange?.(url);
    onChange?.(file);
  };

  return (
    <div
      className={[
        "bg-paper border border-cream-100 rounded-[4px]",
        "w-full p-4 pb-8 h-[300px]",
        "shadow-[4px_4px_4px_0_rgba(0,0,0,0.04)]",
        className,
      ].join(" ")}
    >
      {/* Wrapper is relative so the overlay can be siblings with the label */}
      <div className="relative">
        <label
          htmlFor={inputId}
          className={[
            "flex w-full items-center justify-center",
            "bg-[#f1f1f1] rounded-[4px] cursor-pointer overflow-hidden",
            "relative group",
            frameClassName,
          ].join(" ")}
        >
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt="Uploaded preview"
              fill
              sizes="(max-width: 640px) 100vw, 640px"
              className="object-contain"
              unoptimized
              onLoad={(e) => {
                const { naturalWidth, naturalHeight } = e.currentTarget;
                onImageLoad?.(naturalWidth, naturalHeight);
              }}
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

        {/* Overlay sits outside the label so clicks on interactive overlay elements
            don't bubble up and accidentally open the file picker. */}
        {overlay && (
          <div className="absolute inset-0 pointer-events-none rounded-[4px] overflow-hidden">
            {overlay}
          </div>
        )}
      </div>
    </div>
  );
}

export default ImageUpload;
