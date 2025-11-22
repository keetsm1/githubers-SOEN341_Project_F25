import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithRouter } from '@/test-utils/testProviders';
import EditEventDialog from '../EditEventDialog';
import type { Event } from '@/services/database';

const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: mockToast }),
}));

const baseEvent: Event = {
    id: 'event-1',
    title: 'Original Title',
    description: 'Original description',
    date: '2025-01-01T10:00:00.000Z',
    location: 'Original Location',
    category: 'Technology',
    organizerId: 'org-1',
    organizerName: 'Tech Club',
    maxCapacity: 50,
    currentAttendees: 5,
    imageUrl: '',
    tags: ['tag-one'],
    isApproved: true,
    createdAt: new Date().toISOString(),
};

describe('EditEventDialog', () => {
    beforeEach(() => {
        mockToast.mockReset();
    });

    it('renders initial event data when open', async () => {
        renderWithRouter(
            <EditEventDialog
                event={baseEvent}
                open={true}
                onOpenChange={jest.fn()}
                onSave={jest.fn()}
            />
        );

        const titleInput = await screen.findByLabelText(/Event Title/i);
        expect(titleInput).toHaveValue('Original Title');

        const descriptionInput = screen.getByLabelText(/Description/i);
        expect(descriptionInput).toHaveValue('Original description');
    });

    it('shows error toast when title is empty on save', async () => {
        const onSave = jest.fn();
        renderWithRouter(
            <EditEventDialog
                event={baseEvent}
                open={true}
                onOpenChange={jest.fn()}
                onSave={onSave}
            />
        );

        const titleInput = await screen.findByLabelText(/Event Title/i);

        fireEvent.change(titleInput, { target: { value: '' } });

        const saveButton = screen.getByRole('button', { name: /Save Changes/i });
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalled();
        });

        const toastArgs = mockToast.mock.calls[0][0];
        expect(toastArgs.title).toBe('Error');
        expect(toastArgs.description).toMatch(/Title is required/i);
        expect(onSave).not.toHaveBeenCalled();
    });

    it('calls onSave with updated data and closes dialog on success', async () => {
        const onSave = jest.fn().mockResolvedValue(undefined);
        const onOpenChange = jest.fn();

        renderWithRouter(
            <EditEventDialog
                event={baseEvent}
                open={true}
                onOpenChange={onOpenChange}
                onSave={onSave}
            />
        );

        const titleInput = await screen.findByLabelText(/Event Title/i);
        fireEvent.change(titleInput, { target: { value: 'Updated Title' } });

        const saveButton = screen.getByRole('button', { name: /Save Changes/i });
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(onSave).toHaveBeenCalled();
        });

        expect(onSave).toHaveBeenCalledWith(
            'event-1',
            expect.objectContaining({
                title: 'Updated Title',
            })
        );

        expect(onOpenChange).toHaveBeenCalledWith(false);

        const toastArgs = mockToast.mock.calls[0][0];
        expect(toastArgs.title).toMatch(/Success/i);
    });
});
