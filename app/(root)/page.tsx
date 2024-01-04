'use server'

import { getRecipes } from '@/lib/actions/recipe.actions'
import { getUserInfo } from '@/lib/actions/user.actions'
import { UserButton, currentUser } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { List } from '@/components/shared/List'

async function Page() {
	const user = await currentUser()
	if (!user) return null

	const userInfo = await getUserInfo(user.id)
	if (!userInfo?.onboarded) redirect('/onboarding')
	
	const recipes = await getRecipes()

	return (
		<div>
			<List
				elements={recipes}
			/>
			<div id="tabulator-placeholder"></div>
		</div>
	)
}

export default Page
