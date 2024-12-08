'use server'

import React from 'react'
import { getRecipes } from '@/lib/actions/recipe.actions'
import { getUserInfo } from '@/lib/actions/user.actions'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { List } from '@/components/shared/List'

async function Page() {
  const user = await currentUser()
  if (!user) return <></>

  const userInfo = await getUserInfo(user.id)
  if (!userInfo?.onboarded) redirect('/onboarding')

  const recipes = await getRecipes()

  return (
    <div>
      <List records={recipes} />
    </div>
  )
}

export default Page
