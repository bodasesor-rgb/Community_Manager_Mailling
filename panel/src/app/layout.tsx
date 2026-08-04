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
          <header className="topbar">
            <h1 className="brand">
              Bodasesor
              <span>Panel de correos · sync y plantillas</span>
            </h1>
            <nav className="nav" aria-label="Principal">
              <Link href="/contactos">Contactos</Link>
              <Link href="/plantillas">Plantillas</Link>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
