import type { Metadata } from 'next';
import ClientLayout from '@/components/ClientLayout';
import './globals.css';

export const metadata: Metadata = {
  title: 'AiAdCrop',
  description: 'Empowering brands with AI-powered ad creation',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased bg-slate-50 text-slate-900`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
