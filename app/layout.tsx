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
      <body
        className={`antialiased text-slate-900 relative min-h-screen`}
        style={{
          backgroundImage: 'url(/bg.png)',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
          backgroundAttachment: 'fixed',
          backgroundColor: '#0f172a',
        }}
      >
        <div className="fixed inset-0 z-0 pointer-events-none bg-black/30" />
        <div className="relative z-10">
          <ClientLayout>{children}</ClientLayout>
        </div>
      </body>
    </html>
  );
}
