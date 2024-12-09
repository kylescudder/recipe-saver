// app/layout.tsx
import '@/styles/globals.css'
import React from 'react'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { type Metadata } from 'next'
import { dark } from '@clerk/themes'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  themeColor: '#877EFF'
}

export const metadata: Metadata = {
  title: 'Recipe Saver',
  description:
    "A site for saving recipes so we don't keep buying ingredients then not using them"
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider
      dynamic
      appearance={{
        baseTheme: dark
      }}
    >
      <html lang='en'>
        <body className={`${inter.className}`}>{children}</body>
      </html>
    </ClerkProvider>
  )
}
