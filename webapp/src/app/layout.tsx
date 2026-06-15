import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getAdminSession, logoutAdmin } from "./access-actions";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stream of Change in China",
  description: "SCC research webapp for Chinese seriality, transcriptions, emotions, and Danmu.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png"
  }
};

const navItems = [
  { href: "/", label: "Home" },
  { href: "/serie", label: "Serie TV" },
  { href: "/frasi", label: "Frasi" },
  { href: "/emozioni", label: "Emozioni" },
  { href: "/danmu", label: "Danmu" }
];

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppShell>{children}</AppShell>;
}

async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  const isLoggedIn = Boolean(session);

  return (
    <html lang="it">
      <body className="min-h-screen bg-paper">
        {isLoggedIn && (
          <header className="sticky top-0 z-20 border-b border-stone-200 bg-paper/95 backdrop-blur">
            <nav className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
              <Link href="/" className="block shrink-0" aria-label="Stream of Change China">
                <Image
                  src="/brand/logo.png"
                  alt="Stream of Change China"
                  width={2388}
                  height={550}
                  priority
                  className="h-10 w-auto"
                />
              </Link>
              <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm text-stone-700">
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href} className="hover:text-cinnabar">
                    {item.label}
                  </Link>
                ))}
                {session?.canEdit ? (
                  <Link href="/admin" className="font-semibold text-cinnabar hover:text-ink">
                    Admin
                  </Link>
                ) : null}
                <span className="hidden rounded-md bg-white px-3 py-1.5 text-xs text-stone-600 ring-1 ring-stone-200 md:inline-flex">
                  {session?.displayName}
                </span>
                <form action={logoutAdmin}>
                  <button type="submit" className="rounded-md border border-stone-200 bg-white px-3 py-1.5 text-sm hover:border-cinnabar hover:text-cinnabar">
                    Esci
                  </button>
                </form>
              </div>
            </nav>
          </header>
        )}
        <main className={isLoggedIn ? "mx-auto max-w-7xl px-6 py-8" : ""}>{children}</main>
      </body>
    </html>
  );
}
