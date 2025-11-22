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

function renderSignUp() {
    const SignUp = require('../SignUp').default as React.ComponentType;
    return render(
        <MemoryRouter>
            <SignUp />
        </MemoryRouter>
    );
}

describe('SignUp', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders key sign-up fields', () => {
        renderSignUp();

        expect(screen.getByLabelText(/^Email$/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Confirm Email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /Sign Up/i })
        ).toBeInTheDocument();
    });
});
