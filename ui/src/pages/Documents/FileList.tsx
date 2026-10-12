import { useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { BsArrowDown, BsArrowUp, BsThreeDots } from "react-icons/bs";

import { formatBytes, formatDate } from "../../format";
import type { Entry } from "../../types";
import { useFiles } from "./actions";
import FileIcon from "./FileIcon";

type SortKey = "name" | "size" | "lastModified";
type Sort = { key: SortKey; desc: boolean };

// folders sort by their number of entries
const size = (e: Entry) => (e.isFolder ? e.children.length : e.size);

function compare(a: Entry, b: Entry, key: SortKey) {
  if (key === "name") return a.name.localeCompare(b.name);
  if (key === "size") return size(a) - size(b);
  return Date.parse(a.lastModified) - Date.parse(b.lastModified);
}

const describe = (e: Entry) => (e.isFolder ? `${e.children.length || "empty"}` : formatBytes(e.size));

const toggle = (ids: string[], id: string) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);

function RenameInput({ name, onDone }: { name: string; onDone: (name: string | null) => void }) {
  // Enter and the following blur must not both count
  const done = useRef(false);
  const finish = (value: string | null) => {
    if (done.current) return;
    done.current = true;
    onDone(value);
  };
  return (
    <input
      autoFocus
      aria-label="Name"
      defaultValue={name}
      className="h-7 min-w-0 flex-1 rounded border border-ink bg-surface px-1.5 text-sm focus:outline-none"
      onFocus={(e) => e.currentTarget.select()}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") finish(e.currentTarget.value);
        if (e.key === "Escape") finish(null);
      }}
      onBlur={(e) => finish(e.currentTarget.value)}
    />
  );
}

export type View = "list" | "grid";

type Props = {
  view: View;
  entries: Entry[];
  selected: string[];
  onSelect: (ids: string[]) => void;
  onOpen: (id: string) => void;
  onMenu: (id: string, x: number, y: number) => void;
};

