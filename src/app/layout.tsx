import type { Metadata } from "next";
import { fraunces, ibmPlexSans, ibmPlexMono } from "@/lib/fonts";
import "./globals.css";
import Providers from "@/components/providers";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "PCC Guard Attendance Portal",
  description: "Security Guard Attendance Management System for Pentecost Convention Centre",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "h-full",
        "antialiased",
        fraunces.variable,
        ibmPlexSans.variable,
        ibmPlexMono.variable
      )}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
