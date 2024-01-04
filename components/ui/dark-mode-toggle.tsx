import React, { useEffect, useState } from 'react'

export const DarkModeToggle = (): JSX.Element => {
	const [isDarkMode, setIsDarkMode] = useState(false)

	useEffect(() => {
		const storedTheme = localStorage.getItem('color-theme')
		setIsDarkMode(storedTheme === 'dark')
	}, [])

	const toggleTheme = () => {
		if (isDarkMode) {
			setLightTheme()
		} else {
			setDarkTheme()
		}
	}

	const setLightTheme = () => {
		document.documentElement.classList.remove('dark')
		localStorage.setItem('color-theme', 'light')
		setIsDarkMode(false)
	}

	const setDarkTheme = () => {
		document.documentElement.classList.add('dark')
		localStorage.setItem('color-theme', 'dark')
		setIsDarkMode(true)
	}

	return (
		<div>
			<input
				type="checkbox"
				id="toggle"
				checked={isDarkMode}
				className="toggle--checkbox"
				onClick={toggleTheme}
			/>
			<label htmlFor="toggle" className="toggle--label float-right mr-2">
				<span className="toggle--label-background" />
			</label>
		</div>
	)
}
