import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';

jest.mock('@/components/ui/use-toast', () => ({
    __esModule: true,
    toast: jest.fn(),
}));

jest.mock('@/lib/supabase', () => ({
    __esModule: true,
    isSupabaseEnabled: false,
    supabase: {
        auth: {
            signUp: jest.fn(),
        },
    },
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}));

function renderOrgSignUp() {
    const OrgSignUp = require('../OrgSignUp').default as React.ComponentType;
    return render(
        <MemoryRouter>
            <OrgSignUp />
        </MemoryRouter>
    );
}

describe('OrgSignUp', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders organization sign-up fields', () => {
        renderOrgSignUp();

        expect(screen.getByText(/Organization Sign Up/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Organization Name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Your Full Name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^Email$/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Confirm Email/i)).toBeInTheDocument();
    });
});
