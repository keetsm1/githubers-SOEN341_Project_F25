import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithRouter } from '@/test-utils/testProviders';

jest.mock('@/lib/supabase', () => ({
    __esModule: true,
    isSupabaseEnabled: false,
    supabase: {
        auth: {
            getUser: jest.fn().mockResolvedValue({
                data: { user: null },
                error: null,
            }),
            onAuthStateChange: jest.fn().mockReturnValue({
                data: { subscription: { unsubscribe: jest.fn() } },
            }),
        },
    },
}));

const mockLogout = jest.fn();
const mockUseAuth = jest.fn();

jest.mock('@/contexts/AuthContext', () => ({
    useAuth: () => mockUseAuth(),
}));

import Navigation from '../Navigation';

describe('Navigation for student', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('shows student navigation items', () => {
        mockUseAuth.mockReturnValue({
            user: {
                id: 'user-1',
                name: 'Test User',
                email: 'test@example.com',
                role: 'student',
                isApproved: true,
            },
            login: jest.fn(),
            logout: mockLogout,
            isLoading: false,
        });

        renderWithRouter(<Navigation />);

        expect(screen.getAllByText('Home')[0]).toBeInTheDocument();
        expect(screen.getAllByText('Search Events')[0]).toBeInTheDocument();
        expect(screen.getAllByText('My Events')[0]).toBeInTheDocument();
        expect(screen.getAllByText('My Tickets')[0]).toBeInTheDocument();
    });
});

describe('Navigation for company', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('shows company navigation items', () => {
        mockUseAuth.mockReturnValue({
            user: {
                id: 'user-1',
                name: 'Test User',
                email: 'test@example.com',
                role: 'company',
                isApproved: true,
            },
            login: jest.fn(),
            logout: mockLogout,
            isLoading: false,
        });

        renderWithRouter(<Navigation />);

        expect(screen.getAllByText('My Events')[0]).toBeInTheDocument();
        expect(screen.getAllByText('Create Event')[0]).toBeInTheDocument();
        expect(screen.getAllByText('Analytics')[0]).toBeInTheDocument();
    });
});

describe('Navigation logout', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('calls logout when logout button is clicked', () => {
        mockUseAuth.mockReturnValue({
            user: {
                id: 'user-1',
                name: 'Test User',
                email: 'test@example.com',
                role: 'student',
                isApproved: true,
            },
            login: jest.fn(),
            logout: mockLogout,
            isLoading: false,
        });

        renderWithRouter(<Navigation />);

        const logoutButton = screen.getByRole('button');
        fireEvent.click(logoutButton);

        expect(mockLogout).toHaveBeenCalled();
    });
});
