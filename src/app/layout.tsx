import type { Metadata, Viewport } from "next";
import { Geologica } from "next/font/google";
import "./globals.css";

const geologica = Geologica({
  variable: "--font-geologica",
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Создай свою футболку | ЛП-7",
  description: "Интерактивный конструктор именной лидерской футболки для участников ЛП-7.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0e0e0e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={geologica.variable}>
      <body>{children}</body>
    </html>
  );
}
