import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resume Customizer",
  description: "Tailor your resume to any job description using AI.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
