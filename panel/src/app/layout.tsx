import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bodasesor · Panel de correos",
  description: "Contactos Kommo→Brevo y creador de plantillas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <div className="app-shell">
          <div className="topbar-brand">
            <header className="topbar">
              <div className="brand-lockup">
                <img src="/logo-white.svg" alt="Bodasesor Eventos" />
                <span className="sub">Panel de correos</span>
              </div>
              <nav className="nav" aria-label="Principal">
                <Link href="/contactos">Contactos</Link>
                <Link href="/plantillas">Plantillas</Link>
              </nav>
            </header>
          </div>
          {children}
        </div>
      </body>
    </html>
  );
}
