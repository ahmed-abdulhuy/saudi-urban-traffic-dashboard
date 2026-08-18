"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function HeaderNav() {
  const pathname = usePathname();

  return (
    <nav className="site-nav">
    <Link href="/" className={pathname === "/" || pathname === "/riyadh" ? "active" : ""}>
        Home
      </Link>
      <Link href="/about" className={pathname === "/about" ? "active" : ""}>
        About
      </Link>
    </nav>
  );
}