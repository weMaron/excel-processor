import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "weMaron Brains",
  description: "Advanced AI Processing Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                // Clear poisoned localStorage from previous force-dark attempt
                if (localStorage.theme === 'dark' && !window.location.search.includes('persist')) {
                  localStorage.removeItem('theme');
                }

                function applyTheme() {
                  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
                  const isDark = localStorage.theme === 'dark' || (!('theme' in localStorage) && mediaQuery.matches);
                  
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                }

                applyTheme();
                
                window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                  if (!('theme' in localStorage)) {
                    if (e.matches) document.documentElement.classList.add('dark');
                    else document.documentElement.classList.remove('dark');
                  }
                });
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body
        className={`${inter.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
