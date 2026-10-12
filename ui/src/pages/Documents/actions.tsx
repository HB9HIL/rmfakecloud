import { createContext, useContext, useState, type DragEvent } from "react";
import { useLocation, useNavigate, useRevalidator } from "react-router";
import {
  BsArrowCounterclockwise,
  BsBoxArrowUpRight,
  BsClipboard,
  BsDownload,
  BsFolderPlus,
  BsFolderSymlink,
  BsPencil,
  BsScissors,
  BsTrash,
} from "react-icons/bs";
import { toast } from "react-toastify";

import { createFolder, deleteDocument, documentUrl, updateDocument } from "../../api";
import type { Entry, Folder } from "../../types";
import type { Menu, MenuItem } from "./ContextMenu";
import { docPath } from "./path";
import { accepted, rejected, uploadInBatches } from "./upload";

export const modKey = /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl";

const mime = "application/x-rmfakecloud-ids";
// what is being dragged, dragover can't read the data transfer
let dragging: string[] = [];

function download(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}

// every file operation of the documents page: menus, toolbar, keyboard and drag and drop all end up here
export function useFileManager(byId: Map<string, Entry>, parentOf: Map<string, string>) {
  const { revalidate } = useRevalidator();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // the folder view, without reloading the documents when it is open already
  const show = (folder: string) => pathname !== docPath(folder) && navigate(docPath(folder));
  const [clipboard, setClipboard] = useState<string[]>([]);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [moving, setMoving] = useState<string[] | null>(null);

  const name = (id: string) => byId.get(id)?.name ?? id;
  const describe = (ids: string[]) => (ids.length === 1 ? `"${name(ids[0])}"` : `${ids.length} items`);
  const children = (id: string) => (byId.get(id) as Folder | undefined)?.children ?? [];

  // the entry itself or one of its parents is the given folder
  function within(id: string, folder: string) {
    for (let p: string | undefined = id; p; p = parentOf.get(p)) if (p === folder) return true;
    return false;
  }
  const inTrash = (id: string) => within(id, "trash");
  const canMove = (ids: string[], target: string) =>
    ids.length > 0 && ids.every((id) => !within(target, id) && parentOf.get(id) !== target);

  async function relocate(moves: [string, string][]) {
    try {
      for (const [id, parent] of moves) await updateDocument(id, name(id), parent);
    } finally {
      await revalidate();
    }
  }

  async function move(ids: string[], target: string) {
    if (ids.some((id) => within(target, id))) return void toast.error("A folder can't be moved into itself");
    ids = ids.filter((id) => parentOf.get(id) !== target);
    if (ids.length === 0) return;
    const back = ids.map((id): [string, string] => [id, parentOf.get(id) ?? "root"]);
    const what = describe(ids);
    try {
      await relocate(ids.map((id) => [id, target]));
    } catch (e) {
      return void toast.error(`Failed to move ${what}: ${(e as Error).message}`);
    }
    toast.success(({ closeToast }) => (
      <span className="flex items-center gap-3">
        <span className="flex-1">Moved {what} to {name(target)}</span>
        <button
          type="button"
          className="cursor-pointer font-medium underline"
          onClick={() => {
            closeToast();
            relocate(back).catch((e: Error) => toast.error(`Undo failed: ${e.message}`));
          }}
        >
          Undo
        </button>
      </span>
    ));
  }

  async function deleteForever(ids: string[]) {
    if (ids.length === 0 || !window.confirm(`Permanently delete ${describe(ids)}? This can't be undone.`)) return;
    const what = describe(ids);
    try {
      for (const id of ids) await deleteDocument(id);
      toast.success(`Deleted ${what}`);
    } catch (e) {
      toast.error(`Failed to delete ${what}: ${(e as Error).message}`);
    } finally {
      await revalidate();
    }
  }

  async function rename(id: string, newName: string) {
    newName = newName.trim();
    if (!newName || newName === name(id)) return;
    try {
      await updateDocument(id, newName, parentOf.get(id) ?? "root");
      await revalidate();
    } catch (e) {
      toast.error(`Failed to rename ${describe([id])}: ${(e as Error).message}`);
    }
  }

  // like the file explorers: the new folder shows up right away, ready to be named
  async function newFolder(parent: string) {
    const taken = new Set(children(parent).map((e) => e.name));
    let folderName = "New folder";
    for (let i = 2; taken.has(folderName); i++) folderName = `New folder (${i})`;
    try {
      const { ID } = await createFolder(folderName, parent);
      await revalidate();
      show(parent);
      setRenaming(ID);
    } catch (e) {
      toast.error(`Failed to create the folder: ${(e as Error).message}`);
    }
  }

  async function upload(files: File[], target: string) {
    const ok = files.filter(accepted);
    if (ok.length < files.length) toast.error(rejected);
    if (ok.length === 0) return;
    await toast
      .promise(uploadInBatches(ok, target), {
        pending: `Uploading ${ok.length === 1 ? ok[0].name : `${ok.length} files`}…`,
        success: `Uploaded to ${name(target)}`,
        error: { render: ({ data }) => `Upload failed: ${(data as Error).message}` },
      })
      .catch(() => {});
    await revalidate();
  }

  function paste(target: string) {
    move(clipboard, target);
    setClipboard([]);
  }

  // renaming happens inline in the folder view, so go there first
  function startRename(id: string) {
    show(parentOf.get(id) ?? "root");
    setRenaming(id);
  }

  function itemMenu(ids: string[]): MenuItem[] {
    if (ids.some(inTrash)) {
      return [
        { label: "Restore", icon: BsArrowCounterclockwise, onSelect: () => move(ids, "root") },
        { label: "Delete permanently", icon: BsTrash, shortcut: "Del", danger: true, onSelect: () => deleteForever(ids) },
      ];
    }
    const one = ids.length === 1 ? byId.get(ids[0]) : undefined;
    return [
      ...(one ? [{ label: "Open", icon: BsBoxArrowUpRight, shortcut: "Enter", onSelect: () => navigate(docPath(one.id)) }] : []),
      ...(one && !one.isFolder
        ? [
            { label: "Download PDF", icon: BsDownload, onSelect: () => download(documentUrl(one.id), `${one.name}.pdf`) },
            { label: "Download .rmdoc", icon: BsDownload, onSelect: () => download(documentUrl(one.id, "rmdoc"), `${one.name}.rmdoc`) },
          ]
        : []),
      "separator",
      ...(one ? [{ label: "Rename", icon: BsPencil, shortcut: "F2", onSelect: () => startRename(one.id) }] : []),
      { label: "Cut", icon: BsScissors, shortcut: `${modKey}+X`, onSelect: () => setClipboard(ids) },
      { label: "Move to…", icon: BsFolderSymlink, onSelect: () => setMoving(ids) },
      "separator",
      { label: "Move to Trash", icon: BsTrash, shortcut: "Del", danger: true, onSelect: () => move(ids, "trash") },
    ];
  }

  // the empty space of a folder
  function folderMenu(id: string): MenuItem[] {
    if (id === "trash") {
      const all = children("trash").map((e) => e.id);
      return [{ label: "Empty Trash", icon: BsTrash, danger: true, disabled: all.length === 0, onSelect: () => deleteForever(all) }];
    }
    if (inTrash(id)) return [];
    return [
      { label: "New folder", icon: BsFolderPlus, onSelect: () => newFolder(id) },
      { label: "Paste", icon: BsClipboard, shortcut: `${modKey}+V`, disabled: !canMove(clipboard, id), onSelect: () => paste(id) },
    ];
  }

  function showMenu(x: number, y: number, items: MenuItem[]) {
    if (items.length > 0) setMenu({ x, y, items });
  }

  function dragSource(ids: () => string[]) {
    return {
      draggable: true,
      onDragStart: (e: DragEvent) => {
        dragging = ids();
        e.dataTransfer.setData(mime, dragging.join(","));
        e.dataTransfer.effectAllowed = "move";
      },
      onDragEnd: () => {
        dragging = [];
      },
    };
  }

  // folders take entries from this page and files from the computer
  function dropTarget(target: string) {
    const accepts = (e: DragEvent) =>
      e.dataTransfer.types.includes(mime) ? canMove(dragging, target) : e.dataTransfer.types.includes("Files") && !inTrash(target);
    return {
      onDragOver: (e: DragEvent<HTMLElement>) => {
        if (!accepts(e)) return;
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.dataset.over = "";
      },
      onDragLeave: (e: DragEvent<HTMLElement>) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) delete e.currentTarget.dataset.over;
      },
      onDrop: (e: DragEvent<HTMLElement>) => {
        delete e.currentTarget.dataset.over;
        if (!accepts(e)) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.types.includes(mime)) move(dragging, target);
        else upload([...e.dataTransfer.files], target);
      },
    };
  }

  return {
    byId,
    clipboard,
    setClipboard,
    renaming,
    setRenaming,
    menu,
    setMenu,
    moving,
    setMoving,
    inTrash,
    canMove,
    move,
    deleteForever,
    rename,
    newFolder,
    upload,
    paste,
    itemMenu,
    folderMenu,
    showMenu,
    dragSource,
    dropTarget,
  };
}

export type FileManager = ReturnType<typeof useFileManager>;
export const FileManagerContext = createContext<FileManager | null>(null);
export const useFiles = () => useContext(FileManagerContext)!;
