'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Button, Input } from '@mantine/core'
import { IconFilePlus, IconSearch } from '@tabler/icons-react'
import { useRouter } from 'next/navigation'
import type Tabulator from 'tabulator-tables'
import { TabulatorFull } from 'tabulator-tables'
import 'tabulator-tables/dist/css/tabulator_midnight.min.css'
import { type IRecipe } from '@/lib/models/recipe'
import { archiveRecipe } from '@/lib/actions/recipe.actions'
import FullScreenModal from './FullScreenModal'
import AddRecipe from './AddRecipe'

const newRecipe = {
  _id: '',
  recipeName: '',
  recipeLink: '',
  recipeBook: '',
  recipePageNo: '',
  archive: false
}

export function List(props: { records: any[] }) {
  const [searchValue, setSearchValue] = useState('')
  const [filteredRecords, setFilteredRecords] = useState(props.records)
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [open, setOpen] = React.useState(false)

  const handleClickOpen = () => {
    setOpen(true)
  }

  const handleSearchClickOpen = (): void => {
    setSearchOpen(true)
    focusRef.current?.focus()
  }

  const handleArchiveClick = async (id: string): Promise<void> => {
    await archiveRecipe(id)
    const nonArchivedRecords = filteredRecords.filter(
      (record) => record._id !== id
    )
    setFilteredRecords(nonArchivedRecords)
  }

  const router = useRouter()

  useEffect(() => {
    if (searchValue !== '') {
      const lowercaseSearchValue = searchValue.toLowerCase()
      const filterColumns = ['recipeName', 'recipeDescription']
      const filtered = props.records.filter((record) =>
        filterColumns.some((element) => {
          if (record[element] !== undefined) {
            return record[element].toLowerCase().includes(lowercaseSearchValue)
          }
          return false
        })
      )
      setFilteredRecords(filtered)
    } else {
      setFilteredRecords(props.records)
    }
  }, [searchValue, props.records])

  const focusRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const tabulatorOptions: Tabulator.Options = {
      responsiveLayout: 'hide',
      placeholder: 'No recipes...',
      columns: [
        {
          title: 'Recipe',
          field: 'recipeName',
          formatter: 'textarea',
          responsive: 0,
          minWidth: 150,
          cellClick: function (e, cell) {
            router.push(`/recipe/${cell.getRow().getData()._id}`)
          }
        },
        {
          title: 'Link or book',
          responsive: 1,
          minWidth: 150,
          formatter: function (cell, formatterParams, onRendered) {
            const pageNo = cell.getValue()
            const link = cell.getRow().getData().recipeLink
            const name = cell.getRow().getData().recipeName
            const book = cell.getRow().getData().recipeBook
            onRendered(function () {
              cell.checkHeight()
            })

            return pageNo && book
              ? `${name} (Page ${pageNo} of ${book})`
              : link || ''
          },
          cellClick: function (e, cell) {
            const link: string = cell.getRow().getData().recipeLink
            if (link.includes('http')) {
              router.push(link)
            }
          }
        }
      ],
      data: filteredRecords,
      layout: 'fitColumns',
      dataLoaderLoading: 'Loading'
    }
    new TabulatorFull('#tabulator-placeholder', tabulatorOptions)
  }, [filteredRecords])

  const pullOpenState = (open: boolean) => {
    setOpen(open)
  }

  return (
    <div>
      <div className='mb-4 flex'>
        <div
          className={`relative ${
            searchOpen ? 'w-full' : 'w-0 overflow-hidden'
          } ml-auto transition-all duration-300 ease-in-out`}
        >
          <Input
            ref={focusRef}
            placeholder='Search...'
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value)
            }}
            className={`${searchOpen ? 'w-full' : 'w-0'} text-dark-2 dark:text-light-2 pl-2`}
            radius='md'
            size='sm'
          />
        </div>
        <Button
          radius='md'
          className={`${
            searchOpen ? 'hidden' : 'absolute right-6'
          } hover:bg-primary-hover bg-primary-500 text-light-1`}
          onClick={handleSearchClickOpen}
        >
          <IconSearch width={24} height={24} strokeLinejoin='miter' />
        </Button>
        <Button
          radius='md'
          className='hover:bg-primary-hover bg-primary-500 text-light-1 absolute left-6'
          onClick={handleClickOpen}
        >
          <IconFilePlus width={24} height={24} strokeLinejoin='miter' />
        </Button>
      </div>
      <FullScreenModal
        open={open}
        func={pullOpenState}
        // form={props.addRecordComp}
        form={<AddRecipe recipe={newRecipe} />}
        title={`Add recipe`}
      />
      <div id='tabulator-placeholder'></div>
    </div>
  )
}
