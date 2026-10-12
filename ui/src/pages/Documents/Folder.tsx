import { Fragment, useState, type KeyboardEvent, type MouseEvent } from "react";
import { useDropzone } from "react-dropzone";
import { BsArrowCounterclockwise, BsCheck2All, BsCloudUpload, BsFolderPlus, BsFolderSymlink, BsGrid, BsListUl, BsTrash } from "react-icons/bs";
import { toast } from "react-toastify";

import { Button } from "../../components/ui";
import type { Entry, Folder } from "../../types";
import { modKey, useFiles } from "./actions";
import Breadcrumb from "./Breadcrumb";
import FileList, { type View } from "./FileList";
import { accept, maxSize, rejected } from "./upload";

const views = [
  { value: "grid", label: "Grid", Icon: BsGrid },
  { value: "list", label: "List", Icon: BsListUl },
] as const;

function ViewSwitch({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <div role="radiogroup" aria-label="View" className="inline-flex overflow-hidden rounded border border-line">
      {views.map(({ value, label, Icon }) => (
        <Fragment key={value}>
          <input
            type="radio"
            id={value}
            name="view"
            className="peer sr-only"
            checked={view === value}
            onChange={() => onChange(value)}
          />
          <label
            htmlFor={value}
            title={label}
            className="flex h-8 cursor-pointer items-center px-2.5 text-muted peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:outline-2 peer-focus-visible:outline-accent hover:text-ink"
          >
            <Icon aria-label={label} />
          </label>
        </Fragment>
      ))}
    </div>
  );
}

type Props = {
  folder: Folder;
  path: Entry[];
  view: View;
  onView: (v: View) => void;
  onOpen: (id: string) => void;
};

export default function FolderView({ folder, path, view, onView, onOpen }: Props) {
  const files = useFiles();
  const [selection, setSelection] = useState<string[]>([]);
  // entries can disappear underneath: moved, deleted or synced from the tablet
  const selected = selection.filter((id) => folder.children.some((e) => e.id === id));
  const all = folder.children.map((e) => e.id);
  const trash = files.inTrash(folder.id);

  const { getRootProps, getInputProps, isDragActive, open: chooseFiles } = useDropzone({
    accept,
    maxSize,
    noClick: true,
    noKeyboard: true,
    disabled: trash,
    onDropAccepted: (dropped) => files.upload(dropped, folder.id),
    onDropRejected: () => toast.error(rejected),
  });

  // the focused row is gone after a delete or move, keep the keyboard in the list
  const refocus = () => document.querySelector<HTMLElement>("[data-list]")?.focus();

  function remove(forever: boolean) {
    if (selected.length === 0) return;
    (forever || trash ? files.deleteForever(selected) : files.move(selected, "trash")).then(refocus);
  }

  function onKeyDown(e: KeyboardEvent) {
    if ((e.target as HTMLElement).closest("input:not([type=checkbox]), dialog")) return;
    const mod = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();
    if (e.key === "Delete" || (e.metaKey && e.key === "Backspace")) remove(e.shiftKey);
    else if (e.key === "Backspace" || ((e.altKey || e.metaKey) && e.key === "ArrowUp")) {
      if (path.length > 1) onOpen(path[path.length - 2].id);
    } else if (e.key === "F2" && selected.length === 1 && !trash) files.setRenaming(selected[0]);
    else if (mod && key === "a") setSelection(all);
    else if (mod && key === "x" && !trash && selected.length > 0) files.setClipboard(selected);
    else if (mod && key === "v" && !trash) files.paste(folder.id);
    else if (e.key === "Escape") {
      setSelection([]);
      files.setClipboard([]);
    } else return;
    e.preventDefault();
  }

  function onItemMenu(id: string, x: number, y: number) {
    const ids = selected.includes(id) ? selected : [id];
    setSelection(ids);
    files.showMenu(x, y, files.itemMenu(ids));
  }

  function onBackgroundMenu(e: MouseEvent) {
    // an entry opened its own menu
    if (e.defaultPrevented) return;
    e.preventDefault();
    setSelection([]);
    files.showMenu(e.clientX, e.clientY, [
      ...files.folderMenu(folder.id),
      ...(trash ? [] : [{ label: "Upload files…", icon: BsCloudUpload, onSelect: chooseFiles }]),
      "separator",
      { label: "Select all", icon: BsCheck2All, shortcut: `${modKey}+A`, disabled: all.length === 0, onSelect: () => setSelection(all) },
    ]);
  }

  return (
    <>
      <Breadcrumb path={path} />
      <div className="mt-4 flex flex-wrap items-center gap-2 border-b border-line pb-3">
        {trash ? (
          folder.id === "trash" && (
            <Button size="sm" variant="danger" disabled={all.length === 0} onClick={() => files.deleteForever(all)}>
              <BsTrash aria-hidden /> Empty Trash
            </Button>
          )
        ) : (
          <>
            <Button size="sm" onClick={() => files.newFolder(folder.id)}><BsFolderPlus aria-hidden /> New Folder</Button>
            <Button size="sm" onClick={chooseFiles}><BsCloudUpload aria-hidden /> Upload</Button>
          </>
        )}
        <div className="flex-1" />
        {selected.length > 0 && (
          <>
            <span className="text-sm text-muted">{selected.length} selected</span>
            {trash ? (
              <Button size="sm" onClick={() => files.move(selected, "root")}><BsArrowCounterclockwise aria-hidden /> Restore</Button>
            ) : (
              <Button size="sm" onClick={() => files.setMoving(selected)}><BsFolderSymlink aria-hidden /> Move</Button>
            )}
            <Button size="sm" variant="danger" onClick={() => remove(false)}>
              <BsTrash aria-hidden /> {trash ? "Delete permanently" : "Delete"}
            </Button>
          </>
        )}
        <ViewSwitch view={view} onChange={onView} />
      </div>

      <div
        {...getRootProps({
          className: "relative flex min-h-0 flex-1 flex-col pt-2",
          onContextMenu: onBackgroundMenu,
        })}
        // getRootProps drops onKeyDown with noKeyboard
        onKeyDown={onKeyDown}
      >
        <input {...getInputProps()} />
        {isDragActive && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-end justify-center rounded-md border-2 border-dashed border-accent bg-accent/5 p-4">
            <span className="flex items-center gap-2 rounded bg-surface px-3 py-1.5 text-sm shadow">
              <BsCloudUpload aria-hidden /> Drop to upload to {folder.name}
            </span>
          </div>
        )}
        <FileList
          view={view}
          entries={folder.children}
          selected={selected}
          onSelect={setSelection}
          onOpen={onOpen}
          onMenu={onItemMenu}
        />
      </div>
    </>
  );
}
