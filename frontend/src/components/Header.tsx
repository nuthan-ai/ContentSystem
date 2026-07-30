import { NavLink } from "react-router-dom";
import { Moon, Sun, Sparkles, History, Settings as SettingsIcon, LayoutDashboard, FlaskConical } from "lucide-react";
import { useTheme } from "../lib/theme";
import { useMockMode } from "../lib/mode";

export function Header() {
  const { theme, toggle } = useTheme();
  const isMock = useMockMode();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
      isActive ? "" : "hover:brightness-110"
    }`;

  const linkStyle = (isActive: boolean) =>
    isActive
      ? { background: "var(--accent-bg)", color: "var(--accent)" }
      : { color: "var(--text-secondary)" };

  return (
    <header
      className="sticky top-0 z-30 border-b backdrop-blur"
      style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--surface-0) 85%, transparent)" }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-2">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: "var(--accent-bg)", color: "var(--accent)" }}
          >
            <Sparkles size={16} />
          </span>
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Research Intelligence
          </span>
          {isMock && (
            <span
              className="ml-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ background: "var(--accent-bg)", color: "var(--accent)" }}
              title="Backend unreachable — showing demo data"
            >
              <FlaskConical size={10} /> Demo data
            </span>
          )}
        </div>

        <nav className="flex items-center gap-1">
          <NavLink to="/" end className={linkClass} style={({ isActive }) => linkStyle(isActive)}>
            <LayoutDashboard size={14} /> Dashboard
          </NavLink>
          <NavLink to="/runs" className={linkClass} style={({ isActive }) => linkStyle(isActive)}>
            <History size={14} /> History
          </NavLink>
          <NavLink to="/settings" className={linkClass} style={({ isActive }) => linkStyle(isActive)}>
            <SettingsIcon size={14} /> Settings
          </NavLink>
          <button
            onClick={toggle}
            className="ml-1 rounded-lg p-2 hover:brightness-110"
            style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}
            title="Toggle theme"
          >
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </nav>
      </div>
    </header>
  );
}
