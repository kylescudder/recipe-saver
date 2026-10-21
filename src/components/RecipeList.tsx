'use client'

import AddRecipe from './forms/AddRecipe'
import { Button } from '@/components/ui/button'
import { DataTableColumnHeader } from '@/components/ui/data-table-header'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { IRecipe } from '@/lib/models/recipe'
import { ColumnDef } from '@tanstack/react-table'

import React, { useEffect, useRef, useState } from 'react'
import { IconDots } from '@tabler/icons-react'
import { trpc } from '@/lib/trpc'
import { toast } from 'sonner'
import { IconFilePlus, IconSearch } from '@tabler/icons-react'
import { Input } from '@/components/ui/input'
import { DataTable } from '@/components/ui/data-table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from '@/components/ui/drawer'
import { useMediaQuery } from '@/hooks/use-media-query'

export default function RecipeList() {
  const query = trpc.recipes.list.useQuery()
  const recipes = query.data ?? []
  const utils = trpc.useUtils()
  const archive = trpc.recipes.archive.useMutation({
    onSuccess: () => utils.recipes.list.invalidate(),
    onError: () => toast.error('Could not archive recipe. Please try again.')
  })
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [filteredRecords, setFilteredRecords] = useState(recipes)
  const [searchOpen, setSearchOpen] = React.useState(false)
  const filterColumns = ['recipeName']

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
  }

  const onDelete = async (recipe: IRecipe) => {
    try {
      await archive.mutateAsync(recipe._id)
      toast('Recipe archived!')
    } catch {
      /* mutation reports the error */
    }
  }

  const handleSearchClickOpen = () => {
    setSearchOpen(true)
    focusRef.current?.focus()
  }

  useEffect(() => {
    const performFiltering = () => {
      if (searchValue !== '') {
        const lowercaseSearchValue = searchValue.toLowerCase()
        const filtered = recipes.filter((record: IRecipe) =>
          filterColumns.some((element) => {
            const value = (record as any)[element]

            if (
              value !== null &&
              !(Array.isArray(value) && value.length === 0)
            ) {
              if (typeof value === 'string') {
                return value.toLowerCase().includes(lowercaseSearchValue)
              } else if (Array.isArray(value)) {
                return value.some((item: string) =>
                  item.toLowerCase().includes(lowercaseSearchValue)
                )
              }
            }

            return false
          })
        )
        return filtered
      } else {
        return recipes
      }
    }

    const filtered = performFiltering()

    // Only update if the filtered result is different
    if (JSON.stringify(filtered) !== JSON.stringify(filteredRecords)) {
      setFilteredRecords(filtered)
    }
  }, [searchValue, recipes])

  const focusRef = useRef<HTMLInputElement>(null)
  const isDesktop = useMediaQuery('(min-width: 768px)')
  type CustomColumnDef<TData> = ColumnDef<TData> & {
    title?: string
  }

  const columns: CustomColumnDef<IRecipe>[] = [
    {
      accessorKey: 'recipeName',
      title: 'Name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Name' />
      )
    },
    {
      accessorKey: 'recipeSource',
      title: 'Source',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Source' />
      ),
      cell: ({ row }) => {
        const recipe = row.original

        if (recipe.recipeLink) {
          return (
            <a
              href={recipe.recipeLink}
              target='_blank'
              rel='noopener noreferrer'
              className='text-primary hover:underline'
            >
              {recipe.recipeLink}
            </a>
          )
        } else {
          return `${recipe.recipeBook}, ${recipe.recipePageNo}`
        }
      }
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const recipe = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' className='h-8 w-8 p-0'>
                <span className='sr-only'>Open menu</span>
                <IconDots className='h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onDelete(recipe)}>
                Archive Recipe
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      }
    }
  ]

  if (query.isPending) return <p role='status'>Loading recipes…</p>
  if (query.isError)
    return (
      <div role='alert'>
        Could not load recipes.{' '}
        <Button onClick={() => query.refetch()}>Retry</Button>
      </div>
    )

  return (
    <div>
      <div className='mb-4 flex'>
        {isDesktop ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button id='add-button'>
                <IconFilePlus width={24} height={24} strokeLinejoin='miter' />
              </Button>
            </DialogTrigger>
            <DialogContent className='sm:max-w-[425px]'>
              <DialogHeader>
                <DialogTitle>Add Recipe</DialogTitle>
              </DialogHeader>
              <AddRecipe
                open={handleOpenChange} // Pass the function directly
              />
            </DialogContent>
          </Dialog>
        ) : (
          <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>
              <Button id='add-button'>
                <IconFilePlus width={24} height={24} strokeLinejoin='miter' />
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader className='text-left'>
                <DrawerTitle>Add Recipe</DrawerTitle>
              </DrawerHeader>
              <AddRecipe
                open={handleOpenChange} // Pass the function directly
              />
            </DrawerContent>
          </Drawer>
        )}
        <div
          className={`relative ${
            searchOpen ? 'w-4/5' : 'w-0 overflow-hidden'
          } ml-auto transition-all duration-300 ease-in-out`}
        >
          <Input
            ref={focusRef}
            placeholder='Search...'
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className={`${searchOpen ? 'w-full' : 'w-0'} pl-2`}
          />
        </div>
        <Button
          id='search-button'
          className={`${searchOpen ? 'hidden' : 'ml-auto'}`}
          onClick={handleSearchClickOpen}
        >
          <IconSearch width={24} height={24} strokeLinejoin='miter' />
        </Button>
      </div>
      <DataTable columns={columns} data={filteredRecords} />
    </div>
  )
}
