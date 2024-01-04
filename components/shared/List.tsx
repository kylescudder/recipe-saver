'use client'

import React from 'react'
import { type IRecipe } from '@/lib/models/recipe'
import { Button, Table } from '@mantine/core'
import { IconArchive } from '@tabler/icons-react'
import { useRouter } from 'next/navigation'

export function List (props: { elements: IRecipe[] }): JSX.Element {
	const router = useRouter()
	const rows = props.elements.map((element) => (
		<tr key={element.recipeName}>
			<td className='dark:text-white text-dark-1'>{element.recipeName}</td>
			<td className='dark:text-white text-dark-1'>{
				element.link
					? element.link
					: `${element.book} page no. ${element.pageNo}`
			}</td>
			<td className='dark:text-white text-dark-1'>
				<Button onClick={() => { router.push(`recipe/${element._id}`) }} >
					<IconArchive />
				</Button>
			</td>
		</tr>
	))

	return (
		<Table>
			<thead>
				<tr>
					<th>Recipe</th>
					<th>Location</th>
					<th></th>
				</tr>
			</thead>
			<tbody>{rows}</tbody>
		</Table>
	)
}
