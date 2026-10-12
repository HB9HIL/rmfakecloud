import { useEffect, useRef, useState } from "react";
import { BsChevronLeft, BsChevronRight, BsDownload } from "react-icons/bs";
import { Document, Page, pdfjs } from "react-pdf";

import { documentUrl } from "../../api";
import { buttonClass } from "../../components/styles";
import { Alert, Button } from "../../components/ui";
import { formatBytes } from "../../format";
import type { Doc, Entry } from "../../types";
import Breadcrumb from "./Breadcrumb";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

// the export is streamed without a length, so this counts up instead of a percentage
function Loading({ loaded }: { loaded: number }) {
  return (
    <div role="status" className="flex flex-col items-center gap-2 p-6 text-sm text-muted">
      <progress className="h-1.5 w-48 accent-ink" aria-label="Loading the document" />
      {loaded > 0 ? `${formatBytes(loaded)} loaded` : "Loading…"}
    </div>
  );
}

// documents of every type are rendered as the exported PDF
export default function FileView({ file, path }: { file: Doc; path: Entry[] }) {
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [loaded, setLoaded] = useState(0);
  const [height, setHeight] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new ResizeObserver(([e]) => setHeight(e.contentRect.height));
    observer.observe(ref.current!);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <Breadcrumb path={path} />
      <div className="mt-4 flex flex-wrap items-center gap-2 border-b border-line pb-3">
        {pages > 1 && (
          <div className="flex items-center gap-2">
            <Button size="sm" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <BsChevronLeft />
            </Button>
            <span className="text-sm text-muted tabular-nums">Page: {page} of {pages}</span>
            <Button size="sm" aria-label="Next page" disabled={page >= pages} onClick={() => setPage(page + 1)}>
              <BsChevronRight />
            </Button>
          </div>
        )}
        <div className="flex-1" />
        <a className={buttonClass("secondary", "sm")} href={documentUrl(file.id)} download={`${file.name}.pdf`}>
          <BsDownload aria-hidden /> PDF
        </a>
        <a className={buttonClass("secondary", "sm")} href={documentUrl(file.id, "rmdoc")} download={`${file.name}.rmdoc`}>
          <BsDownload aria-hidden /> .rmdoc
        </a>
      </div>

      <div ref={ref} className="min-h-0 flex-1 py-6">
        {/* without suspense the error props apply, otherwise a broken file takes down the whole page */}
        <Document
          suspense={false}
          file={documentUrl(file.id)}
          onLoadSuccess={(pdf) => setPages(pdf.numPages)}
          onLoadProgress={(p) => setLoaded(p.loaded)}
          loading={<Loading loaded={loaded} />}
          error={<Alert>Failed to load the document.</Alert>}
        >
          {height > 0 && <Page suspense={false} pageNumber={page} height={height} renderAnnotationLayer={false} renderTextLayer={false} />}
        </Document>
      </div>
    </>
  );
}
