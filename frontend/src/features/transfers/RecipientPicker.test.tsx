import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Recipient } from '@/lib/types'
import { RecipientPicker } from './RecipientPicker'

const tunde: Recipient = { name: 'Tunde Bello', account_number: '2048265201', email_masked: 't***@demo.test' }
const bola: Recipient = { name: 'Bola Ade', account_number: '3011122233', email_masked: 'b***@demo.test' }

const lookup = vi.fn()

vi.mock('@/lib/queries', () => ({
  useMe: () => ({ data: { account_number: '4151398296', email: 'ada@demo.test' } }),
  useRecentRecipients: () => ({ data: [bola] }),
  useRecipientLookup: (identifier: string | null) => lookup(identifier),
}))

function Harness({ onSelect }: { onSelect: (r: Recipient | null) => void }) {
  const [value, setValue] = useState('')
  const [selected, setSelected] = useState<Recipient | null>(null)
  return (
    <RecipientPicker
      value={value}
      onChange={setValue}
      selected={selected}
      onSelect={(r) => {
        setSelected(r)
        onSelect(r)
      }}
    />
  )
}

describe('RecipientPicker', () => {
  beforeEach(() => {
    lookup.mockImplementation((identifier: string | null) =>
      identifier === 'tunde@demo.test' || identifier === '2048265201'
        ? { isSuccess: true, isFetching: false, isError: false, data: tunde }
        : { isSuccess: false, isFetching: false, isError: false, data: undefined },
    )
  })

  it('suggests the matching account but does not select it until the user picks', async () => {
    const onSelect = vi.fn()
    render(<Harness onSelect={onSelect} />)

    await userEvent.type(screen.getByRole('combobox'), 'tunde@demo.test')

    expect(await screen.findByRole('option', { name: /Tunde Bello/ })).toBeInTheDocument()
    expect(onSelect).not.toHaveBeenCalled()
    expect(screen.queryByLabelText('Verified')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('option', { name: /Tunde Bello/ }))

    expect(onSelect).toHaveBeenCalledWith(tunde)
    expect(screen.getByLabelText('Verified')).toBeInTheDocument()
  })

  it('lets the user pick with the keyboard', async () => {
    const onSelect = vi.fn()
    render(<Harness onSelect={onSelect} />)

    await userEvent.type(screen.getByRole('combobox'), '2048265201')
    await screen.findByRole('option', { name: /Tunde Bello/ })
    expect(onSelect).not.toHaveBeenCalled()

    await userEvent.keyboard('{Enter}')

    expect(onSelect).toHaveBeenCalledWith(tunde)
  })

  it('filters recent recipients by name as the user types', async () => {
    render(<Harness onSelect={vi.fn()} />)

    await userEvent.type(screen.getByRole('combobox'), 'bol')

    expect(screen.getByRole('option', { name: /Bola Ade/ })).toBeInTheDocument()
    expect(lookup).not.toHaveBeenCalledWith('bol')
  })

  it('never looks up the user themselves', async () => {
    render(<Harness onSelect={vi.fn()} />)

    await userEvent.type(screen.getByRole('combobox'), 'ada@demo.test')

    expect(screen.getByText('You cannot send money to yourself.')).toBeInTheDocument()
    expect(lookup).not.toHaveBeenCalledWith('ada@demo.test')
  })
})
