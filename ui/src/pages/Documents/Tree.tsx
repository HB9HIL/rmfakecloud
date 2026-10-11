import { useEffect, useRef, useState } from "react";
import { Tree, type NodeRendererProps } from "react-arborist";

import type { Entry, Folder } from "../../types";
import FileIcon from "./FileIcon";

function Node({ node, style }: NodeRendererProps<Entry>) {
  return (
    <div
      style={style}
      className={`flex h-full items-center gap-2 rounded px-2 text-sm ${
        node.isSelected ? "bg-line/70 font-medium" : "hover:bg-line/40"
      }`}
    >
      <FileIcon entry={node.data} className="text-muted" />
      <span className={`truncate ${node.data.isFolder ? "font-medium" : ""}`}>{node.data.name}</span>
    </div>
  );
}

type Props = { entries: Folder[]; selected: string; term: string; onOpen: (id: string) => void };

// the selection prop also opens the parents and scrolls to it, e.g. for a deep link
export default function DocumentTree({ entries, selected, term, onOpen }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const observer = new ResizeObserver(([e]) => setHeight(e.contentRect.height));
    observer.observe(ref.current!);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="h-full px-2 py-2">
      <Tree<Entry>
        data={entries}
        selection={selected}
        searchTerm={term}
        onActivate={(node) => {
          if (node.isInternal) node.toggle();
          onOpen(node.id);
        }}
        width="100%"
        height={height}
        rowHeight={34}
        indent={16}
        openByDefault={false}
        disableEdit
        disableDrag
        disableDrop
      >
        {Node}
      </Tree>
    </div>
  );
}
