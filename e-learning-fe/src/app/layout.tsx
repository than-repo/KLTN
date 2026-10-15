import type { Metadata } from "next";
import { AuthProvider } from "@/providers/auth-provider";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "E-Learning System",
  description: "Learn, teach, and manage online courses in one platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
