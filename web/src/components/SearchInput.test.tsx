import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SearchInput } from './SearchInput';
import { matchesTerm } from './search';

describe('SearchInput', () => {
  it('renders a controlled search input with its placeholder and value', () => {
    render(<SearchInput value="room" onChange={vi.fn()} placeholder="Tìm phòng" />);
    const input = screen.getByPlaceholderText('Tìm phòng');

    expect(input).toHaveAttribute('type', 'search');
    expect(input).toHaveValue('room');
  });

  it('passes the new search term to onChange', () => {
    const onChange = vi.fn();
    render(<SearchInput value="" onChange={onChange} placeholder="Tìm kiếm" />);

    fireEvent.change(screen.getByPlaceholderText('Tìm kiếm'), {
      target: { value: 'A101' },
    });

    expect(onChange).toHaveBeenCalledWith('A101');
  });
});

describe('matchesTerm', () => {
  it('matches case-insensitively after trimming the term', () => {
    expect(matchesTerm('  NGUYEN  ', 'Nguyen Van A')).toBe(true);
  });

  it('matches when any searchable field contains the term', () => {
    expect(matchesTerm('090', 'Nguyen Van A', '0901234567', '079123456789')).toBe(true);
  });

  it('treats null and undefined fields as empty strings', () => {
    expect(matchesTerm('room', null, undefined, 'A101')).toBe(false);
    expect(matchesTerm('a101', null, undefined, 'A101')).toBe(true);
  });

  it('returns true for an empty or whitespace-only term', () => {
    expect(matchesTerm('', 'anything')).toBe(true);
    expect(matchesTerm('   ', undefined, null)).toBe(true);
  });
});
