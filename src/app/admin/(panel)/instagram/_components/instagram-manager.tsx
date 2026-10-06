"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { StatusMessage } from "@/components/admin/status-message";
import { Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { ArrowDownIcon, ArrowUpIcon, TrashIcon } from "@/components/ui/icons";
import { fieldErrorsFrom } from "@/domain/validation/common";
import { instagramPostFromFormData, instagramPostSchema } from "@/domain/validation/instagram";
import { preparePhotoField } from "@/components/admin/prepare-image";
import type { ActionResult } from "@/domain/validation/result";
import { createInstagramPostAction, deleteInstagramPostAction, moveInstagramPostAction } from "../actions";

export interface InstagramPostView {
  id: string;
  postUrl: string;
  alt: string;
  thumbUrl: string | null;
}

export function InstagramManager({ posts, max }: { posts: InstagramPostView[]; max: number }) {
  const [state, run, pending] = useActionState(createInstagramPostAction, null);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [version, setVersion] = useState(0);
  const [seen, setSeen] = useState(state);
  const [listResult, setListResult] = useState<ActionResult | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<InstagramPostView | null>(null);
  if (state !== seen) {
    setSeen(state);
    if (state?.ok) {
      setVersion((v) => v + 1);
      setClientErrors({});
    }
  }
  const serverErrors = (state && !state.ok ? state.fieldErrors : undefined) ?? {};
  const error = (f: string) => clientErrors[f] ?? serverErrors[f];
  const full = posts.length >= max;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = instagramPostSchema.safeParse(instagramPostFromFormData(fd));
    const errors = parsed.success ? {} : fieldErrorsFrom(parsed.error);
    const file = fd.get("image");
    if (!(file instanceof File) || file.size === 0) errors.image = "Choose an image for this post.";
    if (Object.keys(errors).length) {
      setClientErrors(errors);
      const form = e.currentTarget;
      requestAnimationFrame(() => form.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
      return;
    }
    setClientErrors({});
    const form = e.currentTarget;
    void (async () => {
      const photoError = await preparePhotoField(fd, "image");
      if (photoError) {
        setClientErrors({ image: photoError });
        requestAnimationFrame(() => form.querySelector<HTMLElement>("#ig-image")?.focus());
        return;
      }
      startTransition(() => run(fd));
    })();
  }

  async function move(post: InstagramPostView, direction: "up" | "down") {
    setBusy(post.id);
    setListResult(await moveInstagramPostAction(post.id, direction));
    setBusy(null);
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setBusy(toDelete.id);
    const result = await deleteInstagramPostAction(toDelete.id);
    setBusy(null);
    setToDelete(null);
    setListResult(result);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <Panel
        title="Add a post"
        description={full ? `All ${max} places are used. Remove a post to add another.` : undefined}
      >
        <form onSubmit={onSubmit} noValidate aria-label="Add Instagram post" className="space-y-4">
          <div key={version} className="space-y-4">
            <Field
              id="ig-url"
              label="Post link"
              required
              error={error("postUrl")}
              hint="For example https://www.instagram.com/p/ABC123/"
            >
              {(aria) => (
                <Input {...aria} name="postUrl" inputMode="url" autoComplete="off" disabled={full} />
              )}
            </Field>
            <Field
              id="ig-image"
              label="Post image"
              required
              error={error("image")}
              hint="JPEG, PNG or WebP up to 10 MB. Square images look best."
            >
              {(aria) => (
                <Input
                  {...aria}
                  name="image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={full}
                  className="h-auto py-2 file:me-3 file:rounded-sm file:border-0 file:bg-blush file:px-3 file:py-1.5 file:text-sm"
                />
              )}
            </Field>
            <Field
              id="ig-alt"
              label="Image description (alt text)"
              error={error("alt")}
              hint="Describe the photo for people using screen readers."
            >
              {(aria) => <Input {...aria} name="alt" maxLength={200} disabled={full} />}
            </Field>
          </div>
          <StatusMessage result={state} />
          <Button type="submit" disabled={pending || full}>
            {pending ? "Adding…" : "Add post"}
          </Button>
        </form>
      </Panel>

      <Panel title={`On the homepage (${posts.length} of ${max})`}>
        <StatusMessage result={listResult} className="mb-3" />
        {posts.length === 0 ? (
          <p className="text-sm text-ink-soft">
            No posts yet. Until you add some, the homepage shows a “Follow on Instagram” link only.
          </p>
        ) : (
          <ol aria-label="Instagram posts in homepage order" className="divide-y divide-line">
            {posts.map((post, i) => (
              <li key={post.id} className="flex items-center gap-3 py-3">
                {post.thumbUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- stored thumbnail variant
                  <img
                    src={post.thumbUrl}
                    alt=""
                    width={56}
                    height={56}
                    className="size-14 shrink-0 object-cover"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <a
                    href={post.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-sm font-medium text-ink underline underline-offset-4 hover:text-cherry"
                  >
                    {post.postUrl.replace("https://www.instagram.com", "")}
                  </a>
                  <p className="truncate text-xs text-muted">{post.alt || "No description"}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="size-11 px-0 md:size-9"
                    aria-label={`Move post ${i + 1} earlier`}
                    disabled={i === 0 || busy !== null}
                    onClick={() => move(post, "up")}
                  >
                    <ArrowUpIcon size={16} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="size-11 px-0 md:size-9"
                    aria-label={`Move post ${i + 1} later`}
                    disabled={i === posts.length - 1 || busy !== null}
                    onClick={() => move(post, "down")}
                  >
                    <ArrowDownIcon size={16} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="size-11 px-0 md:size-9"
                    aria-label={`Remove post ${i + 1}`}
                    style={{ color: "var(--color-danger)" }}
                    disabled={busy !== null}
                    onClick={() => setToDelete(post)}
                  >
                    <TrashIcon size={16} />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Panel>

      <ConfirmDialog
        open={toDelete !== null}
        title="Remove this post?"
        confirmLabel="Remove post"
        pending={busy !== null}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      >
        It disappears from the homepage. The post stays on Instagram.
      </ConfirmDialog>
    </div>
  );
}
