'use client'

import React from 'react'
import Link from 'next/link'
import { IconHomeHeart } from '@tabler/icons-react'
import Logout from './Logout'
import { ModeToggle } from '../ui/dark-mode-toggle'

export default function Topbar() {
  return (
    <nav className='topbar'>
      <Link href='/' className='flex items-center gap-4'>
        <IconHomeHeart
          stroke={1}
          strokeLinejoin='miter'
          height={28}
          width={28}
        />
        <p className='text-light-1 max-xs:hidden text-2xl font-bold leading-6'>
          Recipe Saver
        </p>
      </Link>

      <div className='flex items-center gap-1'>
        <ModeToggle />
        <div className='block md:hidden'></div>
      </div>
      <Logout />
    </nav>
  )
}
