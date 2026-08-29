import "./globals.css";

export const metadata = {
  title: "Finora — Motor financiero",
  description: "Diagnóstico determinista de finanzas personales. Qué hacer primero.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
