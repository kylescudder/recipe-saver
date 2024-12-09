import '@/styles/globals.css'
import React from 'react'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { dark } from '@clerk/themes'
import Topbar from '@/components/shared/Topbar'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  themeColor: '#877EFF'
}

export const metadata: Metadata = {
  title: 'Recipe Saver',
  description:
    "A site for saving recipes so we don't keep buying ingredients then not using them"
}

export default async function RootLayout({
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
        <body className={inter.className}>
          <ThemeProvider
            attribute='class'
            defaultTheme='system'
            enableSystem
            disableTransitionOnChange
          >
            <Topbar />
            <main className='flex flex-row'>
              <section className='bg-dark-1 flex min-h-screen flex-1 flex-col items-center px-6 pb-10 pt-28 max-md:pb-32 sm:px-10'>
                <div className='w-full max-w-4xl'>{children}</div>
              </section>
            </main>
          </ThemeProvider>
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  )
}
