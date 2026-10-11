import { Fragment, useState, type FormEvent } from "react";
import { useRevalidator } from "react-router";
import { BsFolderPlus, BsGrid, BsListUl, BsTrash } from "react-icons/bs";
import { toast } from "react-toastify";

import { createFolder, deleteDocument } from "../../api";
import { inputClass } from "../../components/styles";
import { Button, Dialog } from "../../components/ui";
import type { Entry, Folder } from "../../types";
import Breadcrumb from "./Breadcrumb";
import FileList, { type View } from "./FileList";
import Upload from "./Upload";

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

function NewFolder({ parentId, onDone }: { parentId: string; onDone: () => void }) {
  const [name, setName] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      await createFolder(name, parentId);
      onDone();
    } catch (err) {
      toast.error(`Failed to create the folder: ${(err as Error).message}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input className={inputClass} aria-label="Folder name" value={name} onChange={(e) => setName(e.target.value)} required />
      <Button type="submit" variant="primary">Create</Button>
    </form>
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
  const revalidator = useRevalidator();
  const [selected, setSelected] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  async function remove() {
    if (!window.confirm("Are you sure you want to delete the selected item(s)?")) return;
    for (const id of selected) {
      const name = folder.children.find((e) => e.id === id)?.name ?? id;
      try {
        await deleteDocument(id);
        toast.success(`Deleted ${name}`);
      } catch {
        toast.error(`Failed to delete ${name}`);
      }
    }
    setSelected([]);
    revalidator.revalidate();
  }

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <>
      <Breadcrumb path={path} />
      <div className="mt-4 flex flex-wrap items-center gap-2 border-b border-line pb-3">
        <Button size="sm" onClick={() => setCreating(true)}><BsFolderPlus aria-hidden /> Create Folder</Button>
        <div className="flex-1" />
        <Button size="sm" variant="danger" onClick={remove} disabled={selected.length === 0}><BsTrash aria-hidden /> Delete</Button>
        <ViewSwitch view={view} onChange={onView} />
      </div>

      <Upload folderId={folder.id} onUploaded={() => revalidator.revalidate()} />
      <FileList
        view={view}
        entries={folder.children}
        selected={selected}
        onToggle={toggle}
        onToggleAll={(all) => setSelected(all ? folder.children.map((e) => e.id) : [])}
        onOpen={onOpen}
      />

      <Dialog open={creating} onClose={() => setCreating(false)} title="Create a new folder">
        <NewFolder
          parentId={folder.id}
          onDone={() => {
            setCreating(false);
            revalidator.revalidate();
          }}
        />
      </Dialog>
    </>
  );
}
