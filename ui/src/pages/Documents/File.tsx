import { useEffect, useRef, useState, type SubmitEvent } from "react";
import { BsChevronDown, BsChevronLeft, BsChevronRight, BsChevronUp, BsDownload, BsListNested, BsPrinter, BsSearch, BsShare } from "react-icons/bs";
import { Document, Outline, Page, pdfjs } from "react-pdf";
import type { PDFDocumentProxy } from "pdfjs-dist";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import { documentUrl } from "../../api";
import { buttonClass } from "../../components/styles";
import { Alert, Button } from "../../components/ui";
import { formatBytes } from "../../format";
import type { Doc, Entry } from "../../types";
import { iosApp } from "./actions";
import Breadcrumb from "./Breadcrumb";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();

// the export is streamed without a length, so this counts up instead of a percentage
function Loading({ loaded }: { loaded: number }) {
  return (
    <div role="status" className="flex flex-col items-center gap-2 p-6 text-sm text-muted">
      <progress className="h-1.5 w-48 accent-ink" aria-label="Loading the document" />
      {loaded > 0 ? `${formatBytes(loaded)} loaded` : "Loading…"}
    </div>
  );
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// pages whose text contains the term, reported as they are found
async function searchPages(pdf: PDFDocumentProxy, term: string, onPage: (page: number, found: boolean) => void, signal: AbortSignal) {
  const needle = term.toLowerCase();
  for (let i = 1; i <= pdf.numPages && !signal.aborted; i++) {
    const content = await (await pdf.getPage(i)).getTextContent();
    const text = content.items.map((item) => ("str" in item ? item.str : "")).join(" ").toLowerCase();
    if (!signal.aborted) onPage(i, text.includes(needle));
  }
}

// browsers print a pdf they display, a hidden frame with the loaded data avoids a second download
async function print(pdf: PDFDocumentProxy) {
  document.getElementById("print-frame")?.remove();
  const data = await pdf.getData();
  const frame = document.createElement("iframe");
  frame.id = "print-frame";
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  frame.src = URL.createObjectURL(new Blob([data as Uint8Array<ArrayBuffer>], { type: "application/pdf" }));
  frame.onload = () => frame.contentWindow?.print();
  document.body.append(frame);
}

// the share sheet saves to Files, opens in Books and the like
async function share(pdf: PDFDocumentProxy, name: string) {
  const data = await pdf.getData();
  const file = new File([data as Uint8Array<ArrayBuffer>], `${name}.pdf`, { type: "application/pdf" });
  await navigator.share({ files: [file] }).catch(() => {});
}

type Search = { term: string; matches: number[]; searched: number };

// documents of every type are rendered as the exported PDF
export default function FileView({ file, path }: { file: Doc; path: Entry[] }) {
  const [page, setPage] = useState(1);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [hasOutline, setHasOutline] = useState(false);
  const [showOutline, setShowOutline] = useState(false);
  const [loaded, setLoaded] = useState(0);
  const [height, setHeight] = useState(0);
  const [search, setSearch] = useState<Search | null>(null);
  const [printing, setPrinting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const searching = useRef<AbortController | null>(null);
  const pages = pdf?.numPages ?? 0;

  useEffect(() => {
    const observer = new ResizeObserver(([e]) => setHeight(e.contentRect.height));
    observer.observe(ref.current!);
    return () => {
      observer.disconnect();
      searching.current?.abort();
    };
  }, []);

  function onLoad(doc: PDFDocumentProxy) {
    setPdf(doc);
    doc.getOutline().then(
      (o) => {
        setHasOutline(!!o?.length);
        // open by default, except on phones where it would take the page's space
        setShowOutline(!!o?.length && matchMedia("(min-width: 768px)").matches);
      },
      () => {},
    );
  }

  function onSearch(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const term = (new FormData(e.currentTarget).get("q") as string).trim();
    searching.current?.abort();
    if (!pdf || !term) return setSearch(null);
    const controller = new AbortController();
    searching.current = controller;
    setSearch({ term, matches: [], searched: 0 });
    let first = true;
    searchPages(
      pdf,
      term,
      (p, found) => {
        setSearch((s) => s && { ...s, searched: p, matches: found ? [...s.matches, p] : s.matches });
        // jump to the first hit right away, the rest is collected in the background
        if (found && first) {
          first = false;
          setPage(p);
        }
      },
      controller.signal,
    ).catch(() => {});
  }

  // the next or previous page with a hit, wrapping around
  function step(dir: 1 | -1) {
    const m = search?.matches ?? [];
    if (m.length === 0) return;
    const next = dir > 0 ? (m.find((p) => p > page) ?? m[0]) : (m.findLast((p) => p < page) ?? m[m.length - 1]);
    setPage(next);
  }

  const highlight = search?.term ? new RegExp(escapeRegExp(escapeHtml(search.term)), "gi") : null;
  const done = search && search.searched >= pages;

  return (
    <>
      <Breadcrumb path={path} />
      <div className="mt-4 flex flex-wrap items-center gap-2 border-b border-line pb-3">
        {hasOutline && (
          <Button size="sm" aria-label="Contents" aria-pressed={showOutline} title="Contents" onClick={() => setShowOutline(!showOutline)}>
            <BsListNested />
          </Button>
        )}
        {pages > 1 && (
          <div className="flex items-center gap-2">
            <Button size="sm" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <BsChevronLeft />
            </Button>
            <span className="flex items-center gap-1.5 text-sm text-muted tabular-nums">
              Page:
              <input
                key={page}
                type="number"
                aria-label="Page"
                min={1}
                max={pages}
                defaultValue={page}
                className="h-8 w-16 rounded border border-line bg-surface px-1.5 text-center text-ink"
                onKeyDown={(e) => {
                  const n = Number(e.currentTarget.value);
                  if (e.key === "Enter" && n >= 1 && n <= pages) setPage(n);
                }}
              />
              of {pages}
            </span>
            <Button size="sm" aria-label="Next page" disabled={page >= pages} onClick={() => setPage(page + 1)}>
              <BsChevronRight />
            </Button>
          </div>
        )}
        {pdf && (
          <form role="search" onSubmit={onSearch} className="flex items-center gap-1.5">
            <div className="relative">
              <BsSearch aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted" />
              <input name="q" type="search" aria-label="Search in the document" placeholder="Search" className="h-8 w-44 rounded border border-line bg-surface pr-2 pl-8 text-sm text-ink placeholder:text-muted/70 focus:border-ink focus:outline-none" />
            </div>
            {search && (
              <>
                <span className="text-sm text-muted tabular-nums" aria-live="polite">
                  {search.matches.length} {search.matches.length === 1 ? "page" : "pages"}
                  {!done && ` · ${search.searched}/${pages}`}
                </span>
                <Button size="sm" aria-label="Previous match" disabled={search.matches.length === 0} onClick={() => step(-1)}>
                  <BsChevronUp />
                </Button>
                <Button size="sm" aria-label="Next match" disabled={search.matches.length === 0} onClick={() => step(1)}>
                  <BsChevronDown />
                </Button>
              </>
            )}
          </form>
        )}
        <div className="flex-1" />
        {pdf && (
          <Button
            size="sm"
            disabled={printing}
            onClick={() => {
              setPrinting(true);
              print(pdf).finally(() => setPrinting(false));
            }}
          >
            <BsPrinter aria-hidden /> Print
          </Button>
        )}
        {iosApp ? (
          pdf && (
            <Button size="sm" onClick={() => share(pdf, file.name)}>
              <BsShare aria-hidden /> Share
            </Button>
          )
        ) : (
          <>
            <a className={buttonClass("secondary", "sm")} href={documentUrl(file.id)} download={`${file.name}.pdf`}>
              <BsDownload aria-hidden /> PDF
            </a>
            <a className={buttonClass("secondary", "sm")} href={documentUrl(file.id, "rmdoc")} download={`${file.name}.rmdoc`}>
              <BsDownload aria-hidden /> .rmdoc
            </a>
          </>
        )}
      </div>

      <div ref={ref} className="min-h-0 flex-1 py-6">
        {/* without suspense the error props apply, otherwise a broken file takes down the whole page */}
        <Document
          suspense={false}
          file={documentUrl(file.id)}
          onLoadSuccess={onLoad}
          onLoadProgress={(p) => setLoaded(p.loaded)}
          // contents entries and links inside the document
          onItemClick={({ pageNumber }) => setPage(pageNumber)}
          loading={<Loading loaded={loaded} />}
          error={<Alert>Failed to load the document.</Alert>}
          className="flex h-full gap-6"
        >
          {showOutline && (
            <nav
              aria-label="Contents"
              className="w-72 shrink-0 overflow-auto border-r border-line pr-3 text-sm [&_a]:block [&_a]:cursor-pointer [&_a]:truncate [&_a]:rounded [&_a]:px-2 [&_a]:py-1 [&_a:hover]:bg-line/60 [&_ul_ul]:pl-3"
            >
              <Outline />
            </nav>
          )}
          <div className="min-w-0 flex-1">
            {height > 0 && (
              <Page
                suspense={false}
                pageNumber={page}
                height={height}
                customTextRenderer={highlight ? ({ str }) => escapeHtml(str).replace(highlight, (m) => `<mark>${m}</mark>`) : undefined}
              />
            )}
          </div>
        </Document>
      </div>
    </>
  );
}
