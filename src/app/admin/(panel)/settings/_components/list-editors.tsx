"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, TrashIcon } from "@/components/ui/icons";

const iconBtn =
  "inline-flex size-11 items-center justify-center rounded-sm border border-line-strong bg-surface hover:border-ink disabled:opacity-40 disabled:hover:border-line-strong";

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item as T);
  return next;
}

let counter = 0;
const nextKey = () => `k${++counter}`;

interface FaqDraft {
  key: string;
  question: string;
  answer: string;
}

export function FaqEditor({
  initial,
  errors,
}: {
  initial: { question: string; answer: string }[];
  errors: Record<string, string>;
}) {
  const [items, setItems] = useState<FaqDraft[]>(() => initial.map((i, n) => ({ ...i, key: `s${n}` })));
  const patch = (key: string, p: Partial<FaqDraft>) =>
    setItems((list) => list.map((i) => (i.key === key ? { ...i, ...p } : i)));

  return (
    <div>
      <input
        type="hidden"
        name="faq"
        value={JSON.stringify(items.map(({ question, answer }) => ({ question, answer })))}
      />
      {items.length === 0 ? (
        <p className="rounded-sm border border-dashed border-line-strong px-4 py-6 text-center text-sm text-muted">
          No questions yet. Customers often ask how to pay, so add a payment question.
        </p>
      ) : (
        <ol className="space-y-4">
          {items.map((item, i) => {
            const qErr = errors[`faq.${i}.question`];
            const aErr = errors[`faq.${i}.answer`];
            return (
              <li key={item.key} className="rounded-sm border border-line p-3">
                <div className="space-y-3">
                  <div>
                    <label htmlFor={`faq-q-${item.key}`} className="block text-sm font-medium">
                      Question {i + 1}
                    </label>
                    <Input
                      id={`faq-q-${item.key}`}
                      className="mt-1.5"
                      value={item.question}
                      aria-invalid={qErr ? true : undefined}
                      aria-describedby={qErr ? `faq-q-${item.key}-err` : undefined}
                      onChange={(e) => patch(item.key, { question: e.target.value })}
                    />
                    {qErr ? (
                      <p
                        id={`faq-q-${item.key}-err`}
                        role="alert"
                        className="mt-1.5 text-sm font-medium text-danger"
                      >
                        {qErr}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <label htmlFor={`faq-a-${item.key}`} className="block text-sm font-medium">
                      Answer {i + 1}
                    </label>
                    <Textarea
                      id={`faq-a-${item.key}`}
                      className="mt-1.5 min-h-20"
                      value={item.answer}
                      aria-invalid={aErr ? true : undefined}
                      aria-describedby={aErr ? `faq-a-${item.key}-err` : undefined}
                      onChange={(e) => patch(item.key, { answer: e.target.value })}
                    />
                    {aErr ? (
                      <p
                        id={`faq-a-${item.key}-err`}
                        role="alert"
                        className="mt-1.5 text-sm font-medium text-danger"
                      >
                        {aErr}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    className={iconBtn}
                    disabled={i === 0}
                    onClick={() => setItems((l) => move(l, i, i - 1))}
                    aria-label={`Move question ${i + 1} up`}
                  >
                    <ArrowUpIcon size={18} />
                  </button>
                  <button
                    type="button"
                    className={iconBtn}
                    disabled={i === items.length - 1}
                    onClick={() => setItems((l) => move(l, i, i + 1))}
                    aria-label={`Move question ${i + 1} down`}
                  >
                    <ArrowDownIcon size={18} />
                  </button>
                  <button
                    type="button"
                    className={`${iconBtn} ms-auto text-danger`}
                    onClick={() => setItems((l) => l.filter((x) => x.key !== item.key))}
                    aria-label={`Remove question ${i + 1}`}
                  >
                    <TrashIcon size={18} />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <Button
        variant="secondary"
        className="mt-4"
        onClick={() => setItems((l) => [...l, { key: nextKey(), question: "", answer: "" }])}
      >
        <PlusIcon size={18} />
        Add question
      </Button>
    </div>
  );
}

interface RowDraft {
  key: string;
  eu: string;
  uk: string;
  us: string;
  footLengthCm: string;
}

export function SizeChartEditor({
  initial,
  errors,
}: {
  initial: { eu: string; uk: string; us: string; footLengthCm: string }[];
  errors: Record<string, string>;
}) {
  const [rows, setRows] = useState<RowDraft[]>(() => initial.map((r, n) => ({ ...r, key: `s${n}` })));
  const patch = (key: string, p: Partial<RowDraft>) =>
    setRows((list) => list.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const cols: { field: keyof Omit<RowDraft, "key">; label: string }[] = [
    { field: "eu", label: "EU" },
    { field: "uk", label: "UK" },
    { field: "us", label: "US" },
    { field: "footLengthCm", label: "Foot length (cm)" },
  ];

  return (
    <div>
      <input
        type="hidden"
        name="sizeChart"
        value={JSON.stringify(rows.map(({ eu, uk, us, footLengthCm }) => ({ eu, uk, us, footLengthCm })))}
      />
      {rows.length === 0 ? (
        <p className="rounded-sm border border-dashed border-line-strong px-4 py-6 text-center text-sm text-muted">
          No size chart rows yet.
        </p>
      ) : (
        <ol className="space-y-3">
          {rows.map((row, i) => (
            <li key={row.key} className="rounded-sm border border-line p-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {cols.map((c) => {
                  const err = errors[`sizeChart.${i}.${c.field}`];
                  return (
                    <div key={c.field}>
                      <label htmlFor={`sc-${c.field}-${row.key}`} className="block text-sm font-medium">
                        {c.label}
                        <span className="sr-only"> for row {i + 1}</span>
                      </label>
                      <Input
                        id={`sc-${c.field}-${row.key}`}
                        className="mt-1.5"
                        value={row[c.field]}
                        aria-invalid={err ? true : undefined}
                        onChange={(e) => patch(row.key, { [c.field]: e.target.value })}
                      />
                      {err ? (
                        <p role="alert" className="mt-1 text-sm font-medium text-danger">
                          {err}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  className={iconBtn}
                  disabled={i === 0}
                  onClick={() => setRows((l) => move(l, i, i - 1))}
                  aria-label={`Move size row ${i + 1} up`}
                >
                  <ArrowUpIcon size={18} />
                </button>
                <button
                  type="button"
                  className={iconBtn}
                  disabled={i === rows.length - 1}
                  onClick={() => setRows((l) => move(l, i, i + 1))}
                  aria-label={`Move size row ${i + 1} down`}
                >
                  <ArrowDownIcon size={18} />
                </button>
                <button
                  type="button"
                  className={`${iconBtn} ms-auto text-danger`}
                  onClick={() => setRows((l) => l.filter((x) => x.key !== row.key))}
                  aria-label={`Remove size row ${i + 1}`}
                >
                  <TrashIcon size={18} />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
      <Button
        variant="secondary"
        className="mt-4"
        onClick={() => setRows((l) => [...l, { key: nextKey(), eu: "", uk: "", us: "", footLengthCm: "" }])}
      >
        <PlusIcon size={18} />
        Add row
      </Button>
    </div>
  );
}
