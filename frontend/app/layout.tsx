import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "Traffic Dashboard",
  description: "City traffic overview dashboard",
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({
  children,
}: RootLayoutProps): React.JSX.Element {
  return (
    <html lang="en">

      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}