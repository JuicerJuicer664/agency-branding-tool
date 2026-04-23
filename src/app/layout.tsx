import React from 'react';
import type { Metadata, Viewport } from 'next';
import '../styles/index.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'Next.js with Tailwind CSS',
  description: 'A boilerplate project with Next.js and Tailwind CSS',
  icons: {
    icon: [
      { url: '/favicon.ico', type: 'image/x-icon' }
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Merriweather:ital,wght@0,400;0,700;1,400&family=EB+Garamond:ital,wght@0,400;0,700;1,400&family=Lora:ital,wght@0,400;0,700;1,400&family=Raleway:wght@400;600;700;800&family=Montserrat:wght@400;600;700&family=Inter:wght@400;600;700&family=Poppins:ital,wght@0,400;0,600;0,700;1,400&family=Nunito:wght@400;600;700&family=Oswald:wght@400;600;700&family=Bebas+Neue&family=Barlow:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:ital,wght@0,400;0,600;0,700;1,400&family=Josefin+Sans:ital,wght@0,400;0,600;0,700;1,400&family=Cinzel:wght@400;600;700&family=Bodoni+Moda:ital,wght@0,400;0,700;1,400&family=Abril+Fatface&family=Italiana&family=Tenor+Sans&family=Jost:ital,wght@0,400;0,600;0,700;1,400&family=Outfit:wght@400;600;700&family=Syne:wght@400;600;700&family=Kanit:ital,wght@0,400;0,600;0,700;1,400&family=Spectral:ital,wght@0,400;0,700;1,400&family=Cardo:ital,wght@0,400;0,700;1,400&family=Questrial&family=Titillium+Web:ital,wght@0,400;0,600;0,700;1,400&display=swap"
        />
</head>
      <body>{children}
</body>
    </html>
  );
}
