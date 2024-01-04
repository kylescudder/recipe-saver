'use client'

import React from 'react'
import { SignOutButton, SignedIn } from '@clerk/nextjs'
import { IconLogout } from '@tabler/icons-react'
import { useRouter } from 'next/navigation'

export default function Logout (): JSX.Element {
	const router = useRouter()
	return (
		<SignedIn>
			<SignOutButton signOutCallback={() => { router.push('/sign-in') }}>
				<div className="flex items-center">
					<IconLogout
						size={24}
						className="text-light-1"
						stroke={1}
						strokeLinejoin="miter"
					/>
					<p className="text-light-2 max-lg:hidden ml-2">Logout</p>
				</div>
			</SignOutButton>
		</SignedIn>
	)
}
