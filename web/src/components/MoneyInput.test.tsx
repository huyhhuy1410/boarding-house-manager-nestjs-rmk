import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MoneyInput } from './MoneyInput';

describe('MoneyInput', () => {
  it('formats raw VND digits with Vietnamese thousands separators', () => {
    render(<MoneyInput value="3000000" onChange={vi.fn()} />);

    expect(screen.getByRole('textbox')).toHaveValue('3.000.000');
  });

  it('uses a text input with numeric input mode for mobile keyboards', () => {
    render(<MoneyInput value="" onChange={vi.fn()} placeholder="Nhập tiền" />);
    const input = screen.getByPlaceholderText('Nhập tiền');

    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveAttribute('inputmode', 'numeric');
    expect(input).toHaveAttribute('autocomplete', 'off');
  });

  it('strips separators and non-digit characters before calling onChange', () => {
    const onChange = vi.fn();
    render(<MoneyInput value="" onChange={onChange} />);
    const input = screen.getByRole('textbox');

    fireEvent.change(input, { target: { value: '1.500.000 đ' } });

    expect(onChange).toHaveBeenCalledWith('1500000');
  });

  it('keeps an empty value empty', async () => {
    const onChange = vi.fn();
    render(<MoneyInput value="1500000" onChange={onChange} />);
    const input = screen.getByRole('textbox');

    expect(input).toHaveValue('1.500.000');
    await userEvent.clear(input);
    expect(onChange).toHaveBeenCalledWith('');
  });
});
