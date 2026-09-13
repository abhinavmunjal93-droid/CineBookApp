import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'CineBook | Premier Cinema Booking & Reserved Seating',
  description:
    'Experience cinema like never before. Real-time seat selection, IMAX 3D, Dolby Atmos, instant digital tickets with verified QR codes, and frictionless reservations.',
  keywords: 'cinema, movie tickets, IMAX, Dolby Cinema, seat selection, CineBook',
};

export const viewport: Viewport = {
  themeColor: '#07080c',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <div className="ambient-glow-top" />
          <div className="ambient-glow-cyan" />
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
            <Navbar />
            <main style={{ flex: 1 }}>{children}</main>
            <Footer />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
