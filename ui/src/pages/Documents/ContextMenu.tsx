import { useLayoutEffect, useRef, type KeyboardEvent } from "react";
import type { IconType } from "react-icons";

export type MenuItem =
  | { label: string; icon?: IconType; shortcut?: string; onSelect: () => void; disabled?: boolean; danger?: boolean }
  | "separator";

export type Menu = { x: number; y: number; items: MenuItem[] };

// leading, trailing and doubled separators, left over from conditional items
const tidy = (items: MenuItem[]) =>
  items.filter((item, i) => item !== "separator" || (i > 0 && i < items.length - 1 && items[i - 1] !== "separator"));

// a manual popover for the top layer: light dismiss of an auto popover would close it again
// on the pointerup of the right click that opened it
export default function ContextMenu({ menu, onClose }: { menu: Menu | null; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  function close() {
    opener.current?.focus();
    onClose();
  }

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !menu) return;
    if (!el.matches(":popover-open")) {
      opener.current = document.activeElement as HTMLElement | null;
      el.showPopover();
    }
    const { width, height } = el.getBoundingClientRect();
    el.style.left = `${Math.max(4, Math.min(menu.x, innerWidth - width - 4))}px`;
    el.style.top = `${Math.max(4, Math.min(menu.y, innerHeight - height - 4))}px`;
    el.querySelector<HTMLElement>("[role=menuitem]:not(:disabled)")?.focus();
  }, [menu]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const outside = (e: Event) => {
      if (!el.contains(e.target as Node)) close();
    };
    document.addEventListener("pointerdown", outside, true);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
    };
  });

  if (!menu) return null;

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape" || e.key === "Tab") {
      e.preventDefault();
      return close();
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = [...ref.current!.querySelectorAll<HTMLElement>("[role=menuitem]:not(:disabled)")];
    const i = items.indexOf(document.activeElement as HTMLElement);
    items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
  }

  return (
    <div
      ref={ref}
      popover="manual"
      role="menu"
      onKeyDown={onKeyDown}
      className="fixed inset-auto m-0 min-w-52 rounded-md border border-line bg-surface p-1 text-sm text-ink shadow-lg"
    >
      {tidy(menu.items).map((item, i) =>
        item === "separator" ? (
          <div key={i} role="separator" className="my-1 border-t border-line" />
        ) : (
          <button
            key={i}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            className={`flex w-full cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 text-left hover:bg-line/60 focus:bg-line/60 focus:outline-none disabled:pointer-events-none disabled:opacity-40 ${item.danger ? "text-danger" : ""}`}
            onClick={() => {
              // back to the list first, the action may move the focus on (e.g. into a rename field)
              close();
              item.onSelect();
            }}
          >
            {item.icon ? <item.icon aria-hidden className="shrink-0" /> : <span className="w-[1em]" />}
            <span className="flex-1">{item.label}</span>
            {item.shortcut && <kbd className="font-sans text-xs text-muted">{item.shortcut}</kbd>}
          </button>
        ),
      )}
    </div>
  );
}
