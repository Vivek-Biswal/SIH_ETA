import { Geist, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist',
  subsets: ['latin'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
});

export const metadata = {
  title: 'SIH ETA — Operations & Network Intelligence',
  description: 'Dynamic Train Arrival Prediction System and Operations Cockpit',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-[#09090B] text-white antialiased overflow-hidden">
        {children}
      </body>
    </html>
  );
}
