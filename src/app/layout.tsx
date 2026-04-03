import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TuriEats',
  description: 'Pide en línea en tus restaurantes favoritos – TuriEats',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TuriEats',
  },
  formatDetection: { telephone: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta name="theme-color" content="#0f172a" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        {/* Registra SW y captura beforeinstallprompt antes de que React hidrate */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if('serviceWorker' in navigator){
                navigator.serviceWorker.register('/sw.js').catch(function(){});
              }
              window.addEventListener('beforeinstallprompt',function(e){
                e.preventDefault();
                window.__pwaInstallPrompt=e;
                window.dispatchEvent(new Event('pwaInstallReady'));
              });
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
