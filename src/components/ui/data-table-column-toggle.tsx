'use client'
import { DropdownMenuTrigger } from '@radix-ui/react-dropdown-menu'
import { type Table, type Column } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { IconAdjustmentsHorizontal } from '@tabler/icons-react'

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>
}

export function DataTableViewOptions<TData>({
  table
}: DataTableViewOptionsProps<TData>) {
  // Helper function to get a user-friendly column label
  const getColumnLabel = (column: Column<TData, unknown>): React.ReactNode => {
    if (
      column.columnDef &&
      'title' in column.columnDef &&
      column.columnDef.title
    ) {
      return column.columnDef.title as React.ReactNode
    }

    const id = column.id
    return id
      .replace(/([A-Z])/g, ' $1') // Insert space before capital letters
      .replace(/^./, (char) => char.toUpperCase()) // Capitalize first letter
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='outline' size='sm' className='ml-auto h-8 lg:flex'>
          <IconAdjustmentsHorizontal className='mr-2 h-4 w-4' />
          View
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-[150px]'>
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          .filter(
            (column) =>
              typeof column.accessorFn !== 'undefined' && column.getCanHide()
          )
          .map((column) => {
            return (
              <DropdownMenuCheckboxItem
                key={column.id}
                className='capitalize'
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
              >
                {getColumnLabel(column)}
              </DropdownMenuCheckboxItem>
            )
          })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
