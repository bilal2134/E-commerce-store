"use client";

import { startTransition, useActionState, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Panel } from "@/components/admin/ui";
import { StatusMessage } from "@/components/admin/status-message";
import { prepareImageForUpload } from "@/components/admin/prepare-image";
import { fieldErrorsFrom } from "@/domain/validation/common";
import {
  settingsSchema,
  settingsValuesFromFormData,
  type SettingsFormValues,
} from "@/domain/validation/settings";
import { saveSettingsAction } from "../actions";
import { FaqEditor, SizeChartEditor } from "./list-editors";

export function SettingsForm({
  initial,
  version,
  heroImageUrl,
}: {
  initial: SettingsFormValues;
  /** Changes after every save so the fields remount with the stored (normalised) values. */
  version: string;
  heroImageUrl: string | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, run, pending] = useActionState(saveSettingsAction, null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [attempted, setAttempted] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [seen, setSeen] = useState(state);
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});
  if (state !== seen) {
    setSeen(state);
    setDismissed({});
  }
  const serverErrors = (state && !state.ok ? state.fieldErrors : undefined) ?? {};

  function validate(): Record<string, string> {
    const form = formRef.current;
    if (!form) return {};
    const parsed = settingsSchema.safeParse(settingsValuesFromFormData(new FormData(form)));
    const next = parsed.success ? {} : fieldErrorsFrom(parsed.error);
    setErrors(next);
    return next;
  }

  const shown = (name: string): string | undefined => {
    const c = errors[name];
    if (c && (attempted || touched[name])) return c;
    if (!c && !dismissed[name]) return serverErrors[name];
    return undefined;
  };
  // Group errors (faq.0.question, ...) are shown when attempted.
  const listErrors: Record<string, string> = {};
  for (const [k, msg] of Object.entries({ ...serverErrors, ...(attempted ? errors : {}) })) {
    if (k.startsWith("faq.") || k.startsWith("sizeChart.")) listErrors[k] = msg;
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setAttempted(true);
    const found = validate();
    if (Object.keys(found).length > 0) {
      requestAnimationFrame(() => form.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
      return;
    }
    const data = new FormData(form);
    void (async () => {
      const file = data.get("heroImage");
      if (file instanceof File && file.size > 0) {
        setPreparing(true);
        try {
          data.set("heroImage", await prepareImageForUpload(file));
        } catch {
          // Fall back to the original file; the server validates and re-encodes it anyway.
        }
        setPreparing(false);
      }
      startTransition(() => run(data));
    })();
  }

  const fieldProps = (name: keyof SettingsFormValues) => ({
    name,
    defaultValue: String(initial[name] ?? ""),
    onBlur: () => setTouched((t) => ({ ...t, [name]: true })),
    onChange: () => {
      setDismissed((d) => ({ ...d, [name]: true }));
      validate();
    },
  });

  const busy = pending || preparing;

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      className="space-y-6"
      aria-label="Site settings"
      encType="multipart/form-data"
    >
      <div key={version} className="space-y-6">
        <Section id="whatsapp" title="Contact and social">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              id="whatsappNumber"
              label="WhatsApp number"
              error={shown("whatsappNumber")}
              hint="Customers are sent here to order. Type it any way you like, for example 0300 1234567. It is stored with the country code."
              className="sm:col-span-2"
            >
              {(aria) => <Input {...aria} {...fieldProps("whatsappNumber")} type="tel" autoComplete="off" />}
            </Field>
            <Field
              id="instagramHandle"
              label="Instagram handle"
              error={shown("instagramHandle")}
              hint="Without the @"
            >
              {(aria) => <Input {...aria} {...fieldProps("instagramHandle")} autoCapitalize="none" />}
            </Field>
            <Field
              id="collabInstagramHandle"
              label="Collaboration partner handle"
              error={shown("collabInstagramHandle")}
              hint="Default for products marked as collab items."
            >
              {(aria) => <Input {...aria} {...fieldProps("collabInstagramHandle")} autoCapitalize="none" />}
            </Field>
          </div>
        </Section>

        <Section title="Announcement bar" description="A slim message shown at the top of every page.">
          <div className="space-y-5">
            <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                name="announcementEnabled"
                defaultChecked={initial.announcementEnabled}
                onChange={validate}
                className="size-4 accent-cherry"
              />
              Show the announcement bar
            </label>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="announcementText" label="Text" error={shown("announcementText")}>
                {(aria) => <Input {...aria} {...fieldProps("announcementText")} maxLength={200} />}
              </Field>
              <Field
                id="announcementHref"
                label="Link"
                error={shown("announcementHref")}
                hint="Optional. A path like /shop or a full https:// link."
              >
                {(aria) => <Input {...aria} {...fieldProps("announcementHref")} autoCapitalize="none" />}
              </Field>
            </div>
          </div>
        </Section>

        <Section id="hero" title="Homepage banner" description="The large banner at the top of the homepage.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="heroEyebrow" label="Small heading" error={shown("heroEyebrow")}>
              {(aria) => <Input {...aria} {...fieldProps("heroEyebrow")} />}
            </Field>
            <Field id="heroTitle" label="Title" error={shown("heroTitle")}>
              {(aria) => <Input {...aria} {...fieldProps("heroTitle")} />}
            </Field>
            <Field id="heroSubtitle" label="Subtitle" error={shown("heroSubtitle")} className="sm:col-span-2">
              {(aria) => <Textarea {...aria} {...fieldProps("heroSubtitle")} className="min-h-20" />}
            </Field>
            <Field id="heroCtaLabel" label="Button label" error={shown("heroCtaLabel")}>
              {(aria) => <Input {...aria} {...fieldProps("heroCtaLabel")} />}
            </Field>
            <Field
              id="heroCtaHref"
              label="Button link"
              error={shown("heroCtaHref")}
              hint="A path like /shop or a full https:// link."
            >
              {(aria) => <Input {...aria} {...fieldProps("heroCtaHref")} autoCapitalize="none" />}
            </Field>
            <div className="sm:col-span-2">
              <p className="text-sm font-medium">Banner image</p>
              {heroImageUrl ? (
                <div className="mt-2 flex flex-wrap items-start gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element -- pre-generated WebP variants */}
                  <img
                    src={heroImageUrl}
                    alt="Current banner"
                    className="h-32 w-auto max-w-full rounded-xs bg-blush object-cover"
                  />
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="removeHeroImage"
                      className="size-4 accent-cherry"
                      onChange={validate}
                    />
                    Remove the current image
                  </label>
                </div>
              ) : (
                <p className="mt-1 text-sm text-muted">No banner image yet.</p>
              )}
              <div className="mt-3">
                <label htmlFor="heroImage" className="block text-sm text-ink-soft">
                  {heroImageUrl ? "Replace image" : "Upload image"} (JPEG, PNG or WebP, up to 10 MB)
                </label>
                <Input
                  id="heroImage"
                  name="heroImage"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="mt-1.5 h-auto max-w-md py-2 file:me-3 file:rounded-sm file:border-0 file:bg-blush file:px-3 file:py-1.5 file:text-sm"
                />
              </div>
              <Field
                id="heroImageAlt"
                label="Image description (alt text)"
                error={shown("heroImageAlt")}
                className="mt-4 max-w-md"
                hint="Describe the image for people using screen readers."
              >
                {(aria) => <Input {...aria} {...fieldProps("heroImageAlt")} />}
              </Field>
            </div>
          </div>
        </Section>

        <Section title="Collaboration banner" description="Promotes your collab collection on the homepage.">
          <div className="grid gap-5">
            <Field id="collabTitle" label="Title" error={shown("collabTitle")}>
              {(aria) => <Input {...aria} {...fieldProps("collabTitle")} />}
            </Field>
            <Field id="collabBody" label="Text" error={shown("collabBody")}>
              {(aria) => <Textarea {...aria} {...fieldProps("collabBody")} className="min-h-20" />}
            </Field>
          </div>
        </Section>

        <Section title="Delivery and preorders">
          <div className="grid gap-5">
            <Field
              id="deliverySummary"
              label="Delivery summary"
              error={shown("deliverySummary")}
              hint="One short line shown on product pages."
            >
              {(aria) => <Input {...aria} {...fieldProps("deliverySummary")} />}
            </Field>
            <Field id="deliveryDetails" label="Delivery details" error={shown("deliveryDetails")}>
              {(aria) => <Textarea {...aria} {...fieldProps("deliveryDetails")} />}
            </Field>
            <Field
              id="preorderNote"
              label="Preorder note"
              error={shown("preorderNote")}
              hint="Shown on products marked Preorder."
            >
              {(aria) => <Textarea {...aria} {...fieldProps("preorderNote")} className="min-h-20" />}
            </Field>
          </div>
        </Section>

        <Section title="About">
          <Field
            id="aboutBody"
            label="About text"
            error={shown("aboutBody")}
            hint="Separate paragraphs with a blank line."
          >
            {(aria) => <Textarea {...aria} {...fieldProps("aboutBody")} className="min-h-40" />}
          </Field>
        </Section>

        <Section
          id="faq"
          title="Frequently asked questions"
          description="Shown on the FAQ page, in the order below."
        >
          <FaqEditor initial={initial.faq} errors={listErrors} />
        </Section>

        <Section title="Size guide">
          <div className="space-y-6">
            <SizeChartEditor initial={initial.sizeChart} errors={listErrors} />
            <Field id="sizeGuideNote" label="Size guide note" error={shown("sizeGuideNote")}>
              {(aria) => <Textarea {...aria} {...fieldProps("sizeGuideNote")} className="min-h-20" />}
            </Field>
          </div>
        </Section>
      </div>

      <div className="sticky bottom-0 z-20 -mx-4 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:mx-0 lg:rounded-sm lg:border">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-h-9 sm:flex-1">
            <StatusMessage result={state} successFallback="Settings saved" />
            {attempted && Object.keys(errors).length > 0 && !state ? (
              <p role="alert" className="text-sm font-medium text-danger">
                Fix the highlighted fields and save again.
              </p>
            ) : null}
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function Section({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Panel id={id} title={title} description={description} className="scroll-mt-20">
      {children}
    </Panel>
  );
}
