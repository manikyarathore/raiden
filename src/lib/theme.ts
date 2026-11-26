export type Mode = "system" | "light" | "dark";
const KEY = "raiden.theme";
export const theme = {
  mode(): Mode { try { return (localStorage.getItem(KEY) as Mode) || "system"; } catch { return "system"; } },
  resolved(): "light" | "dark" {
    const m = theme.mode();
    return m === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : m;
  },
  apply() {
    const r = theme.resolved();
    document.documentElement.dataset.theme = r;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", r === "dark" ? "#0b0c10" : "#f2f3f7");
    import("@capacitor/status-bar").then(({ StatusBar, Style }) =>
      StatusBar.setStyle({ style: r === "dark" ? Style.Dark : Style.Light }).then(() => StatusBar.setBackgroundColor({ color: r === "dark" ? "#0b0c10" : "#f2f3f7" }))
    ).catch(() => {});
  },
  set(m: Mode) { try { localStorage.setItem(KEY, m); } catch { /* */ } theme.apply(); },
};