// selection and keys like a desktop file manager: click selects, double click opens
export default function FileList({ view, entries, selected, onSelect, onOpen, onMenu }: Props) {
  const files = useFiles();
  const [sort, setSort] = useState<Sort>({ key: "lastModified", desc: true });
  const list = useRef<HTMLDivElement>(null);
  const anchor = useRef<string | null>(null);
  const typed = useRef({ text: "", at: 0 });

  // folders first, like on the tablet
  const items = entries
    .toSorted((a, b) => compare(a, b, sort.key) * (sort.desc ? -1 : 1))
    .toSorted((a, b) => Number(!!b.isFolder) - Number(!!a.isFolder));

  if (entries.length === 0) {
    return <p className="py-10 text-center text-sm text-muted">This folder is empty.</p>;
  }

  const focus = (id: string) => list.current?.querySelector<HTMLElement>(`[data-id="${id}"]`)?.focus();

  function range(to: string) {
    const b = items.findIndex((e) => e.id === to);
    const found = items.findIndex((e) => e.id === anchor.current);
    const a = found < 0 ? b : found;
    return items.slice(Math.min(a, b), Math.max(a, b) + 1).map((e) => e.id);
  }

  function select(id: string, e: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) {
    if (e.shiftKey) return onSelect(range(id));
    anchor.current = id;
    onSelect(e.ctrlKey || e.metaKey ? toggle(selected, id) : [id]);
  }

  function onClick(e: MouseEvent, id: string) {
    // touch has no double click
    if (matchMedia("(pointer: coarse)").matches) return onOpen(id);
    select(id, e);
  }

  function finishRename(id: string, name: string | null) {
    files.setRenaming(null);
    if (name !== null) files.rename(id, name);
    requestAnimationFrame(() => focus(id));
  }

  function onKeyDown(e: KeyboardEvent) {
    if ((e.target as HTMLElement).closest("input:not([type=checkbox])")) return;
    const current = (document.activeElement as HTMLElement | null)?.dataset.id;
    const i = items.findIndex((x) => x.id === current);
    const grid = list.current?.querySelector(".filegrid");
    const cols = grid ? getComputedStyle(grid).gridTemplateColumns.split(" ").length : 1;
    const steps: Record<string, number> = {
      ArrowDown: cols,
      ArrowUp: -cols,
      Home: -Infinity,
      End: Infinity,
      ...(grid ? { ArrowRight: 1, ArrowLeft: -1 } : {}),
    };

    if (e.key in steps && !e.altKey && !e.metaKey) {
      const step = steps[e.key];
      const to = i < 0 && Math.abs(step) !== Infinity ? 0 : Math.max(0, Math.min(items.length - 1, i + step));
      const next = items[to].id;
      focus(next);
      // Ctrl only moves the focus, Space then toggles
      if (e.shiftKey) onSelect(range(next));
      else if (!e.ctrlKey) select(next, e);
    } else if (current && (e.key === "Enter" || (e.metaKey && e.key === "ArrowDown"))) onOpen(current);
    else if (current && e.key === " ") select(current, e);
    else if (current && (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10"))) {
      const r = (document.activeElement as HTMLElement).getBoundingClientRect();
      onMenu(current, r.left + 24, r.bottom);
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // type ahead, repeating the first letter cycles through the matches
      const t = typed.current;
      t.text = (e.timeStamp - t.at < 800 ? t.text : "") + e.key.toLowerCase();
      t.at = e.timeStamp;
      const from = t.text.length === 1 ? i + 1 : Math.max(i, 0);
      const match = [...items.slice(from), ...items.slice(0, from)].find((x) => x.name.toLowerCase().startsWith(t.text));
      if (match) {
        focus(match.id);
        select(match.id, { shiftKey: false, ctrlKey: false, metaKey: false });
      }
    } else return;
    e.preventDefault();
  }

  const itemProps = (e: Entry, className: string) => ({
    "data-id": e.id,
    tabIndex: -1,
    "aria-selected": selected.includes(e.id),
    onClick: (ev: MouseEvent) => onClick(ev, e.id),
    onDoubleClick: () => onOpen(e.id),
    onContextMenu: (ev: MouseEvent<HTMLElement>) => {
      ev.preventDefault();
      ev.currentTarget.focus();
      onMenu(e.id, ev.clientX, ev.clientY);
    },
    ...(files.renaming === e.id ? {} : files.dragSource(() => (selected.includes(e.id) ? selected : [e.id]))),
    ...(e.isFolder ? files.dropTarget(e.id) : {}),
    className: `group cursor-default outline-offset-[-2px] aria-selected:bg-line/70 data-over:bg-accent/15 data-over:outline-2 data-over:outline-accent ${
      files.clipboard.includes(e.id) ? "opacity-50" : ""
    } ${className}`,
  });

  const name = (e: Entry) =>
    files.renaming === e.id ? (
      <RenameInput name={e.name} onDone={(n) => finishRename(e.id, n)} />
    ) : (
      <span className={`truncate ${e.isFolder ? "font-medium" : ""}`} title={e.name}>{e.name}</span>
    );

  const checkbox = (e: Entry, className = "") => (
    <input
      type="checkbox"
      tabIndex={-1}
      aria-label={`Select ${e.name}`}
      className={`filelist-checkbox ${className}`}
      checked={selected.includes(e.id)}
      onChange={() => onSelect(toggle(selected, e.id))}
      onClick={(ev) => ev.stopPropagation()}
    />
  );

  // the context menu for touch and for discovering it
  const more = (e: Entry, className = "") => (
    <button
      type="button"
      tabIndex={-1}
      aria-label={`Actions for ${e.name}`}
      className={`cursor-pointer rounded p-1 text-muted opacity-0 group-hover:opacity-100 group-aria-selected:opacity-100 hover:bg-line hover:text-ink pointer-coarse:opacity-100 ${className}`}
      onClick={(ev) => {
        ev.stopPropagation();
        const r = ev.currentTarget.getBoundingClientRect();
        onMenu(e.id, r.left, r.bottom);
      }}
    >
      <BsThreeDots aria-hidden />
    </button>
  );

  const header = (key: SortKey, label: string) => (
    <button
      type="button"
      className="inline-flex cursor-pointer items-center gap-1 uppercase hover:text-ink"
      onClick={() => setSort({ key, desc: sort.key === key ? !sort.desc : key === "lastModified" })}
    >
      {label}
      {sort.key === key && (sort.desc ? <BsArrowDown aria-label="descending" /> : <BsArrowUp aria-label="ascending" />)}
    </button>
  );

  const all = entries.every((e) => selected.includes(e.id));
  const some = entries.some((e) => selected.includes(e.id));

  return (
    <div
      ref={list}
      data-list
      tabIndex={0}
      aria-label="Files"
      aria-multiselectable
      className="flex-1 outline-offset-2"
      onKeyDown={onKeyDown}
      // a click on the empty space clears the selection
      onClick={(e) => {
        if (!(e.target as Element).closest("[data-id], thead")) onSelect([]);
      }}
    >
      {view === "grid" ? (
        <div className="filegrid grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-x-4 gap-y-6 py-2">
          {items.map((e) => (
            <div key={e.id} {...itemProps(e, "relative rounded p-1.5")}>
              <div className="flex aspect-[3/4] items-center justify-center rounded border border-line bg-surface text-muted transition-colors group-hover:border-ink">
                <FileIcon entry={e} className="size-10" />
              </div>
              {checkbox(e, "absolute top-3.5 left-3.5")}
              {more(e, "absolute top-2.5 right-2.5")}
              <div className="mt-2 flex text-sm">{name(e)}</div>
              <div className="text-xs text-muted">{describe(e)}</div>
            </div>
          ))}
        </div>
      ) : (
        <table className="filelist w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs tracking-wide text-muted">
              <th className="w-px py-2 pr-4 font-normal">
                <input
                  type="checkbox"
                  tabIndex={-1}
                  aria-label="Select all"
                  checked={all}
                  ref={(el) => {
                    if (el) el.indeterminate = some && !all;
                  }}
                  onChange={() => onSelect(all ? [] : entries.map((e) => e.id))}
                />
              </th>
              <th className="font-normal">{header("name", "Name")}</th>
              <th className="hidden px-3 text-right font-normal sm:table-cell">{header("size", "Size")}</th>
              <th className="text-right font-normal">{header("lastModified", "Modified")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((e) => (
              <tr key={e.id} {...itemProps(e, "filelist-item border-b border-line hover:bg-line/30")}>
                <td className="py-2.5 pr-4">{checkbox(e)}</td>
                <td className="w-full max-w-0">
                  <span className="flex items-center gap-2">
                    <FileIcon entry={e} className="text-muted" />
                    {name(e)}
                    {more(e, "ml-auto")}
                  </span>
                </td>
                <td className="hidden px-3 text-right whitespace-nowrap text-muted tabular-nums sm:table-cell">{describe(e)}</td>
                <td className="pl-3 text-right whitespace-nowrap text-muted tabular-nums">{formatDate(e.lastModified)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
