'use client'
import React from 'react'
import { Link } from '@tanstack/react-router'
import { IconBook2 } from '@tabler/icons-react'
import Logout from './Logout'
import { ModeToggle } from '../ui/dark-mode-toggle'

export default function Topbar() {
  return (
    <nav className='site-header' aria-label='Main navigation'>
      <Link to='/' className='wordmark'>
        <span className='brand-mark'>
          <IconBook2 stroke={1.4} size={25} />
        </span>
        <span>Recipe Saver</span>
      </Link>
      <div className='header-actions'>
        <ModeToggle />
        <Logout />
      </div>
    </nav>
  )
}
