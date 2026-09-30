"use client";

import { useState } from "react";
import { StatusMessage } from "@/components/admin/status-message";
import { Panel } from "@/components/admin/ui";
import { useActionForm } from "@/components/admin/use-action-form";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { ArrowDownIcon, ArrowUpIcon, TrashIcon } from "@/components/ui/icons";
import type { ActionResult } from "@/domain/validation/result";
import type { AdminCategory } from "@/server/admin/categories";
import {
  createCategoryAction,
  deleteCategoryAction,
  moveCategoryAction,
  updateCategoryAction,
} from "../actions";

const iconButton = "size-11 px-0 md:size-9";

export function CategoriesManager({ tree }: { tree: AdminCategory[] }) {
  const [listResult, setListResult] = useState<ActionResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<AdminCategory | null>(null);

  async function run(fn: () => Promise<ActionResult>) {
    setBusy(true);
    setListResult(await fn());
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      <StatusMessage result={listResult} />
      {tree.map((root, ri) => (
        <Panel
          key={root.id}
          title={`${root.name} (${root.productCount})`}
          description={`/shop/${root.slug}`}
          action={
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                className={iconButton}
                aria-label={`Move ${root.name} earlier`}
                disabled={busy || ri === 0}
                onClick={() => run(() => moveCategoryAction(root.id, "up"))}
              >
                <ArrowUpIcon size={16} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className={iconButton}
                aria-label={`Move ${root.name} later`}
                disabled={busy || ri === tree.length - 1}
                onClick={() => run(() => moveCategoryAction(root.id, "down"))}
              >
                <ArrowDownIcon size={16} />
              </Button>
            </div>
          }
        >
          <CategoryDetailsForm category={root} />
          <h3 className="mt-6 mb-2 text-sm font-semibold">Sub-categories</h3>
          <ul className="divide-y divide-line border-y border-line">
            {root.children.map((child, ci) => (
              <li key={child.id} className="py-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-ink-soft">
                    <span className="font-medium text-ink">/shop/{child.slug}</span>, {child.productCount}{" "}
                    {child.productCount === 1 ? "product" : "products"}
                  </p>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className={iconButton}
                      aria-label={`Move ${child.name} earlier`}
                      disabled={busy || ci === 0}
                      onClick={() => run(() => moveCategoryAction(child.id, "up"))}
                    >
                      <ArrowUpIcon size={16} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className={iconButton}
                      aria-label={`Move ${child.name} later`}
                      disabled={busy || ci === root.children.length - 1}
                      onClick={() => run(() => moveCategoryAction(child.id, "down"))}
                    >
                      <ArrowDownIcon size={16} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className={iconButton}
                      aria-label={`Delete ${child.name}`}
                      disabled={busy}
                      style={{ color: "var(--color-danger)" }}
                      onClick={() => setToDelete(child)}
                    >
                      <TrashIcon size={16} />
                    </Button>
                  </div>
                </div>
                <CategoryDetailsForm category={child} />
              </li>
            ))}
          </ul>
        </Panel>
      ))}

      <NewCategoryForm roots={tree} />

      <ConfirmDialog
        open={toDelete !== null}
        title={`Delete ${toDelete?.name ?? "category"}?`}
        confirmLabel="Delete category"
        pending={busy}
        onConfirm={async () => {
          const target = toDelete;
          setToDelete(null);
          if (target) await run(() => deleteCategoryAction(target.id));
        }}
        onCancel={() => setToDelete(null)}
      >
        Only empty categories can be deleted. Its link stops working.
      </ConfirmDialog>
    </div>
  );
}

function CategoryDetailsForm({ category }: { category: AdminCategory }) {
  const { state, pending, onSubmit, fieldErrors } = useActionForm(updateCategoryAction);
  const id = `cat-${category.id}`;
  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-label={`Edit ${category.name}`}
      className="grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end"
    >
      <input type="hidden" name="id" value={category.id} />
      <Field id={`${id}-name`} label="Name" required error={fieldErrors.name}>
        {(aria) => <Input {...aria} name="name" defaultValue={category.name} maxLength={60} />}
      </Field>
      <Field id={`${id}-desc`} label="Description" error={fieldErrors.description}>
        {(aria) => <Input {...aria} name="description" defaultValue={category.description} maxLength={300} />}
      </Field>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
      <StatusMessage result={state} className="sm:col-span-3" />
    </form>
  );
}

function NewCategoryForm({ roots }: { roots: AdminCategory[] }) {
  const { state, pending, onSubmit, fieldErrors } = useActionForm(createCategoryAction);
  return (
    <Panel
      title="Add a sub-category"
      description="New sub-categories appear in the shop menu and get their own page."
    >
      <form
        onSubmit={onSubmit}
        noValidate
        aria-label="Add sub-category"
        className="grid gap-4 sm:grid-cols-2"
      >
        <Field id="new-parent" label="Section" required error={fieldErrors.parentId}>
          {(aria) => (
            <Select {...aria} name="parentId" defaultValue="">
              <option value="" disabled>
                Choose a section
              </option>
              {roots.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field id="new-name" label="Name" required error={fieldErrors.name}>
          {(aria) => <Input {...aria} name="name" maxLength={60} />}
        </Field>
        <Field
          id="new-slug"
          label="Link"
          required
          error={fieldErrors.slug}
          hint="Shown as /shop/your-link. Can't be changed later."
        >
          {(aria) => <Input {...aria} name="slug" maxLength={40} autoCapitalize="none" spellCheck={false} />}
        </Field>
        <Field id="new-desc" label="Description" error={fieldErrors.description}>
          {(aria) => <Textarea {...aria} name="description" rows={2} maxLength={300} />}
        </Field>
        <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
          <StatusMessage result={state} />
          <Button type="submit" disabled={pending}>
            {pending ? "Adding…" : "Add sub-category"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
