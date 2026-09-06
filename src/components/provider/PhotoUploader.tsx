"use client";

import { useEffect, useId, useRef, useState, type DragEvent } from "react";
import { ImageUp, RefreshCw, Trash2, UserRound } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { uploadMyProfilePhoto, validateProfilePhoto } from "@/lib/api/provider";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";

interface PhotoUploaderProps {
  /** The provider's currently-saved photo URL, if any (update mode / resumed onboarding). */
  value?: string | null;
  /** Called with the new Cloudinary URL once a selected image finishes uploading. */
  onUploaded: (url: string) => void;
  /** Called when the provider removes their photo (clears the field). */
  onRemove?: () => void;
  disabled?: boolean;
}

type Status = "idle" | "uploading" | "error";

/**
 * A signed direct-to-Cloudinary uploader: the browser never sees the
 * Cloudinary API secret, and never accepts a pasted image URL — every
 * photo reaches servora-provider only as the exact secure_url Cloudinary
 * returned for a short-lived signature this app requested on the
 * provider's behalf (see lib/api/provider.ts uploadMyProfilePhoto).
 */
export function PhotoUploader({ value, onUploaded, onRemove, disabled }: PhotoUploaderProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    [],
  );

  const displayedPhoto = preview ?? value ?? null;

  async function handleFile(file: File) {
    const validationError = validateProfilePhoto(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;

    setError(null);
    setPreview(objectUrl);
    setFileName(file.name);
    setPendingFile(file);
    await upload(file);
  }

  async function upload(file: File) {
    setStatus("uploading");
    setError(null);
    try {
      const url = await uploadMyProfilePhoto(file);
      setStatus("idle");
      onUploaded(url);
    } catch (err) {
      setStatus("error");
      setError(err instanceof ApiError ? err.message : "Couldn't upload your profile photo. Please try again.");
    }
  }

  function openFilePicker() {
    if (!disabled) inputRef.current?.click();
  }

  function handleRemove() {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    setPreview(null);
    setFileName(null);
    setPendingFile(null);
    setStatus("idle");
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
    onRemove?.();
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    if (disabled) return;
    const file = event.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-ink-700">
        Profile photo
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      {displayedPhoto ? (
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border-default bg-ink-50">
            {/* eslint-disable-next-line @next/next/no-img-element -- previewing a local blob: / already-uploaded Cloudinary URL, not an optimizable static asset */}
            <img src={displayedPhoto} alt="" className="h-full w-full object-cover" />
            {status === "uploading" ? (
              <div className="absolute inset-0 flex items-center justify-center bg-ink-950/40">
                <Spinner size={20} className="text-white" />
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            {fileName ? (
              <p className="text-xs text-text-muted">
                {status === "uploading"
                  ? `Uploading ${fileName}…`
                  : status === "error"
                    ? `Couldn't upload ${fileName}.`
                    : `${fileName} uploaded.`}
              </p>
            ) : (
              <p className="text-xs text-text-muted">Current profile photo.</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={<RefreshCw size={13} aria-hidden />}
                onClick={openFilePicker}
                disabled={disabled || status === "uploading"}
              >
                Replace photo
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon={<Trash2 size={13} aria-hidden />}
                onClick={handleRemove}
                disabled={disabled || status === "uploading"}
              >
                Remove photo
              </Button>
              {status === "error" && pendingFile ? (
                <Button type="button" variant="tertiary" size="sm" onClick={() => void upload(pendingFile)}>
                  Retry upload
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          onClick={openFilePicker}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openFilePicker();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled) setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors duration-[var(--duration-fast)]",
            dragActive ? "border-brand-500 bg-brand-50" : "border-border-strong bg-surface-sunken hover:border-brand-400",
            disabled && "pointer-events-none opacity-50",
          )}
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ink-100 text-ink-400">
            <UserRound size={26} aria-hidden />
          </span>
          <span className="flex items-center gap-1.5 text-sm font-medium text-brand-700">
            <ImageUp size={15} aria-hidden />
            Add profile photo
          </span>
          <span className="text-xs text-text-muted">Drag and drop, or click to choose a file</span>
          <span className="text-xs text-text-muted">JPG, JPEG, PNG, or WebP — up to 5 MB</span>
        </div>
      )}

      {error ? (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
