"use client";

// The recurring-templates screen: a create form above a list of template rows.
// Originally one ~24KB file; split into app/(app)/recurring/components/ (shared
// types/styles, icons, form fields, StatusBadge, CreateForm, TemplateRow) so each
// piece fits comfortably in one read. This file is now just the composition root
// — its public interface (default export + CategoryOption/TemplateDTO types) is
// unchanged, so app/(app)/recurring/page.tsx didn't need to change at all.

import Link from "next/link";
import { CreateForm } from "./components/CreateForm";
import { TemplateRow } from "./components/TemplateRow";
import type { CategoryOption, TemplateDTO } from "./components/shared";

export type { CategoryOption, TemplateDTO } from "./components/shared";

export default function RecurringManager({
  categories,
  templates,
}: {
  categories: CategoryOption[];
  templates: TemplateDTO[];
}) {
  if (categories.length === 0) {
    return (
      <p className="rounded-card bg-card p-5 text-[13px] text-secondary shadow-card">
        Add a known-expense, savings, or discretionary category first under{" "}
        <Link href="/categories" className="atlas-focus-ring font-semibold text-teal">
          Categories
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-card bg-card p-[18px_20px] shadow-card">
        <CreateForm categories={categories} />
      </div>
      <div className="rounded-card bg-card p-[18px_20px] shadow-card">
        {templates.length === 0 ? (
          <p className="py-2 text-[13px] text-faint">
            No recurring templates yet. Add one above and it will generate an item
            in each due month automatically.
          </p>
        ) : (
          templates.map((t) => (
            <TemplateRow key={t.id} template={t} categories={categories} />
          ))
        )}
      </div>
    </div>
  );
}
