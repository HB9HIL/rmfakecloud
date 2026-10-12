import { useEffect, useState } from "react";
import { BsCircleHalf, BsMoon, BsSun } from "react-icons/bs";

import { Button } from "./ui";

const themes = ["system", "light", "dark"] as const;
type Theme = (typeof themes)[number];
const icons = { system: BsCircleHalf, light: BsSun, dark: BsMoon };

// index.html applies the stored theme before the first paint
function current(): Theme {
  const t = document.documentElement.dataset.theme;
  return t === "light" || t === "dark" ? t : "system";
}

// the browser bar and status bar follow a chosen theme too, index.html sets them by the system's
const paper = { light: "#f6f4ef", dark: "#161513" };

export default function ThemeToggle() {
  const [theme, setTheme] = useState(current);

  useEffect(() => {
    for (const m of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
      m.content = paper[theme === "system" ? (m.media.includes("dark") ? "dark" : "light") : theme];
    }
  }, [theme]);

  function next() {
    const t = themes[(themes.indexOf(theme) + 1) % themes.length];
    const root = document.documentElement;
    if (t === "system") delete root.dataset.theme;
    else root.dataset.theme = t;
    try {
      if (t === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", t);
    } catch {
      // storage blocked, the choice lasts until reload
    }
    setTheme(t);
  }

  const Icon = icons[theme];
  return (
    <Button variant="ghost" size="sm" onClick={next} title={`Theme: ${theme}`} aria-label={`Theme: ${theme}`}>
      <Icon />
    </Button>
  );
}
