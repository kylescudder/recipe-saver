import { createFileRoute } from '@tanstack/react-router'
import RecipeList from '@/components/RecipeList'
import { Authenticated } from '@/components/auth'

export const Route = createFileRoute('/')({
  component: () => (
    <Authenticated>
      <RecipeList />
    </Authenticated>
  )
})
