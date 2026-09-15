"use client";
import { useEffect, useState } from "react";
import { Sun, Moon, Search, Download, Radio, Thermometer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/context/ThemeContext";
import { toast } from "sonner";
interface HeaderProps {
  search: string;
  setSearch: (search: string) => void;
}
function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!now) {
    return (
      <div className="flex flex-col leading-tight text-right">
      <span className="font-mono text-sm sand-text tabular-nums">
        --:--:-- AST
      </span>

        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          -- --- ---
        </span>
      </div>
    );

  }

  const timeStr = now.toLocaleTimeString("en-GB", {
    timeZone: "Asia/Riyadh",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const dateStr = now.toLocaleDateString("en-GB", {
    timeZone: "Asia/Riyadh",
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <div className="flex flex-col leading-tight text-right">
      {" "}
      <span className="font-mono text-sm sand-text tabular-nums">
        {" "}
        {timeStr} AST{" "}
      </span>{" "}
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {" "}
        {dateStr}{" "}
      </span>{" "}
    </div>
  );
}
export default function Header({ search, setSearch }: HeaderProps) {
  const { theme, toggle } = useTheme();
  const handleExport = (): void => {
    toast.success("Traffic report queued", {
      description: "Your PDF snapshot will be ready in a moment.",
    });
  };
  return (
    <header className="relative overflow-hidden rounded-2xl sand-border card-elev">
      {" "}
      <div className="absolute inset-0 grain opacity-40 pointer-events-none" />{" "}
      <div className="relative bg-card/70 glass px-5 md:px-6 py-4 flex flex-wrap items-center gap-4 justify-between">
        {" "}
        <div className="flex items-center gap-4">
          {" "}
          <div className="w-11 h-11 rounded-xl sand-bg/20 flex items-center justify-center sand-border relative">
            {" "}
            <svg
              viewBox="0 0 24 24"
              className="w-6 h-6 sand-text"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              {" "}
              <path d="M12 2L2 8l10 6 10-6-10-6zM2 16l10 6 10-6M2 12l10 6 10-6" />{" "}
            </svg>{" "}
            <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 pulse-dot" />{" "}
          </div>{" "}
          <div>
            {" "}
            <h1 className="font-display text-lg md:text-xl font-bold tracking-tight text-foreground">
              {" "}
              Riyadh Traffic Congestion Intelligence{" "}
            </h1>{" "}
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {" "}
              Riyadh Metropolitan Mobility &amp; Grid Analytics · Vision
              2030{" "}
            </p>{" "}
          </div>{" "}
        </div>{" "}
        <div className="flex items-center gap-3 flex-wrap">
          {" "}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 text-xs">
            {" "}
            <Radio className="w-3.5 h-3.5 text-emerald-500" />{" "}
            <span className="font-mono">LIVE · 1,248 sensors</span>{" "}
          </div>{" "}
          {/* <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 text-xs">
            {" "}
            <Thermometer className="w-3.5 h-3.5 sand-text" />{" "} */}
            {/*! Make Temperature Automatic Update */}
            {/* <span className="font-mono">38°C · Clear</span>{" "}
          </div>{" "} */}
          {/* <div className="relative">
            {" "}
            <Search
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />{" "}
            <Input
              data-testid="district-search-input"
              placeholder="Search district…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9 w-56 h-9 rounded-full bg-muted/40 border-border/60"
              aria-label="Search district"
            />{" "}
          </div>{" "} */}
          <Clock />{" "}
          {/* <Button
            data-testid="theme-toggle-button"
            type="button"
            variant="outline"
            size="icon"
            onClick={toggle}
            className="rounded-full h-9 w-9 sand-border"
            aria-label="Toggle theme"
          >
            {" "}
            {theme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}{" "}
          </Button>{" "} */}
          {/* <Button
            data-testid="export-report-button"
            type="button"
            onClick={handleExport}
            className="rounded-full h-9 gap-2 bg-[hsl(var(--sand))] hover:bg-[hsl(var(--sand))]/90 text-black font-medium"
          >
            {" "}
            <Download className="w-4 h-4" /> Export{" "}
          </Button>{" "} */}
        </div>{" "}
      </div>{" "}
    </header>
  );
}
