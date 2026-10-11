import { Fragment } from "react";
import { Link } from "react-router";
import { BsChevronRight } from "react-icons/bs";

import type { Entry } from "../../types";
import { docPath } from "./path";

export default function Breadcrumb({ path }: { path: Entry[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
      {path.map((e, i) => (
        <Fragment key={e.id}>
          {i > 0 && <BsChevronRight aria-hidden className="size-3 text-muted" />}
          {i === path.length - 1 ? (
            <h1 className="min-w-0 truncate font-serif text-xl">{e.name}</h1>
          ) : (
            <Link to={docPath(e.id)} className="text-sm text-muted hover:text-ink hover:underline">{e.name}</Link>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
