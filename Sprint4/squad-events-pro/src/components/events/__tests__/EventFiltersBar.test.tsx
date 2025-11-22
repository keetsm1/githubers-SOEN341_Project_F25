import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EventFiltersBar, EventFiltersState } from '../EventFilters';

const defaultState: EventFiltersState = {
    q: '',
    categories: [],
    orgIds: [],
    dateFrom: undefined,
    dateTo: undefined,
    sort: 'soonest',
};

const categoryOptions = [
    { label: 'Tech', value: 'tech' },
    { label: 'Sports', value: 'sports' },
];

const orgOptions = [
    { label: 'OpenAI', value: 'org1' },
];

describe('EventFiltersBar', () => {
    it('shows "No filters applied" when there are no active filters', () => {
        render(
            <EventFiltersBar
                state={defaultState}
                categoryOptions={categoryOptions}
                orgOptions={orgOptions}
                onChange={jest.fn()}
                onClearAll={jest.fn()}
            />
        );

        expect(
            screen.getByText(/No filters applied/i)
        ).toBeInTheDocument();
    });

    it('calls onClearAll when "Clear all" is clicked', () => {
        const onClearAll = jest.fn();

        render(
            <EventFiltersBar
                state={defaultState}
                categoryOptions={categoryOptions}
                orgOptions={orgOptions}
                onChange={jest.fn()}
                onClearAll={onClearAll}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: /Clear all/i }));
        expect(onClearAll).toHaveBeenCalled();
    });

    it('renders category chip when category is active and allows removing it', () => {
        const onChange = jest.fn();

        const stateWithCategory: EventFiltersState = {
            ...defaultState,
            categories: ['tech'],
        };

        render(
            <EventFiltersBar
                state={stateWithCategory}
                categoryOptions={categoryOptions}
                orgOptions={orgOptions}
                onChange={onChange}
                onClearAll={jest.fn()}
            />
        );

        const chip = screen.getByText(/Category: tech/i);
        expect(chip).toBeInTheDocument();

        fireEvent.click(chip);

        expect(onChange).toHaveBeenCalledWith({ categories: [] });
    });
});
