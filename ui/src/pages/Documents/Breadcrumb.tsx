import { Fragment } from "react";
import { Link } from "react-router";
import { BsChevronRight } from "react-icons/bs";

import type { Entry } from "../../types";
import { useFiles } from "./actions";
import { docPath } from "./path";

export default function Breadcrumb({ path }: { path: Entry[] }) {
  const files = useFiles();
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
      {path.map((e, i) => (
        <Fragment key={e.id}>
          {i > 0 && <BsChevronRight aria-hidden className="size-3 text-muted" />}
          {i === path.length - 1 ? (
            <h1 className="min-w-0 truncate font-serif text-xl">{e.name}</h1>
          ) : (
            <Link
              to={docPath(e.id)}
              {...files.dropTarget(e.id)}
              className="rounded text-sm text-muted hover:text-ink hover:underline data-over:bg-accent/15 data-over:text-ink data-over:outline-2 data-over:outline-accent"
            >{e.name}</Link>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
