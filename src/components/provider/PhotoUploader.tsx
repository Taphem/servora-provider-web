"use client";

import { useEffect, useId, useRef, useState, type DragEvent } from "react";
import { ImageUp, RefreshCw, Trash2, UserRound } from "lucide-react";
import { validateProfilePhoto } from "@/lib/api/provider";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";

export interface PhotoUploaderProps {
  /** The provider's currently-saved photo URL, if any (persisted on backend). */
  savedUrl?: string | null;
  /** Backwards-compatible alias for savedUrl. */
  value?: string | null;
  /** The currently-selected local File waiting to be uploaded upon final submit. */
  pendingFile?: File | null;
  /** Called when the provider selects or clears a local file. Does NOT call Cloudinary. */
  onFileSelect?: (file: File | null) => void;
  /** Called when the provider removes their saved photo (clearing persisted photo). */
  onRemove?: () => void;
  /** Legacy callback if needed. */
  onUploaded?: (url: string) => void;
  disabled?: boolean;
  isUploading?: boolean;
  uploadError?: string | null;
}

/**
 * Deferred profile photo selector: validates format and size locally, generates
 * an immediate object URL preview, and holds the File in state.
 *
 * Cloudinary upload NEVER happens here — upload is deferred until the provider
 * clicks the final submission action ("Finish setup" / "Save changes").
 */
export function PhotoUploader({
  savedUrl,
  value,
  pendingFile,
  onFileSelect,
  onRemove,
  disabled,
  isUploading = false,
  uploadError,
}: PhotoUploaderProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingFile) return;
    const url = URL.createObjectURL(pendingFile);
    queueMicrotask(() => {
      setObjectUrl(url);
    });
    return () => {
      URL.revokeObjectURL(url);
      queueMicrotask(() => {
        setObjectUrl(null);
      });
    };
  }, [pendingFile]);

  const persistedPhoto = savedUrl ?? value ?? null;
  const displayedPhoto = (pendingFile ? (objectUrl || "blob:pending") : null) ?? persistedPhoto;

  function handleFile(file: File) {
    const errorMsg = validateProfilePhoto(file);
    if (errorMsg) {
      setValidationError(errorMsg);
      return;
    }

    setValidationError(null);
    onFileSelect?.(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  function openFilePicker() {
    if (!disabled && !isUploading) inputRef.current?.click();
  }

  function handleRemove() {
    setValidationError(null);
    if (inputRef.current) inputRef.current.value = "";

    // If there is a pending local replacement, clearing it reverts to the saved photo
    if (pendingFile) {
      onFileSelect?.(null);
      return;
    }

    // Otherwise, provider is removing their already-saved photo
    if (persistedPhoto) {
      onRemove?.();
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    if (disabled || isUploading) return;
    const file = event.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  const activeError = uploadError ?? validationError;

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
        disabled={disabled || isUploading}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {displayedPhoto ? (
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border-default bg-ink-50">
            {/* eslint-disable-next-line @next/next/no-img-element -- previewing local blob or saved Cloudinary URL */}
            <img src={displayedPhoto} alt="" className="h-full w-full object-cover" />
            {isUploading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-ink-950/40">
                <Spinner size={20} className="text-white" />
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            {pendingFile ? (
              <p className="text-xs text-text-muted">
                {isUploading
                  ? `Uploading ${pendingFile.name}…`
                  : `Selected: ${pendingFile.name} (will save when you submit).`}
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
                disabled={disabled || isUploading}
              >
                {persistedPhoto ? "Replace photo" : "Change photo"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon={<Trash2 size={13} aria-hidden />}
                onClick={handleRemove}
                disabled={disabled || isUploading}
              >
                {pendingFile && persistedPhoto ? "Cancel change" : "Remove photo"}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={disabled || isUploading ? -1 : 0}
          onClick={openFilePicker}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openFilePicker();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled && !isUploading) setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors duration-[var(--duration-fast)]",
            dragActive ? "border-brand-500 bg-brand-50" : "border-border-strong bg-surface-sunken hover:border-brand-400",
            (disabled || isUploading) && "pointer-events-none opacity-50",
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

      {activeError ? (
        <p role="alert" className="text-sm text-error">
          {activeError}
        </p>
      ) : null}
    </div>
  );
}
