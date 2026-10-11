import { useMemo, useState } from "react";
import { Link, useLoaderData, useNavigate, useParams } from "react-router";
import { BsFolder2Open, BsSearch, BsXLg } from "react-icons/bs";

import type { listDocuments } from "../../api";
import { inputClass } from "../../components/styles";
import { Alert, Button } from "../../components/ui";
import type { Entry, Folder } from "../../types";
import FileView from "./File";
import type { View } from "./FileList";
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
    </div>
  );
}
