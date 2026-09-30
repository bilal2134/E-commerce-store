"use client";

import { StatusMessage } from "@/components/admin/status-message";
import { Panel } from "@/components/admin/ui";
import { useActionForm } from "@/components/admin/use-action-form";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import type { LocalizedTextField } from "@/domain/validation/localized-settings";
import { saveUrduSettingsAction } from "../actions";

const FIELDS: { key: LocalizedTextField; label: string; long?: boolean }[] = [
  { key: "announcementText", label: "Announcement bar" },
  { key: "heroEyebrow", label: "Banner small heading" },
  { key: "heroTitle", label: "Banner title" },
  { key: "heroSubtitle", label: "Banner subtitle", long: true },
  { key: "heroCtaLabel", label: "Banner button label" },
  { key: "collabTitle", label: "Collab title" },
  { key: "collabBody", label: "Collab text", long: true },
  { key: "deliverySummary", label: "Delivery summary" },
  { key: "deliveryDetails", label: "Delivery details", long: true },
  { key: "preorderNote", label: "Preorder note", long: true },
  { key: "aboutBody", label: "About text", long: true },
  { key: "sizeGuideNote", label: "Size guide note", long: true },
];

export interface UrduSettingsFormProps {
  english: Record<LocalizedTextField, string>;
  urdu: Partial<Record<LocalizedTextField, string>>;
  englishFaq: { question: string; answer: string }[];
  urduFaq: { question: string; answer: string }[];
}

/**
 * Urdu versions of owner text for /ur pages (CS-15). Anything left empty shows
 * the English text. The English value is shown as a reference under each field.
 */
export function UrduSettingsForm({ english, urdu, englishFaq, urduFaq }: UrduSettingsFormProps) {
  const { state, pending, onSubmit, fieldErrors } = useActionForm(saveUrduSettingsAction);
  return (
    <Panel
      className="mt-8"
      title="Urdu text (optional)"
      description="Shown on the Urdu site (/ur). Leave a field empty to show the English text there."
    >
      <form onSubmit={onSubmit} noValidate aria-label="Urdu text" className="space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          {FIELDS.map(({ key, label, long }) => (
            <Field
              key={key}
              id={`ur-${key}`}
              label={label}
              error={fieldErrors[key]}
              hint={
                english[key]
                  ? `English: ${english[key].slice(0, 140)}${english[key].length > 140 ? "…" : ""}`
                  : undefined
              }
              className={long ? "md:col-span-2" : undefined}
            >
              {(aria) =>
                long ? (
                  <Textarea
                    {...aria}
                    name={key}
                    lang="ur"
                    dir="rtl"
                    rows={3}
                    defaultValue={urdu[key] ?? ""}
                  />
                ) : (
                  <Input {...aria} name={key} lang="ur" dir="rtl" defaultValue={urdu[key] ?? ""} />
                )
              }
            </Field>
          ))}
        </div>

        {englishFaq.length ? (
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold">FAQ in Urdu</legend>
            {fieldErrors.faq ? <p className="text-sm font-medium text-danger">{fieldErrors.faq}</p> : null}
            {englishFaq.map((item, i) => (
              <div
                key={`${item.question}-${i}`}
                className="grid gap-3 rounded-sm border border-line p-3 md:grid-cols-2"
              >
                <p className="text-sm text-muted md:col-span-2">
                  English: <span className="text-ink-soft">{item.question}</span>
                </p>
                <Field id={`ur-faq-${i}-q`} label={`Urdu question ${i + 1}`}>
                  {(aria) => (
                    <Input
                      {...aria}
                      name={`faq.${i}.question`}
                      lang="ur"
                      dir="rtl"
                      defaultValue={
                        urduFaq[i]?.question !== item.question ? (urduFaq[i]?.question ?? "") : ""
                      }
                    />
                  )}
                </Field>
                <Field id={`ur-faq-${i}-a`} label={`Urdu answer ${i + 1}`}>
                  {(aria) => (
                    <Textarea
                      {...aria}
                      name={`faq.${i}.answer`}
                      lang="ur"
                      dir="rtl"
                      rows={2}
                      defaultValue={urduFaq[i]?.answer !== item.answer ? (urduFaq[i]?.answer ?? "") : ""}
                    />
                  )}
                </Field>
              </div>
            ))}
          </fieldset>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <StatusMessage result={state} />
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save Urdu text"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
