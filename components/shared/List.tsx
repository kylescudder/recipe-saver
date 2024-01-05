'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Button, Input } from '@mantine/core'
import { IconSearch } from '@tabler/icons-react'
import { useRouter } from 'next/navigation'
import type Tabulator from 'tabulator-tables'
import {
	TabulatorFull
} from 'tabulator-tables'
import 'tabulator-tables/dist/css/tabulator_midnight.min.css'
import { type IRecipe } from '@/lib/models/recipe'
import { archiveRecipe } from '@/lib/actions/recipe.actions'

export function List (props: { records: any[] }): JSX.Element {
	const [searchValue, setSearchValue] = useState('')
	const [filteredRecords, setFilteredRecords] = useState(props.records)
	const [searchOpen, setSearchOpen] = React.useState(false)

	const handleSearchClickOpen = (): void => {
		setSearchOpen(true)
		focusRef.current?.focus()
	}

	const handleArchiveClick = async (id: string): Promise<void> => {
		await archiveRecipe(id)
		const nonArchivedRecords = filteredRecords.filter((record) => record._id !== id)
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
					field: 'recipePageNo',
					formatter: function (cell, formatterParams, onRendered) {
						const pageNo = cell.getValue()
						const link = cell.getRow().getData().recipeLink
						const name = cell.getRow().getData().recipeName
						const book = cell.getRow().getData().recipeBook
						onRendered(function () {
							cell.checkHeight()
						})

						return (pageNo && book) ? `${name} (Page ${pageNo} of ${book})` : link || ''
					},
					cellClick: function (e, cell) {
						const link: string = cell.getRow().getData().recipeLink
						if (link) {
							router.push(link)
						}
					}
				},
				{
					title: '',
					field: 'archive',
					width: 80,
					formatter: function (cell, formatterParams, onRendered) {
						// Return a string of HTML for the button
						return `<button class="mantine-UnstyledButton-root mantine-Button-root 
						bg-red-500 mantine-goncdh"><img alt="archive" src="assets/archive.svg"/></button>`
					},
					cellClick: async function (e, cell) {
						// Handle the click event here
						const recipe: IRecipe = cell.getRow().getData()
						await handleArchiveClick(recipe._id)
					}
				}
			],
			data: filteredRecords,
			layout: 'fitColumns',
			dataLoaderLoading: 'Loading'
		}
		new TabulatorFull(
			'#tabulator-placeholder',
			tabulatorOptions
		)
	}, [filteredRecords])

	return (
		<div>
			<div className="flex mb-4">
				<div
					className={`relative ${
						searchOpen ? 'w-full' : 'w-0 overflow-hidden'
					} ml-auto transition-all duration-300 ease-in-out`}
				>
					<Input
						ref={focusRef}
						placeholder="Search..."
						value={searchValue}
						onChange={(e) => { setSearchValue(e.target.value) }}
						className={`${searchOpen ? 'w-full' : 'w-0'} pl-2
            dark:text-light-2 text-dark-2`}
						radius="md"
						size="sm"
					/>
				</div>
				<Button
					radius="md"
					className={`${
						searchOpen ? 'hidden' : 'absolute right-6'
					} bg-primary-500 hover:bg-primary-hover text-light-1`}
					onClick={handleSearchClickOpen}
				>
					<IconSearch width={24} height={24} strokeLinejoin="miter" />
				</Button>
			</div>
			<div id="tabulator-placeholder"></div>
		</div>
	)
}
