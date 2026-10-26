import { useState } from 'react'
import {
  IconArchive,
  IconBook2,
  IconDots,
  IconExternalLink,
  IconPlus,
  IconSearch,
  IconX
} from '@tabler/icons-react'
import type { ColumnDef } from '@tanstack/react-table'
import type { IRecipe } from '@/lib/models/recipe'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTRPC } from '@/lib/trpc'
import { toast } from 'sonner'
import AddRecipe from './forms/AddRecipe'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { DataTable } from './ui/data-table'
import { DataTableColumnHeader } from './ui/data-table-header'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from './ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from './ui/dialog'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from './ui/drawer'
import { useMediaQuery } from '@/hooks/use-media-query'

function sourceLabel(recipe: IRecipe) {
  if (!recipe.recipeLink) return recipe.recipeBook
  try {
    return new URL(recipe.recipeLink).hostname.replace(/^www\./, '')
  } catch {
    return recipe.recipeLink
  }
}

export default function RecipeList() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const query = useQuery(trpc.recipes.list.queryOptions())
  const recipes = query.data ?? []
  const archive = useMutation(
    trpc.recipes.archive.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: trpc.recipes.list.queryKey()
        }),
      onError: () => toast.error('Could not archive recipe. Please try again.')
    })
  )
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const filtered = recipes.filter((recipe) =>
    recipe.recipeName.toLowerCase().includes(search.trim().toLowerCase())
  )

  async function onArchive(recipe: IRecipe) {
    try {
      await archive.mutateAsync(recipe._id)
      toast.success('Recipe archived')
    } catch {
      /* The mutation reports the error. */
    }
  }

  const columns: (ColumnDef<IRecipe> & { title?: string })[] = [
    {
      accessorKey: 'recipeName',
      title: 'Recipe',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Recipe' />
      ),
      cell: ({ row }) => (
        <span className='recipe-name'>{row.original.recipeName}</span>
      )
    },
    {
      id: 'recipeSource',
      title: 'Source',
      accessorFn: sourceLabel,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Source' />
      ),
      cell: ({ row }) => {
        const recipe = row.original
        return recipe.recipeLink ? (
          <a
            className='recipe-source website-source'
            href={recipe.recipeLink}
            target='_blank'
            rel='noopener noreferrer'
            title={recipe.recipeLink}
          >
            <span>{sourceLabel(recipe)}</span>
            <IconExternalLink size={15} aria-hidden='true' />
            <span className='sr-only'> (opens in a new tab)</span>
          </a>
        ) : (
          <div className='recipe-source book-source'>
            <IconBook2 size={16} aria-hidden='true' />
            <span>
              {recipe.recipeBook}
              {recipe.recipePageNo && (
                <span className='page-reference'>
                  Page {recipe.recipePageNo}
                </span>
              )}
            </span>
          </div>
        )
      }
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='ghost'
              size='icon'
              className='recipe-menu'
              aria-label={`Options for ${row.original.recipeName}`}
            >
              <IconDots size={20} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem
              disabled={archive.isPending}
              onClick={() => onArchive(row.original)}
            >
              <IconArchive size={16} className='mr-2' />
              Archive recipe
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ]
  const addButton = (
    <Button id='add-button' className='add-recipe-button'>
      <IconPlus size={17} aria-hidden='true' />
      Add recipe
    </Button>
  )
  const addRecipe = isDesktop ? (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{addButton}</DialogTrigger>
      <DialogContent className='recipe-dialog'>
        <DialogHeader>
          <DialogTitle>Add a recipe</DialogTitle>
          <DialogDescription>
            A website worth saving or a page worth coming back to.
          </DialogDescription>
        </DialogHeader>
        <AddRecipe open={setOpen} />
      </DialogContent>
    </Dialog>
  ) : (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{addButton}</DrawerTrigger>
      <DrawerContent className='recipe-drawer'>
        <DrawerHeader className='recipe-drawer-header'>
          <DrawerTitle>Add a recipe</DrawerTitle>
          <DrawerDescription>
            A website worth saving or a page worth coming back to.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerClose asChild>
          <Button
            variant='ghost'
            size='icon'
            className='drawer-close'
            aria-label='Close'
          >
            <IconX size={18} />
          </Button>
        </DrawerClose>
        <AddRecipe open={setOpen} />
      </DrawerContent>
    </Drawer>
  )
  return (
    <div className='recipe-index'>
      <div className='index-heading'>
        <h1>Your recipe index</h1>
        {addRecipe}
      </div>
      <p className='index-description'>
        A few favourites for whatever you feel like cooking.
      </p>
      {query.isPending ? (
        <div className='index-state' role='status'>
          Finding your recipes…
        </div>
      ) : query.isError ? (
        <div className='index-state' role='alert'>
          <h2>We couldn’t open the index.</h2>
          <p>Check your connection and try again.</p>
          <Button variant='outline' onClick={() => query.refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          toolbar={
            <div className='recipe-search'>
              <IconSearch size={18} aria-hidden='true' />
              <Input
                type='search'
                aria-label='Search recipes'
                placeholder='Find a recipe…'
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              {search && (
                <button
                  type='button'
                  aria-label='Clear search'
                  onClick={() => setSearch('')}
                >
                  <IconX size={15} />
                </button>
              )}
            </div>
          }
          emptyState={
            search ? (
              <div className='empty-index'>
                <IconSearch size={28} stroke={1.3} />
                <h2>No recipe by that name.</h2>
                <p>
                  Try another search, or find your way back to the full index.
                </p>
                <Button variant='outline' onClick={() => setSearch('')}>
                  Clear search
                </Button>
              </div>
            ) : (
              <div className='empty-index'>
                <IconBook2 size={36} stroke={1.2} />
                <h2>The first page is yours.</h2>
                <p>
                  Save a favourite from a website or cookbook to start your
                  collection.
                </p>
                <Button variant='outline' onClick={() => setOpen(true)}>
                  <IconPlus size={16} className='mr-2' />
                  Add your first recipe
                </Button>
              </div>
            )
          }
        />
      )}
      <div className='index-page-footer'>
        <span>Your household collection</span>
        <span>
          {query.isSuccess
            ? `${recipes.length} ${recipes.length === 1 ? 'recipe' : 'recipes'} to come back to`
            : 'Recipe Saver'}
        </span>
      </div>
    </div>
  )
}
