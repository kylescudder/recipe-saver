import AccountProfile from '@/components/forms/AccountProfile'
import { currentUser } from '@clerk/nextjs/server'
import React from 'react'
import { redirect } from 'next/navigation'
import Logout from '@/components/shared/Logout'
import { type IUser } from '@/lib/models/user'
import { getUserInfo } from '@/lib/actions/user.actions'

export default async function page(): {
  const user = await currentUser()
  if (!user) return null

  const userInfo: IUser | null = await getUserInfo(user.id)
  if (!userInfo) return null

  if (userInfo?.onboarded) redirect('/')

  const userData: IUser = {
    clerkId: user.id,
    _id: userInfo?._id,
    username: userInfo
      ? userInfo?.username
      : user.emailAddresses[0].emailAddress,
    name: userInfo?.name ? userInfo?.name : (user.firstName ?? ''),
    bio: userInfo?.bio ? userInfo?.bio : '',
    image: userInfo ? userInfo.image : user?.imageUrl,
    onboarded: userInfo ? userInfo?.onboarded : false
  }
  return (
    <main className='mx-auto flex max-w-3xl flex-col justify-start px-10 py-20'>
      <div className='flex justify-between'>
        <h1 className='head-text text-3xl font-bold leading-6 text-dark-1 dark:text-light-1'>
          Onboarding
        </h1>
        <Logout />
      </div>
      <p className='mt-3 text-base font-normal leading-6 text-dark-2 dark:text-light-2'>
        Complete your profile now to use the Date Pot
      </p>
      <section className='mt-9 bg-dark-2 p-10'>
        <AccountProfile user={userData} btnTitle='Continue' />
      </section>
    </main>
  )
}
