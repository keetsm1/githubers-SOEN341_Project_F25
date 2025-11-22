import React from 'react';
import { renderWithRouter } from '@/test-utils/testProviders';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import EventCard from '../EventCard';
import type { Event } from '@/services/database';

jest.mock('@/contexts/AuthContext', () => ({
    useAuth: () => ({
        user: {
            id: 'user-1',
            name: 'Student User',
            email: 'student@example.com',
            role: 'student',
            isApproved: true,
        },
        login: jest.fn(),
        logout: jest.fn(),
        isLoading: false,
    }),
}));

const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: mockToast }),
}));

jest.mock('@/services/database', () => ({
    __esModule: true,
    db: {
        getStarredEvents: jest.fn().mockResolvedValue([]),
    },
    subscribeToEventRegistrationCount: jest.fn().mockReturnValue(() => {}),
}));

const baseEvent: Event = {
    id: 'event-1',
    title: 'Tech Talk',
    description: 'An awesome tech talk',
    date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    location: 'Campus Hall',
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

function renderEventCard(
    override: Partial<Event> = {},
    props: Partial<React.ComponentProps<typeof EventCard>> = {}
) {
    const event = { ...baseEvent, ...override };
    return renderWithRouter(
        <EventCard
            event={event}
            showActions
            {...props}
        />
    );
}

describe('EventCard', () => {
    it('renders event title, category, and location', () => {
        renderEventCard();

        expect(screen.getByText('Tech Talk')).toBeInTheDocument();
        expect(screen.getByText('Tech')).toBeInTheDocument();
        expect(screen.getByText(/Campus Hall/)).toBeInTheDocument();
    });

    it('shows RSVP button for a student when event is upcoming and approved', () => {
        renderEventCard();

        expect(screen.getByRole('button', { name: /RSVP/i })).toBeInTheDocument();
    });

    it('opens confirmation dialog when RSVP is clicked', async () => {
        renderEventCard();

        const rsvpButton = screen.getByRole('button', { name: /RSVP/i });
        fireEvent.click(rsvpButton);

        await waitFor(() => {
            expect(
                screen.getByRole('button', { name: /Confirm RSVP/i })
            ).toBeInTheDocument();
        });
    });

    it('shows “Event Ended” instead of RSVP for past events', () => {
        renderEventCard({
            date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        });

        expect(
            screen.getByRole('button', { name: /Event Ended/i })
        ).toBeInTheDocument();
    });
});
