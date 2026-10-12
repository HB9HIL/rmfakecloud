import { useMemo, useState } from "react";
import { Link, useLoaderData, useNavigate, useParams, useRevalidator } from "react-router";
import { BsFolder2Open, BsSearch, BsXLg } from "react-icons/bs";

import type { listDocuments } from "../../api";
import { inputClass } from "../../components/styles";
import { Alert, Button, Dialog } from "../../components/ui";
import { useServerEvent } from "../../events";
import type { Entry, Folder } from "../../types";
import { FileManagerContext, useFileManager, type FileManager } from "./actions";
import ContextMenu from "./ContextMenu";
import FileView from "./File";
import type { View } from "./FileList";
import FileIcon from "./FileIcon";
import FolderView from "./Folder";
import { docPath } from "./path";
import DocumentTree from "./Tree";

function indexTree(entries: Entry[]) {
  const byId = new Map<string, Entry>();
  const parentOf = new Map<string, string>();
  const walk = (list: Entry[], parent?: string) => {
    for (const e of list) {
      byId.set(e.id, e);
      if (parent) parentOf.set(e.id, parent);
      if (e.isFolder) walk(e.children, e.id);
    }
  };
  walk(entries);
  return { byId, parentOf };
}

// the folders to move into, without the moved ones and their subfolders
function FolderPicker({ files, ids }: { files: FileManager; ids: string[] }) {
  const rows: Folder[] = [];
  const depth = new Map<string, number>();
  const walk = (f: Folder, d: number) => {
    if (ids.includes(f.id)) return;
    rows.push(f);
    depth.set(f.id, d);
    for (const c of f.children) if (c.isFolder) walk(c, d + 1);
  };
  walk(files.byId.get("root") as Folder, 0);

  return (
    <div className="-mx-2 max-h-[60vh] overflow-auto">
      {rows.map((f) => (
        <button
          key={f.id}
          type="button"
          disabled={!files.canMove(ids, f.id)}
          style={{ paddingLeft: `${0.5 + depth.get(f.id)! * 1.25}rem` }}
          className="flex w-full cursor-pointer items-center gap-2 rounded py-1.5 pr-2 text-left text-sm hover:bg-line/60 disabled:cursor-default disabled:opacity-40"
          onClick={() => {
            files.setMoving(null);
            files.move(ids, f.id);
          }}
        >
          <FileIcon entry={f} className="text-muted" />
          <span className="truncate">{f.name}</span>
        </button>
      ))}
    </div>
  );
}

// the url is the selection: /documents is the root, /documents/:itemId a folder or document
export default function Documents() {
  const tree = useLoaderData<typeof listDocuments>();
  const { itemId = "root" } = useParams();
  const navigate = useNavigate();
  const [showTree, setShowTree] = useState(false);
  const [search, setSearch] = useState<string | null>(null);
  const [view, setView] = useState<View>("list");

  const entries = useMemo<Folder[]>(
    () => [
      { id: "root", name: "My Files", isFolder: true, icon: "device", lastModified: "", children: tree.Entries },
      { id: "trash", name: "Trash", isFolder: true, icon: "trash", lastModified: "", children: tree.Trash },
    ],
    [tree],
  );
  const { byId, parentOf } = useMemo(() => indexTree(entries), [entries]);
  const files = useFileManager(byId, parentOf);
  // the tablet synced or another tab changed something
  const { revalidate } = useRevalidator();
  useServerEvent("documents", revalidate);
  useServerEvent("open", revalidate);

  const selected = byId.get(itemId);
  const path: Entry[] = [];
  for (let id: string | undefined = itemId; id && byId.has(id); id = parentOf.get(id)) {
    path.unshift(byId.get(id)!);
  }

  function open(id: string) {
    setShowTree(false);
    navigate(docPath(id));
  }

  return (
    <FileManagerContext value={files}>
    <div className="flex h-full">
      {showTree && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setShowTree(false)} />}
      {/* a slide-in panel on phones, a column from md upwards */}
      <aside
        id="folders"
        className={`${showTree ? "flex" : "hidden"} fixed inset-y-0 left-0 z-40 w-72 max-w-[85%] flex-col border-r border-line bg-paper md:static md:z-auto md:flex lg:w-80`}
      >
        <div className="flex h-12 shrink-0 items-center gap-1 border-b border-line pr-2 pl-4">
          <span className="flex-1 text-sm font-medium">Folders</span>
          <Button variant="ghost" size="sm" aria-label="Search" onClick={() => setSearch(search === null ? "" : null)}>
            <BsSearch />
          </Button>
          <Button variant="ghost" size="sm" aria-label="Close" className="md:hidden" onClick={() => setShowTree(false)}>
            <BsXLg />
          </Button>
        </div>
        {search !== null && (
          <div className="border-b border-line p-2">
            <input className={inputClass} placeholder="Search" aria-label="Search" autoFocus value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        )}
        <div className="min-h-0 flex-1">
          <DocumentTree entries={entries} selected={itemId} term={search ?? ""} onOpen={open} />
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col overflow-auto px-4 py-4 md:px-8 md:py-6">
        <Button size="sm" className="mb-4 self-start md:hidden" onClick={() => setShowTree(true)}>
          <BsFolder2Open aria-hidden /> Folders
        </Button>
        {!selected ? (
          <Alert>
            This item doesn't exist (anymore). <Link to="/documents" className="underline">Back to My Files</Link>
          </Alert>
        ) : selected.isFolder ? (
          <FolderView key={selected.id} folder={selected} path={path} view={view} onView={setView} onOpen={open} />
        ) : (
          <FileView key={selected.id} file={selected} path={path} />
        )}
      </section>

      <ContextMenu menu={files.menu} onClose={() => files.setMenu(null)} />
      <Dialog open={files.moving !== null} onClose={() => files.setMoving(null)} title="Move to">
        {files.moving && <FolderPicker files={files} ids={files.moving} />}
      </Dialog>
    </div>
    </FileManagerContext>
  );
}
