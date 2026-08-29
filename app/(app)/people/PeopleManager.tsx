"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { formatINR } from "@/lib/money";
import type { LedgerDirection } from "@/lib/constants";
import {
  addPerson,
  deletePerson,
  addEntry,
  markReceived,
  deleteEntry,
  type ActionState,
} from "./actions";

export type EntryDTO = {
  id: string;
  description: string;
  direction: LedgerDirection;
  amountPaise: number;
  pending: boolean;
};
export type PersonDTO = {
  id: string;
  name: string;
  netPaise: number;
  hasEntries: boolean;
  entries: EntryDTO[];
};

const inputCls =
  "atlas-focus-ring atlas-input rounded-[10px] border border-inputborder bg-inputbg px-3 py-2 text-[13px] outline-none";
const ghostBtn =
  "atlas-focus-ring atlas-touch rounded-[10px] px-3 text-[12px] font-semibold text-secondary transition-colors hover:bg-divider hover:text-strong";

function NetPill({ person }: { person: PersonDTO }) {
  let label: string;
  let color = "var(--color-teal)";
  let bg = "var(--color-mint-tint)";
  if (!person.hasEntries) {
    label = "no entries";
    color = "var(--color-faint2)";
    bg = "var(--color-divider)";
  } else if (person.netPaise === 0) {
    label = "settled";
  } else if (person.netPaise > 0) {
    label = `owes you ${formatINR(person.netPaise)}`;
  } else {
    label = `you owe ${formatINR(-person.netPaise)}`;
    color = "var(--color-clay)";
    bg = "var(--color-clay-tint)";
  }

  return (
    <span
      className="num inline-flex min-h-[32px] items-center rounded-full px-[10px] py-[4px] text-[12px] font-bold"
      style={{ color, background: bg }}
    >
      {label}
    </span>
  );
}

function EntryRow({ entry }: { entry: EntryDTO }) {
  const given = entry.direction === "GIVEN";
  const color = given ? "var(--color-clay)" : "var(--color-teal)";
  const tint = given ? "var(--color-clay-tint)" : "var(--color-mint-tint)";

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-divider py-[10px] sm:flex-nowrap sm:gap-3">
      <span
        className="flex h-[28px] w-[28px] flex-none items-center justify-center rounded-[8px] text-[13px]"
        style={{ color, background: tint }}
        title={given ? "Given" : "Received"}
        aria-hidden="true"
      >
        {given ? "↑" : "↓"}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px]">
          {entry.description || (
            <span className="text-faint">{given ? "Given" : "Received"}</span>
          )}
        </div>
        {entry.pending ? (
          <div className="mt-1 text-[11px] font-semibold text-clay">Pending</div>
        ) : null}
      </div>
      <div className="ml-auto flex w-full items-center justify-end gap-2 sm:w-auto">
        {entry.pending ? (
          <form action={markReceived}>
            <input type="hidden" name="id" value={entry.id} />
            <button
              type="submit"
              className="atlas-focus-ring atlas-touch rounded-full bg-divider px-[10px] text-[11px] font-bold text-teal transition-colors hover:bg-mint-tint"
            >
              Mark received
            </button>
          </form>
        ) : null}
        <span className="num text-[12.5px] font-bold" style={{ color }}>
          {formatINR(entry.amountPaise)}
        </span>
        <form action={deleteEntry}>
          <input type="hidden" name="id" value={entry.id} />
          <button
            type="submit"
            aria-label={`Delete ${entry.description || (given ? "given" : "received")} entry`}
            title="Delete entry"
            className="atlas-focus-ring atlas-icon-button text-[12px] text-icondim transition-colors hover:bg-clay-tint hover:text-clay"
          >
            ×
          </button>
        </form>
      </div>
    </div>
  );
}

function AddEntryForm({ personId, personName }: { personId: string; personName: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    addEntry,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);
  const directionId = useId();
  const descriptionId = useId();
  const amountId = useId();
  const pendingId = useId();

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={action} className="mt-4 border-t border-divider pt-4">
      <input type="hidden" name="personId" value={personId} />
      <div className="grid gap-3 md:grid-cols-[140px_minmax(0,1fr)_120px_auto_auto] md:items-end">
        <div className="min-w-0">
          <label htmlFor={directionId} className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-faint2">
            Direction
          </label>
          <select id={directionId} name="direction" defaultValue="GIVEN" className={`${inputCls} w-full`}>
            <option value="GIVEN">Given</option>
            <option value="RECEIVED">Received</option>
          </select>
        </div>
        <div className="min-w-0">
          <label htmlFor={descriptionId} className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-faint2">
            Description
          </label>
          <input
            id={descriptionId}
            name="description"
            placeholder="What was this for?"
            className={`${inputCls} w-full`}
          />
        </div>
        <div className="min-w-0">
          <label htmlFor={amountId} className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-faint2">
            Amount
          </label>
          <div className="flex min-h-[44px] items-center rounded-[10px] border border-inputborder bg-inputbg px-[8px]">
            <span className="text-[12px] text-faint2">₹</span>
            <input
              id={amountId}
              name="amount"
              type="number"
              min="0"
              step="1"
              placeholder="0"
              className="num w-full border-none bg-transparent px-1 py-2 text-right text-[13px] font-semibold outline-none"
            />
          </div>
        </div>
        <label htmlFor={pendingId} className="flex min-h-[44px] items-center gap-2 rounded-[10px] border border-inputborder px-3 text-[12px] font-medium text-secondary">
          <input id={pendingId} type="checkbox" name="pending" />
          Pending
        </label>
        <button
          type="submit"
          disabled={pending}
          className={`${ghostBtn} disabled:opacity-60`}
        >
          Add entry
        </button>
      </div>
      {state.error ? (
        <p className="mt-2 text-[12px] text-clay">
          {state.error} for {personName}.
        </p>
      ) : null}
    </form>
  );
}

function AddPersonForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    addPerson,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);
  const nameId = useId();

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={action} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <div className="min-w-0">
        <label htmlFor={nameId} className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-faint2">
          Person
        </label>
        <input
          id={nameId}
          name="name"
          placeholder="Add a person (e.g. Mummy)"
          className={`${inputCls} w-full`}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="atlas-focus-ring atlas-touch rounded-[10px] bg-teal px-4 text-[13.5px] font-bold text-white transition-colors hover:bg-teal-hover disabled:opacity-60"
      >
        Add person
      </button>
      {state.error ? (
        <span className="sm:col-span-2 text-[12.5px] text-clay">{state.error}</span>
      ) : null}
    </form>
  );
}

export default function PeopleManager({ people }: { people: PersonDTO[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-card bg-card p-[18px_20px] shadow-card">
        <AddPersonForm />
      </div>
      {people.map((person) => (
        <div key={person.id} className="rounded-card bg-card p-[18px_20px] shadow-card">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span className="text-[14.5px] font-bold">{person.name}</span>
            <NetPill person={person} />
            <form action={deletePerson} className="ml-auto">
              <input type="hidden" name="id" value={person.id} />
              <button
                type="submit"
                aria-label={`Delete ${person.name}`}
                title="Delete person"
                className="atlas-focus-ring atlas-icon-button text-[12px] text-icondim transition-colors hover:bg-clay-tint hover:text-clay"
              >
                ×
              </button>
            </form>
          </div>
          {person.entries.length === 0 ? (
            <p className="py-1 text-[12.5px] text-faint">No entries yet.</p>
          ) : (
            person.entries.map((e) => <EntryRow key={e.id} entry={e} />)
          )}
          <AddEntryForm personId={person.id} personName={person.name} />
        </div>
      ))}
    </div>
  );
}
