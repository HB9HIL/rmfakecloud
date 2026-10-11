const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "short", timeStyle: "short" });

export function formatDate(date: string) {
  return dateFormat.format(new Date(date));
}

const units = ["B", "KB", "MB", "GB", "TB"];

export function formatBytes(bytes: number) {
  if (bytes <= 0) return "0 B";
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${parseFloat((bytes / 1024 ** i).toFixed(1))} ${units[i]}`;
}
