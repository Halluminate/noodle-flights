import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import { FlightProviderWrapper } from "@/providers/flight-provider-wrapper";
import { MenuBarWithLoading } from "@/components/menu-bar-with-loading";

const roboto = Roboto({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Noodle Flights",
  description: "A deterministic flight search demo built with Next.js.",
  icons: {
    icon: "/hicon.svg",
    apple: "/hicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`bg-[#202124] ${roboto.className}`} suppressHydrationWarning>
        <FlightProviderWrapper>
          <MenuBarWithLoading />
          <div className="pt-16">
            {children}
          </div>
        </FlightProviderWrapper>
      </body>
    </html>
  );
}
