import { useState } from "react";
import { BsArrowDown, BsArrowUp } from "react-icons/bs";

import { formatBytes, formatDate } from "../../format";
import type { Entry } from "../../types";
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

export type View = "list" | "grid";

type Props = {
  view: View;
  entries: Entry[];
  selected: string[];
  onToggle: (id: string) => void;
  onToggleAll: (all: boolean) => void;
  onOpen: (id: string) => void;
};

export default function FileList({ view, entries, selected, onToggle, onToggleAll, onOpen }: Props) {
  const [sort, setSort] = useState<Sort>({ key: "lastModified", desc: true });
  const sorted = entries.toSorted((a, b) => compare(a, b, sort.key) * (sort.desc ? -1 : 1));

  if (entries.length === 0) {
    return <p className="py-10 text-center text-sm text-muted">This folder is empty.</p>;
  }

  const checkbox = (e: Entry, className = "") => (
    <input
      type="checkbox"
      aria-label={`Select ${e.name}`}
      className={`filelist-checkbox ${className}`}
      checked={selected.includes(e.id)}
      onChange={() => onToggle(e.id)}
      onClick={(ev) => ev.stopPropagation()}
    />
  );

  if (view === "grid") {
    // folders first, like on the tablet
    const tiles = sorted.toSorted((a, b) => Number(!!b.isFolder) - Number(!!a.isFolder));
    return (
      <div className="filegrid grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-x-4 gap-y-6 py-2">
        {tiles.map((e) => (
          <div key={e.id} className="group relative cursor-pointer" onClick={() => onOpen(e.id)}>
            <div className="flex aspect-[3/4] items-center justify-center rounded border border-line bg-surface text-muted transition-colors group-hover:border-ink">
              <FileIcon entry={e} className="size-10" />
            </div>
            {checkbox(e, "absolute top-2 left-2")}
            <div className={`mt-2 truncate text-sm ${e.isFolder ? "font-medium" : ""}`}>{e.name}</div>
            <div className="text-xs text-muted">{describe(e)}</div>
          </div>
        ))}
      </div>
    );
  }

  const all = entries.every((e) => selected.includes(e.id));
  const some = entries.some((e) => selected.includes(e.id));

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

  return (
    <table className="filelist w-full text-sm">
      <thead>
        <tr className="border-b border-line text-left text-xs tracking-wide text-muted">
          <th className="w-px py-2 pr-4 font-normal">
            <input
              type="checkbox"
              aria-label="Select all"
              checked={all}
              ref={(el) => {
                if (el) el.indeterminate = some && !all;
              }}
              onChange={() => onToggleAll(!all)}
            />
          </th>
          <th className="font-normal">{header("name", "Name")}</th>
          <th className="hidden px-3 text-right font-normal sm:table-cell">{header("size", "Size")}</th>
          <th className="text-right font-normal">{header("lastModified", "Modified")}</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((e) => (
          <tr key={e.id} className="filelist-item cursor-pointer border-b border-line hover:bg-line/30" onClick={() => onOpen(e.id)}>
            <td className="py-2.5 pr-4">{checkbox(e)}</td>
            <td className="w-full max-w-0">
              <span className="flex items-center gap-2">
                <FileIcon entry={e} className="text-muted" />
                <span className={`truncate ${e.isFolder ? "font-medium" : ""}`}>{e.name}</span>
              </span>
            </td>
            <td className="hidden px-3 text-right whitespace-nowrap text-muted tabular-nums sm:table-cell">{describe(e)}</td>
            <td className="pl-3 text-right whitespace-nowrap text-muted tabular-nums">{formatDate(e.lastModified)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
