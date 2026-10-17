import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "Pact | Max Ease",
  description:
    "Shared bills and house admin, without the awkward chats. Keep your flat running smoothly with Pact.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className} style={{ fontFamily: inter.style.fontFamily }}>
        {children}
      </body>
    </html>
  );
}
