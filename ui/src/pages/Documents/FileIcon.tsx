import { BsBook, BsFileEarmark, BsFilePdf, BsFolder, BsJournalText, BsTablet, BsTrash } from "react-icons/bs";

import type { Entry } from "../../types";

const icons = {
  device: BsTablet,
  trash: BsTrash,
  folder: BsFolder,
  pdf: BsFilePdf,
  epub: BsBook,
  notebook: BsJournalText,
  file: BsFileEarmark,
};

function kind(entry: Entry): keyof typeof icons {
  if (entry.isFolder) return entry.icon ?? "folder";
  return entry.type === "pdf" || entry.type === "epub" || entry.type === "notebook" ? entry.type : "file";
}

export default function FileIcon({ entry, className = "" }: { entry: Entry; className?: string }) {
  const Icon = icons[kind(entry)];
  return <Icon aria-hidden className={`shrink-0 ${className}`} />;
}
