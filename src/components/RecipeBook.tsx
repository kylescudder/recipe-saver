import type { ReactNode } from 'react'
import { IconBook2 } from '@tabler/icons-react'

function KitchenDrawing() {
  return (
    <svg
      className='kitchen-drawing'
      viewBox='0 0 320 240'
      fill='none'
      aria-hidden='true'
    >
      <g
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        <path
          d='M57 162c19-8 47-9 71-3 15 4 21 13 16 24-5 12-25 25-47 26-20 0-41-10-46-23-4-9-1-18 6-24Z'
          fill='var(--drawing-fill)'
        />
        <path d='M56 163c-7-8-8-18-3-24 7-7 19-2 24 6m-19 22c18 7 53 5 79-2M96 176c-1 10-1 19 2 27m-35-29c4 10 11 18 21 24m43-25c-3 10-9 17-18 22' />
        <path d='M80 144c-8-21-7-43 8-62m-8 61c-4-17-21-21-26-33 14-1 23 10 25 21m3-16c-4-13-17-22-16-35 14 4 20 17 17 26m3-10c-1-14 8-30 20-34 2 14-8 27-20 34m-4 28c10-17 22-20 29-34-15-2-27 10-29 22' />
        <path
          d='M166 169c-10-23-1-45 20-50 14-4 30 4 32 20 2 20-21 43-39 42-5 0-10-5-13-12Z'
          fill='var(--drawing-fill)'
        />
        <path d='M181 125c-3-9-9-15-15-16m16 16c2-10 10-13 16-14m-17 15-12 1m14-1 11 7m-15 1-1 8m-8 9c-3 8-2 16 3 19' />
        <path
          d='M201 187c11-10 27-11 38-4 6 5 13 17 6 27-8 9-25 10-38 4-10-5-14-16-6-27Z'
          fill='var(--drawing-fill)'
        />
        <path d='M204 188c10 0 25 9 35 21m-30-20c7 0 16 5 20 10m-17-6 1 10m5-5 1 9m7-6 0 9' />
        <path d='m220 162 26-96c3-9 8-14 13-12 6 2 6 9 3 17l-35 93m18-99 12 4' />
        <path d='M238 133c8-13 24-14 29-29-15 0-23 11-29 29m-4 14c14-10 28-6 37-18-16-6-28 1-37 18m9-31c-5-10-13-15-10-28 12 4 15 14 10 28' />
        <path d='M47 218c62 8 145 9 219 1' opacity='.4' />
      </g>
    </svg>
  )
}

export default function RecipeBook({ children }: { children: ReactNode }) {
  return (
    <div className='recipe-book'>
      <aside className='book-intro'>
        <div className='book-inscription'>
          <IconBook2 size={19} stroke={1.4} /> The household recipe book
        </div>
        <h2>
          Good food.
          <br />
          Worth keeping.
        </h2>
        <p className='book-intro-copy'>
          The website you always go back to. The page with the flour on it. All
          your favourites, in one place.
        </p>
        <KitchenDrawing />
        <div className='kitchen-note'>
          A little collection.
          <br />
          Many good meals.
        </div>
        <div className='intro-page-footer'>
          Collected together. Cooked with love.
        </div>
      </aside>
      <section className='book-page'>{children}</section>
    </div>
  )
}
