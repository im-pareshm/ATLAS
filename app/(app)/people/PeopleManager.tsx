"use client";

import { useActionState, useEffect, useRef } from "react";
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
  netPaise: number; // given − received (non-pending); >0 = they owe you
  hasEntries: boolean;
  entries: EntryDTO[];
};

const inputCls =
  "rounded-[10px] border border-inputborder bg-inputbg px-3 py-2 text-[13px] outline-none";
const ghostBtn =
  "rounded-[7px] px-2 py-1 text-[12px] text-secondary transition-colors hover:bg-divider";

function NetPill({ person }: { person: PersonDTO }) {
  let label: string;
  let color = "#4f7c6b";
  let bg = "#e4efe9";
  if (!person.hasEntries) {
    label = "no entries";
    color = "#a7b0ac";
    bg = "#eef2f0";
  } else if (person.netPaise === 0) {
    label = "settled";
  } else if (person.netPaise > 0) {
    label = `owes you ${formatINR(person.netPaise)}`;
  } else {
    label = `you owe ${formatINR(-person.netPaise)}`;
    color = "#b07a68";
    bg = "#f3e7e1";
  }
  return (
    <span
      className="num rounded-full px-[9px] py-[3px] text-[12px] font-bold"
      style={{ color, background: bg }}
    >
      {label}
    </span>
  );
}

function EntryRow({ entry }: { entry: EntryDTO }) {
  const given = entry.direction === "GIVEN";
  const color = given ? "#b07a68" : "#4f7c6b";
  const tint = given ? "#f3e7e1" : "#e4efe9";
  return (
    <div className="flex items-center gap-[10px] border-t border-divider py-[7px]">
      <span
        className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[7px] text-[13px]"
        style={{ color, background: tint }}
        title={given ? "Given" : "Received"}
      >
        {given ? "↑" : "↓"}
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px]">
        {entry.description || (
          <span className="text-faint">{given ? "Given" : "Received"}</span>
        )}
        {entry.pending ? (
          <span className="ml-2 text-[11px] font-semibold text-clay">pending</span>
        ) : null}
      </span>
      {entry.pending ? (
        <form action={markReceived}>
          <input type="hidden" name="id" value={entry.id} />
          <button
            type="submit"
            className="rounded-full bg-divider px-[9px] py-[4px] text-[11px] font-bold text-teal"
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
          title="Delete entry"
          className="rounded-[6px] px-1.5 py-1 text-[12px] text-icondim transition-colors hover:bg-clay-tint hover:text-clay"
        >
          ✕
        </button>
      </form>
    </div>
  );
}

function AddEntryForm({ personId }: { personId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    addEntry,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={action} className="mt-3 border-t border-divider pt-3">
      <input type="hidden" name="personId" value={personId} />
      <div className="flex flex-wrap items-center gap-2">
        <select name="direction" defaultValue="GIVEN" className={inputCls}>
          <option value="GIVEN">Given</option>
          <option value="RECEIVED">Received</option>
        </select>
        <input
          name="description"
          placeholder="What for?"
          className={`${inputCls} w-full sm:w-auto sm:min-w-0 sm:flex-1`}
        />
        <div className="flex items-center rounded-[10px] border border-inputborder bg-inputbg px-[8px]">
          <span className="text-[12px] text-faint2">₹</span>
          <input
            name="amount"
            type="number"
            min="0"
            step="1"
            placeholder="0"
            className="num w-[72px] border-none bg-transparent px-1 py-2 text-right text-[13px] font-semibold outline-none"
          />
        </div>
        <label className="flex items-center gap-1 text-[12px] text-muted">
          <input type="checkbox" name="pending" /> pending
        </label>
        <button
          type="submit"
          disabled={pending}
          className={ghostBtn + " disabled:opacity-60"}
        >
          + Add
        </button>
      </div>
      {state.error ? (
        <p className="mt-2 text-[12px] text-clay">{state.error}</p>
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
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={action} className="flex flex-wrap items-center gap-2">
      <input name="name" placeholder="Add a person (e.g. Mummy)" className={inputCls} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-[10px] bg-teal px-4 py-2 text-[13.5px] font-bold text-white transition-colors hover:bg-teal-hover disabled:opacity-60"
      >
        Add person
      </button>
      {state.error ? (
        <span className="text-[12.5px] text-clay">{state.error}</span>
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
          <div className="mb-2 flex items-center gap-3">
            <span className="text-[14.5px] font-bold">{person.name}</span>
            <NetPill person={person} />
            <form action={deletePerson} className="ml-auto">
              <input type="hidden" name="id" value={person.id} />
              <button
                type="submit"
                title="Delete person"
                className="rounded-[7px] px-2 py-1 text-[12px] text-icondim transition-colors hover:bg-clay-tint hover:text-clay"
              >
                ✕
              </button>
            </form>
          </div>
          {person.entries.length === 0 ? (
            <p className="py-1 text-[12.5px] text-faint">No entries yet.</p>
          ) : (
            person.entries.map((e) => <EntryRow key={e.id} entry={e} />)
          )}
          <AddEntryForm personId={person.id} />
        </div>
      ))}
    </div>
  );
}
