"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useId, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { ArrowDownIcon, ArrowUpIcon, GripIcon, TrashIcon, UploadIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/field";
import { isAcceptedImageType, prepareImageForUpload } from "@/components/admin/prepare-image";
import { MAX_PRODUCT_IMAGES, MIN_PRODUCT_IMAGES } from "@/domain/catalog";
import type { ProductImageDraft } from "@/domain/validation/product";
import { cn } from "@/lib/cn";
import { discardProductImageAction, uploadProductImageAction } from "../actions";

type Upload = { id: string; name: string; status: "preparing" | "uploading" | "error"; error?: string };

export function ProductImagesField({
  images,
  setImages,
  error,
  onBusyChange,
}: {
  images: ProductImageDraft[];
  setImages: Dispatch<SetStateAction<ProductImageDraft[]>>;
  error?: string;
  onBusyChange: (busy: boolean) => void;
}) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [announce, setAnnounce] = useState("");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const busy = uploads.some((u) => u.status !== "error");
  useEffect(() => onBusyChange(busy), [busy, onBusyChange]);

  const slotsLeft = MAX_PRODUCT_IMAGES - images.length - uploads.filter((u) => u.status !== "error").length;

  async function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    const files = Array.from(fileList).slice(0, Math.max(0, slotsLeft));
    if (fileList.length > files.length) {
      setAnnounce(`Only ${MAX_PRODUCT_IMAGES} photos are allowed. Extra files were skipped.`);
    }
    if (fileRef.current) fileRef.current.value = "";
    for (const file of files) {
      const id = crypto.randomUUID();
      const patch = (p: Partial<Upload>) =>
        setUploads((list) => list.map((u) => (u.id === id ? { ...u, ...p } : u)));
      setUploads((list) => [...list, { id, name: file.name, status: "preparing" }]);
      try {
        if (!isAcceptedImageType(file)) throw new Error("Use a JPEG, PNG or WebP photo.");
        const prepared = await prepareImageForUpload(file);
        patch({ status: "uploading" });
        const body = new FormData();
        body.append("file", prepared);
        const res = await uploadProductImageAction(body);
        if (!res.ok) throw new Error(res.error);
        setImages((list) => [...list, { ...res.image, alt: "" }]);
        setUploads((list) => list.filter((u) => u.id !== id));
        setAnnounce(`${file.name} uploaded`);
      } catch (err) {
        patch({ status: "error", error: err instanceof Error ? err.message : "Upload failed." });
      }
    }
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= images.length) return;
    setImages((list) => arrayMove(list, from, to));
    setAnnounce(`Photo moved to position ${to + 1}${to === 0 ? ", now the thumbnail" : ""}`);
  }

  function remove(index: number) {
    const img = images[index];
    if (!img) return;
    setImages((list) => list.filter((_, i) => i !== index));
    setAnnounce(`Photo ${index + 1} removed`);
    void discardProductImageAction({ storageKey: img.storageKey, widths: img.widths });
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = images.findIndex((i) => i.storageKey === active.id);
    const to = images.findIndex((i) => i.storageKey === over.id);
    if (from >= 0 && to >= 0) move(from, to);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">
          {images.length} of {MAX_PRODUCT_IMAGES} photos. The first photo is the thumbnail. Visible products
          need at least {MIN_PRODUCT_IMAGES}.
        </p>
        <div>
          <input
            ref={fileRef}
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            aria-label="Add photos"
            className="sr-only"
            data-testid="product-image-input"
            disabled={slotsLeft <= 0}
            onChange={(e) => void handleFiles(e.target.files)}
          />
          <Button
            variant="secondary"
            disabled={slotsLeft <= 0}
            onClick={() => fileRef.current?.click()}
            aria-describedby={error ? `${inputId}-error` : undefined}
          >
            <UploadIcon size={18} />
            Add photos
          </Button>
        </div>
      </div>

      <div aria-live="polite" className="sr-only">
        {announce}
      </div>

      {images.length > 0 || uploads.length > 0 ? (
        <DndContext
          id="product-images-dnd"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext items={images.map((i) => i.storageKey)} strategy={rectSortingStrategy}>
            <ol className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {images.map((img, index) => (
                <SortableTile
                  key={img.storageKey}
                  image={img}
                  index={index}
                  total={images.length}
                  onMove={move}
                  onRemove={remove}
                  onAlt={(alt) =>
                    setImages((list) =>
                      list.map((i) => (i.storageKey === img.storageKey ? { ...i, alt } : i)),
                    )
                  }
                />
              ))}
              {uploads.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center gap-3 rounded-sm border border-dashed border-line-strong p-3"
                >
                  <div className="h-20 w-16 shrink-0 animate-pulse rounded-xs bg-blush" aria-hidden="true" />
                  <div className="min-w-0 text-sm">
                    <p className="truncate font-medium">{u.name}</p>
                    {u.status === "error" ? (
                      <>
                        <p role="alert" className="text-danger">
                          {u.error}
                        </p>
                        <button
                          type="button"
                          className="mt-1 min-h-8 font-medium text-cherry underline underline-offset-4"
                          onClick={() => setUploads((list) => list.filter((x) => x.id !== u.id))}
                        >
                          Dismiss
                        </button>
                      </>
                    ) : (
                      <p role="status" className="text-ink-soft">
                        {u.status === "preparing" ? "Preparing photo…" : "Uploading…"}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="mt-4 rounded-sm border border-dashed border-line-strong px-4 py-8 text-center text-sm text-muted">
          No photos yet. Add JPEG, PNG or WebP photos; they are resized automatically.
        </div>
      )}

      {error ? (
        <p id={`${inputId}-error`} role="alert" className="mt-2 text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function SortableTile({
  image,
  index,
  total,
  onMove,
  onRemove,
  onAlt,
}: {
  image: ProductImageDraft;
  index: number;
  total: number;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
  onAlt: (alt: string) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: image.storageKey });
  const n = index + 1;
  const iconBtn =
    "inline-flex size-11 items-center justify-center rounded-sm border border-line-strong bg-surface text-ink hover:border-ink disabled:opacity-40 disabled:hover:border-line-strong";
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "rounded-sm border border-line bg-surface p-3",
        isDragging && "relative z-10 shadow-overlay",
      )}
    >
      <div className="flex gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- pre-generated WebP variants */}
        <img
          src={image.previewUrl}
          alt=""
          className="h-28 w-[5.5rem] shrink-0 rounded-xs bg-blush object-cover"
          draggable={false}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{index === 0 ? "Photo 1 · Thumbnail" : `Photo ${n}`}</p>
          <label className="mt-1 block text-xs text-muted" htmlFor={`alt-${image.storageKey}`}>
            Alt text (describes the photo for screen readers)
          </label>
          <Input
            id={`alt-${image.storageKey}`}
            value={image.alt}
            maxLength={200}
            onChange={(e) => onAlt(e.target.value)}
            className="mt-1 h-10 text-sm"
            placeholder="Optional"
          />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          ref={setActivatorNodeRef}
          className={cn(iconBtn, "cursor-grab touch-none")}
          aria-label={`Drag photo ${n} to reorder`}
          {...attributes}
          {...listeners}
        >
          <GripIcon size={18} />
        </button>
        <button
          type="button"
          className={iconBtn}
          disabled={index === 0}
          onClick={() => onMove(index, index - 1)}
          aria-label={`Move photo ${n} earlier`}
        >
          <ArrowUpIcon size={18} />
        </button>
        <button
          type="button"
          className={iconBtn}
          disabled={index === total - 1}
          onClick={() => onMove(index, index + 1)}
          aria-label={`Move photo ${n} later`}
        >
          <ArrowDownIcon size={18} />
        </button>
        <button
          type="button"
          className={cn(iconBtn, "ms-auto text-danger")}
          onClick={() => onRemove(index)}
          aria-label={`Remove photo ${n}`}
        >
          <TrashIcon size={18} />
        </button>
      </div>
    </li>
  );
}
