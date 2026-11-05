import Link from "next/link";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="grid size-7 place-items-center rounded-md bg-brand text-sm text-white">m</span>
          Merchant Card Showroom
        </Link>
        <nav className="flex items-center gap-4 text-sm text-muted">
          <Link href="/" className="hover:text-brand">
            目錄
          </Link>
          <a href="/sample.html" target="_blank" rel="noreferrer" className="hover:text-brand">
            sample.html ↗
          </a>
        </nav>
      </div>
    </header>
  );
}
