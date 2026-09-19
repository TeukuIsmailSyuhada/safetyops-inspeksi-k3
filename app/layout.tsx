import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'SafetyOps Inspect',
  description: 'MVP inspeksi alat K3 berbasis QR.',
  openGraph: {
    title: 'SafetyOps Inspect',
    description: 'Scan QR, foto dokumentasi, dan checklist inspeksi alat K3.',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SafetyOps Inspect',
    description: 'Scan QR, foto dokumentasi, dan checklist inspeksi alat K3.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${geistSans.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
