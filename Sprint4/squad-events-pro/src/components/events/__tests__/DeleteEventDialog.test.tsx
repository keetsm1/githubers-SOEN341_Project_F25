import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DeleteEventDialog from '../DeleteEventDialog';
import type { Event } from '@/services/database';

const baseEvent: Event = {
    id: 'event-1',
    title: 'Hackathon',
    description: 'A cool hackathon',
    date: new Date().toISOString(),
    location: 'Main Hall',
    category: 'Tech',
    organizerId: 'org-1',
    organizerName: 'Tech Club',
    maxCapacity: 100,
    currentAttendees: 10,
    imageUrl: undefined,
    tags: [],
    isApproved: true,
    createdAt: new Date().toISOString(),
};

describe('DeleteEventDialog', () => {
    it('renders dialog content when open', () => {
        render(
            <DeleteEventDialog
                event={baseEvent}
                open={true}
                onOpenChange={jest.fn()}
                onConfirm={jest.fn()}
            />
        );

        expect(screen.getByText(/Are you sure\?/i)).toBeInTheDocument();
        expect(screen.getByText(/Hackathon/)).toBeInTheDocument();
    });

    it('calls onConfirm and closes dialog when Delete is clicked', async () => {
        const onConfirm = jest.fn().mockResolvedValue(undefined);
        const onOpenChange = jest.fn();

        render(
            <DeleteEventDialog
                event={baseEvent}
                open={true}
                onOpenChange={onOpenChange}
                onConfirm={onConfirm}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: /Delete/i }));

        await waitFor(() => {
            expect(onConfirm).toHaveBeenCalledWith('event-1');
        });

        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('does not call onConfirm if event is null', async () => {
        const onConfirm = jest.fn();

        render(
            <DeleteEventDialog
                event={null}
                open={true}
                onOpenChange={jest.fn()}
                onConfirm={onConfirm}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: /Delete/i }));

        await waitFor(() => {
            expect(onConfirm).not.toHaveBeenCalled();
        });
    });
});
