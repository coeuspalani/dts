import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DTS — Dare to Solve',
  description: 'Competitive LeetCode challenge platform',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
