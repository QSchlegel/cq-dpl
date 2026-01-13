import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'cq - CBOR Query Tool for Cardano',
  description: 'Web interface for querying and inspecting Cardano CBOR transactions',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
