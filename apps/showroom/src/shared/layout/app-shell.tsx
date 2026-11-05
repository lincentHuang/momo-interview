"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState, type ComponentType, type ReactNode, type SVGProps } from "react";
import { cn } from "@/shared/lib/cn";
import { usePreference } from "@/shared/lib/use-preference";
import {
  ChartIcon,
  CloseIcon,
  CodeIcon,
  Drawer,
  DrawerClose,
  ExternalIcon,
  GridIcon,
  MenuIcon,
  PuzzleIcon,
  SettingsIcon,
  SidebarIcon,
  Tooltip,
} from "@/shared/ui";

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** 額外視為「目前頁面」的路徑前綴（例如編輯器屬於目錄） */
  match?: string[];
}

const NAV: Array<{ heading: string; items: NavItem[] }> = [
  {
    heading: "工作區",
    items: [
      { href: "/", label: "商品卡目錄", icon: GridIcon, match: ["/cards"] },
      { href: "/modules", label: "模組庫", icon: PuzzleIcon },
    ],
  },
  {
    heading: "參考",
    items: [
      { href: "/analysis", label: "類型分析", icon: ChartIcon },
      { href: "/embed", label: "嵌入指南", icon: CodeIcon },
    ],
  },
];

const FOOTER_NAV: NavItem[] = [{ href: "/settings", label: "設定與同步", icon: SettingsIcon }];

function isActive(pathname: string, item: NavItem) {
  if (item.href === "/") return pathname === "/" || (item.match ?? []).some((p) => pathname.startsWith(p));
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/**
 * App Shell：左側 sidebar（桌機可收合成圖示列、手機為抽屜）＋ 內容區。
 * 次要資訊（類型分析、嵌入方式、同步設定）各自成頁，讓目錄與編輯器只保留主要任務。
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = usePreference<"0" | "1">("sidebar-collapsed", "0");
  const [mobileOpen, setMobileOpen] = useState(false);
  const isCollapsed = collapsed === "1";

  return (
    <div className="min-h-dvh lg:flex">
      {/* 桌機 sidebar */}
      <aside
        aria-label="側欄"
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-white transition-[width] duration-200 lg:flex",
          isCollapsed ? "w-16" : "w-60",
        )}
      >
        <div className={cn("flex h-14 items-center border-b border-line", isCollapsed ? "justify-center" : "justify-between px-4")}>
          {!isCollapsed && <Brand />}
          <Tooltip content={isCollapsed ? "展開側欄" : "收合側欄"}>
            <button
              type="button"
              onClick={() => setCollapsed(isCollapsed ? "0" : "1")}
              aria-label={isCollapsed ? "展開側欄" : "收合側欄"}
              aria-expanded={!isCollapsed}
              className="grid size-8 place-items-center rounded-md text-muted hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"
            >
              <SidebarIcon />
            </button>
          </Tooltip>
        </div>
        <SidebarNav collapsed={isCollapsed} />
      </aside>

      {/* 手機頂列 + 抽屜 */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="開啟選單"
          className="grid size-9 place-items-center rounded-md text-ink hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-brand"
        >
          <MenuIcon />
        </button>
        <Brand />
      </header>
      <Drawer open={mobileOpen} onOpenChange={setMobileOpen} title="主選單">
        <div className="flex h-14 items-center justify-between border-b border-line px-4">
          <Brand />
          <DrawerClose
            aria-label="關閉選單"
            className="grid size-8 place-items-center rounded-md text-muted hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-brand"
          >
            <CloseIcon />
          </DrawerClose>
        </div>
        <SidebarNav collapsed={false} onNavigate={() => setMobileOpen(false)} />
      </Drawer>

      <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">{children}</main>
    </div>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
      <span className="grid size-7 place-items-center rounded-md bg-brand text-sm text-white">m</span>
      Card Showroom
    </Link>
  );
}

function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  return (
    <nav aria-label="主導覽" className="flex flex-1 flex-col gap-6 overflow-y-auto p-3">
      {NAV.map((group) => (
        <div key={group.heading} className="space-y-1">
          {collapsed ? (
            <div className="mx-auto mb-2 h-px w-6 bg-line" aria-hidden />
          ) : (
            <p className="px-2 pb-1 text-[11px] font-medium tracking-wide text-muted">{group.heading}</p>
          )}
          {/* usePathname 在動態路由下可能 suspend（Cache Components）；fallback 為未高亮的連結 */}
          <Suspense fallback={<NavLinks items={group.items} collapsed={collapsed} pathname="" onNavigate={onNavigate} />}>
            <ActiveNavLinks items={group.items} collapsed={collapsed} onNavigate={onNavigate} />
          </Suspense>
        </div>
      ))}

      <div className="mt-auto space-y-1 border-t border-line pt-3">
        <Suspense fallback={<NavLinks items={FOOTER_NAV} collapsed={collapsed} pathname="" onNavigate={onNavigate} />}>
          <ActiveNavLinks items={FOOTER_NAV} collapsed={collapsed} onNavigate={onNavigate} />
        </Suspense>
        <NavRow
          collapsed={collapsed}
          label="sample.html"
          icon={ExternalIcon}
          render={(className, content) => (
            <a href="/sample.html" target="_blank" rel="noreferrer" className={className}>
              {content}
              <span className="sr-only">（另開新分頁）</span>
            </a>
          )}
        />
      </div>
    </nav>
  );
}

function ActiveNavLinks(props: { items: NavItem[]; collapsed: boolean; onNavigate?: () => void }) {
  return <NavLinks {...props} pathname={usePathname()} />;
}

function NavLinks({
  items,
  collapsed,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  collapsed: boolean;
  pathname: string;
  onNavigate?: () => void;
}) {
  return items.map((item) => {
    const active = isActive(pathname, item);
    return (
      <NavRow
        key={item.href}
        collapsed={collapsed}
        label={item.label}
        icon={item.icon}
        active={active}
        render={(className, content) => (
          <Link href={item.href} aria-current={active ? "page" : undefined} className={className} onClick={onNavigate}>
            {content}
          </Link>
        )}
      />
    );
  });
}

function NavRow({
  collapsed,
  label,
  icon: Icon,
  active = false,
  render,
}: {
  collapsed: boolean;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  active?: boolean;
  render: (className: string, content: ReactNode) => ReactNode;
}) {
  const className = cn(
    "flex h-9 items-center gap-3 rounded-md text-sm transition-colors focus-visible:outline-2 focus-visible:outline-brand",
    collapsed ? "justify-center" : "px-2.5",
    active ? "bg-brand-soft font-medium text-brand" : "text-muted hover:bg-surface-muted hover:text-ink",
  );
  const content = (
    <>
      <Icon className="shrink-0" />
      {collapsed ? <span className="sr-only">{label}</span> : <span className="truncate">{label}</span>}
    </>
  );
  const node = render(className, content);
  return collapsed ? (
    <Tooltip content={label} side="right">
      {node}
    </Tooltip>
  ) : (
    node
  );
}
