"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CATEGORY_KINDS, KIND_COLORS, type CategoryKind } from "@/lib/constants";
import {
  createGroup,
  updateGroup,
  deleteGroup,
  moveGroup,
  createCategory,
  updateCategory,
  deleteCategory,
  moveCategory,
  type ActionState,
} from "./actions";

const KIND_LABELS: Record<CategoryKind, string> = {
  INCOME: "Income",
  KNOWN_EXPENSE: "Known expense",
  SAVINGS: "Savings",
  DISCRETIONARY: "Discretionary",
};

export type CategoryDTO = { id: string; name: string; isDefault: boolean };
export type GroupDTO = {
  id: string;
  name: string;
  kind: CategoryKind;
  categories: CategoryDTO[];
};

const inputCls =
  "rounded-[10px] border border-inputborder bg-inputbg px-3 py-2 text-[13.5px] outline-none";
const btnCls =
  "rounded-[10px] bg-teal px-4 py-2 text-[13.5px] font-bold text-white transition-colors hover:bg-teal-hover disabled:opacity-60";
const ghostBtn =
  "rounded-[7px] px-2 py-1 text-[12px] text-secondary transition-colors hover:bg-divider";

function KindBadge({ kind }: { kind: CategoryKind }) {
  const { color, tint } = KIND_COLORS[kind];
  return (
    <span
      className="rounded-full px-[9px] py-[3px] text-[11px] font-bold"
      style={{ color, background: tint }}
    >
      {KIND_LABELS[kind]}
    </span>
  );
}

function KindSelect({ defaultValue }: { defaultValue?: CategoryKind }) {
  return (
    <select name="kind" defaultValue={defaultValue ?? "DISCRETIONARY"} className={inputCls}>
      {CATEGORY_KINDS.map((k) => (
        <option key={k} value={k}>
          {KIND_LABELS[k]}
        </option>
      ))}
    </select>
  );
}

function AddGroupForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createGroup,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-wrap items-center gap-2"
    >
      <input name="name" placeholder="New group name" className={inputCls} />
      <KindSelect />
      <button type="submit" disabled={pending} className={btnCls}>
        Add group
      </button>
      {state.error ? (
        <span className="text-[12.5px] text-clay">{state.error}</span>
      ) : null}
    </form>
  );
}

function AddCategoryForm({ groupId }: { groupId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createCategory,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={action} className="mt-2 flex items-center gap-2">
      <input type="hidden" name="groupId" value={groupId} />
      <input name="name" placeholder="Add category…" className={`${inputCls} flex-1`} />
      <button type="submit" disabled={pending} className={ghostBtn}>
        + Add
      </button>
      {state.error ? (
        <span className="text-[12px] text-clay">{state.error}</span>
      ) : null}
    </form>
  );
}

function DeleteButton({
  id,
  action,
  confirmLabel,
}: {
  id: string;
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  confirmLabel: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    {},
  );
  const [armed, setArmed] = useState(false);

  return (
    <span className="inline-flex items-center gap-1">
      {armed ? (
        <form action={formAction} className="inline-flex items-center gap-1">
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            disabled={pending}
            className="rounded-[7px] bg-clay-tint px-2 py-1 text-[12px] font-bold text-clay"
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={() => setArmed(false)}
            className={ghostBtn}
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setArmed(true)}
          title={confirmLabel}
          className="rounded-[7px] px-2 py-1 text-[12px] text-icondim transition-colors hover:bg-clay-tint hover:text-clay"
        >
          ✕
        </button>
      )}
      {state.error ? (
        <span className="text-[12px] text-clay">{state.error}</span>
      ) : null}
    </span>
  );
}

function MoveButtons({
  id,
  action,
}: {
  id: string;
  action: (fd: FormData) => Promise<void>;
}) {
  return (
    <span className="inline-flex">
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="dir" value="up" />
        <button type="submit" className={ghostBtn} title="Move up">
          ↑
        </button>
      </form>
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="dir" value="down" />
        <button type="submit" className={ghostBtn} title="Move down">
          ↓
        </button>
      </form>
    </span>
  );
}

function CategoryRow({ cat }: { cat: CategoryDTO }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updateCategory,
    {},
  );
  useEffect(() => {
    if (state.ok) setEditing(false);
  }, [state.ok]);

  return (
    <div className="flex items-center gap-2 border-t border-divider py-2">
      {editing ? (
        <form action={action} className="flex flex-1 items-center gap-2">
          <input type="hidden" name="id" value={cat.id} />
          <input
            name="name"
            defaultValue={cat.name}
            autoFocus
            className={`${inputCls} flex-1`}
          />
          <button type="submit" disabled={pending} className={ghostBtn}>
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className={ghostBtn}
          >
            Cancel
          </button>
          {state.error ? (
            <span className="text-[12px] text-clay">{state.error}</span>
          ) : null}
        </form>
      ) : (
        <>
          <span className="flex-1 text-[13.5px]">{cat.name}</span>
          <MoveButtons id={cat.id} action={moveCategory} />
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={ghostBtn}
          >
            Edit
          </button>
          <DeleteButton
            id={cat.id}
            action={deleteCategory}
            confirmLabel="Delete category"
          />
        </>
      )}
    </div>
  );
}

function GroupCard({ group }: { group: GroupDTO }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updateGroup,
    {},
  );
  useEffect(() => {
    if (state.ok) setEditing(false);
  }, [state.ok]);

  return (
    <div className="rounded-card bg-card p-[18px_20px] shadow-card">
      {editing ? (
        <form action={action} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="id" value={group.id} />
          <input
            name="name"
            defaultValue={group.name}
            className={inputCls}
          />
          <KindSelect defaultValue={group.kind} />
          <button type="submit" disabled={pending} className={ghostBtn}>
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className={ghostBtn}
          >
            Cancel
          </button>
          {state.error ? (
            <span className="text-[12px] text-clay">{state.error}</span>
          ) : null}
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-[15.5px] font-bold">{group.name}</h3>
          <KindBadge kind={group.kind} />
          <span className="ml-auto flex items-center gap-1">
            <MoveButtons id={group.id} action={moveGroup} />
            <button
              type="button"
              onClick={() => setEditing(true)}
              className={ghostBtn}
            >
              Edit
            </button>
            <DeleteButton
              id={group.id}
              action={deleteGroup}
              confirmLabel="Delete group"
            />
          </span>
        </div>
      )}

      <div className="mt-2">
        {group.categories.length === 0 ? (
          <p className="py-2 text-[12.5px] text-faint">No categories yet.</p>
        ) : (
          group.categories.map((cat) => <CategoryRow key={cat.id} cat={cat} />)
        )}
      </div>

      <AddCategoryForm groupId={group.id} />
    </div>
  );
}

export default function CategoryManager({ groups }: { groups: GroupDTO[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-card bg-card p-[18px_20px] shadow-card">
        <AddGroupForm />
      </div>
      {groups.map((group) => (
        <GroupCard key={group.id} group={group} />
      ))}
    </div>
  );
}
