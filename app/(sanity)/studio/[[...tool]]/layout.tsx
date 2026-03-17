import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Portfolio Studio",
  description: "Content Management",
};

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

export default Layout;
