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
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { ArrowDownIcon, ArrowUpIcon, GripIcon, MinusIcon } from "@/components/ui/icons";
import { EmptyState, Panel, Thumb } from "@/components/admin/ui";
import { StatusMessage } from "@/components/admin/status-message";
import type { ActionResult } from "@/domain/validation/result";
import { cn } from "@/lib/cn";
import { addFeaturedAction, removeFeaturedAction, setFeaturedOrderAction } from "../actions";

export interface FeaturedItem {
  id: string;
  name: string;
  code: string;
  isVisible: boolean;
  soldOut: boolean;
  thumbUrl: string | null;
}

export function FeaturedManager({
  items,
  candidates,
}: {
  items: FeaturedItem[];
  candidates: { id: string; name: string; code: string }[];
}) {
  const [prevItems, setPrevItems] = useState(items);
  const [list, setList] = useState(items);
  if (items !== prevItems) {
    setPrevItems(items);
    setList(items);
  }
  const [message, setMessage] = useState<ActionResult | null>(null);
  const [announce, setAnnounce] = useState("");
  const [busy, setBusy] = useState(false);
  const [pick, setPick] = useState("");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function persist(next: FeaturedItem[], previous: FeaturedItem[], moved: string, to: number) {
    setList(next);
    setAnnounce(`${moved} moved to position ${to + 1} of ${next.length}`);
    setBusy(true);
    const result = await setFeaturedOrderAction(next.map((i) => i.id));
    setBusy(false);
    if (!result.ok) setList(previous);
    setMessage(result);
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= list.length) return;
    const item = list[from];
    if (!item) return;
    void persist(arrayMove(list, from, to), list, item.name, to);
  }

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const from = list.findIndex((i) => i.id === e.active.id);
    const to = list.findIndex((i) => i.id === e.over!.id);
    if (from >= 0 && to >= 0) move(from, to);
  }

  async function remove(item: FeaturedItem) {
    setBusy(true);
    const result = await removeFeaturedAction(item.id);
    setBusy(false);
    setMessage(result);
    if (result.ok) setAnnounce(`${item.name} removed from the homepage`);
  }

  async function add() {
    if (!pick) return;
    setBusy(true);
    const result = await addFeaturedAction(pick);
    setBusy(false);
    setMessage(result);
    if (result.ok) setPick("");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div>
        <StatusMessage result={message} className="mb-3" />
        <div aria-live="polite" className="sr-only">
          {announce}
        </div>
        {list.length === 0 ? (
          <EmptyState title="Nothing featured yet">
            Add products from the panel, or tick “Featured on homepage” when editing a product.
          </EmptyState>
        ) : (
          <DndContext
            id="featured-dnd"
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext items={list.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <ol className="space-y-2" aria-label="Featured products in homepage order">
                {list.map((item, index) => (
                  <Row
                    key={item.id}
                    item={item}
                    index={index}
                    total={list.length}
                    disabled={busy}
                    onMove={move}
                    onRemove={remove}
                  />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <Panel title="Add a product" description="Only visible products can be added here.">
        {candidates.length === 0 ? (
          <p className="text-sm text-muted">Every visible product is already featured.</p>
        ) : (
          <div className="space-y-3">
            <Field id="feature-pick" label="Product">
              {(aria) => (
                <Select {...aria} value={pick} onChange={(e) => setPick(e.target.value)}>
                  <option value="">Choose a product</option>
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Button onClick={add} disabled={!pick || busy} variant="secondary">
              Add to homepage
            </Button>
          </div>
        )}
      </Panel>
    </div>
  );
}

function Row({
  item,
  index,
  total,
  disabled,
  onMove,
  onRemove,
}: {
  item: FeaturedItem;
  index: number;
  total: number;
  disabled: boolean;
  onMove: (from: number, to: number) => void;
  onRemove: (item: FeaturedItem) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({
      id: item.id,
    });
  const btn =
    "inline-flex size-11 items-center justify-center rounded-sm border border-line-strong bg-surface hover:border-ink disabled:opacity-40 disabled:hover:border-line-strong";
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-sm border border-line bg-surface p-3",
        isDragging && "relative z-10 shadow-overlay",
      )}
    >
      <span className="w-6 text-center text-sm font-medium text-muted tabular-nums">{index + 1}</span>
      <Thumb src={item.thumbUrl} className="h-14 w-11 shrink-0 rounded-xs" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{item.name}</p>
        <p className="text-xs text-muted">
          {item.code}
          {!item.isVisible ? " · Hidden, so not shown on the homepage" : ""}
          {item.soldOut ? " · Out of stock" : ""}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          ref={setActivatorNodeRef}
          className={cn(btn, "cursor-grab touch-none")}
          aria-label={`Drag ${item.name} to reorder`}
          {...attributes}
          {...listeners}
        >
          <GripIcon size={18} />
        </button>
        <button
          type="button"
          className={btn}
          disabled={disabled || index === 0}
          onClick={() => onMove(index, index - 1)}
          aria-label={`Move ${item.name} up`}
        >
          <ArrowUpIcon size={18} />
        </button>
        <button
          type="button"
          className={btn}
          disabled={disabled || index === total - 1}
          onClick={() => onMove(index, index + 1)}
          aria-label={`Move ${item.name} down`}
        >
          <ArrowDownIcon size={18} />
        </button>
        <button
          type="button"
          className={cn(btn, "text-danger")}
          disabled={disabled}
          onClick={() => onRemove(item)}
          aria-label={`Remove ${item.name} from homepage`}
        >
          <MinusIcon size={18} />
        </button>
      </div>
    </li>
  );
}
