import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stream of Change in China",
  description: "SCC research webapp for Chinese seriality, transcriptions, emotions, and Danmu."
};

const navItems = [
  { href: "/", label: "Home" },
  { href: "/serie", label: "Serie TV" },
  { href: "/frasi", label: "Frasi" },
  { href: "/danmu", label: "Danmu" },
  { href: "/admin", label: "Admin" }
];

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className="min-h-screen">
        <header className="border-b border-stone-200 bg-paper/90">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-sm font-semibold uppercase text-ink">
              SCC
            </Link>
            <div className="flex items-center gap-5 text-sm text-stone-700">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="hover:text-cinnabar">
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
