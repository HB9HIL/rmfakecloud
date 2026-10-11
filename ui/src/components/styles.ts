// shared class strings, for elements that can't use the components in ui.tsx (links, selects)

const variants = {
  primary: "border-ink bg-ink text-paper hover:border-accent hover:bg-accent",
  secondary: "border-line bg-surface text-ink hover:border-ink",
  danger: "border-danger text-danger hover:bg-danger hover:text-paper",
  ghost: "border-transparent text-ink hover:bg-line/60",
};

const sizes = {
  sm: "h-8 px-2.5 text-sm",
  md: "h-10 px-4",
};

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export function buttonClass(variant: ButtonVariant = "secondary", size: ButtonSize = "md") {
  return `inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded border font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-40 ${variants[variant]} ${sizes[size]}`;
}

export const inputClass =
  "block h-10 w-full rounded border border-line bg-surface px-3 text-ink placeholder:text-muted/70 focus:border-ink focus:outline-none disabled:opacity-60";

export const cardClass = "rounded-md border border-line bg-surface";
