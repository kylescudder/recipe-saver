import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ModeToggle } from '../ui/dark-mode-toggle'

export default function Topbar({ account }: { account: ReactNode }) {
  return (
    <nav className='site-header' aria-label='Main navigation'>
      <Link to='/' className='wordmark'>
        <img
          src='/logo.svg'
          alt=''
          height={40}
          width={40}
          className='h-10 w-10 shrink-0 max-md:h-[33px] max-md:w-[33px]'
        />
        <span>Recipe Saver</span>
      </Link>
      <div className='header-actions'>
        <ModeToggle />
        {account}
      </div>
    </nav>
  )
}
