"use client";

import { FileText, Upload, X } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";

import { Button } from "@/components/ui/button";
import { ACCEPTED_EXTENSIONS, formatBytes } from "@/lib/transcriptSource";
import { cn } from "@/lib/utils";

interface FileDropzoneProps {
  file: File | null;
  /** Called with the chosen or dropped file (validation is the caller's job). */
  onFile: (file: File | null) => void;
  error?: string | null;
  /** Compact = inside the modal; default = the big dropzone on /uploads. */
  compact?: boolean;
}

/** Drag-and-drop area with a Browse button. Shows the chosen file's name and size. */
export function FileDropzone({ file, onFile, error, compact }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const pick = (files: FileList | null) => {
    const first = files?.[0];
    if (first) onFile(first);
  };
  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    pick(event.dataTransfer.files);
  };

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center rounded-lg border border-dashed text-center transition-colors",
          compact ? "px-4 py-8" : "px-6 py-12",
          dragging ? "border-brand bg-brand-soft" : "border-brand/40 bg-surface",
          error && "border-destructive/60",
        )}
      >
        <Upload className="mb-3 size-6 text-text-secondary" aria-hidden="true" />
        <h3 className="font-heading text-[15px] font-medium text-text-primary">Upload a file to generate a transcript</h3>
        <p className="mt-2 max-w-md text-xs leading-relaxed text-text-tertiary">
          Browse or drag and drop <strong className="text-text-secondary">.TXT</strong>, <strong className="text-text-secondary">.VTT</strong> or{" "}
          <strong className="text-text-secondary">.JSON</strong> transcript files. (Max file size: 5&nbsp;MB)
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(",")}
          className="sr-only"
          aria-label="Choose a transcript file"
          onChange={(event) => {
            pick(event.target.files);
            event.target.value = ""; // allow choosing the same file again after an error
          }}
        />
        <Button type="button" className="mt-4" onClick={() => inputRef.current?.click()}>
          Browse Files
        </Button>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}
      {file && !error && (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-surface-subtle px-3 py-2">
          <FileText className="size-4 shrink-0 text-text-tertiary" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">{file.name}</span>
          <span className="shrink-0 text-xs text-text-tertiary">{formatBytes(file.size)}</span>
          <Button type="button" variant="ghost" size="icon-xs" aria-label="Remove file" onClick={() => onFile(null)}>
            <X aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  );
}
