import React from 'react';
import { renderWithRouter } from '@/test-utils/testProviders';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import LoginForm from '../LoginForm';

const mockLogin = jest.fn();
jest.mock('@/contexts/AuthContext', () => ({
    useAuth: () => ({
        user: null,
        login: mockLogin,
        logout: jest.fn(),
        isLoading: false,
    }),
}));

const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: mockToast }),
}));

describe('LoginForm', () => {
    beforeEach(() => {
        mockLogin.mockReset();
        mockToast.mockReset();
    });

    it('renders email and password fields and a login button', () => {
        renderWithRouter(<LoginForm />);

        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /sign in/i })
        ).toBeInTheDocument();
    });

    it('calls login with entered credentials and shows success toast on success', async () => {
        mockLogin.mockResolvedValue(true);

        renderWithRouter(<LoginForm />);

        fireEvent.change(screen.getByLabelText(/email/i), {
            target: { value: 'user@example.com' },
        });
        fireEvent.change(screen.getByLabelText(/password/i), {
            target: { value: 'secret' },
        });

        fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'secret');
        });

        expect(mockToast).toHaveBeenCalled();
        const toastArgs = mockToast.mock.calls[0][0];
        expect(toastArgs.title).toMatch(/welcome/i);
    });

    it('shows error toast when login fails', async () => {
        mockLogin.mockResolvedValue(false);

        renderWithRouter(<LoginForm />);

        fireEvent.change(screen.getByLabelText(/email/i), {
            target: { value: 'bad-user@example.com' },
        });
        fireEvent.change(screen.getByLabelText(/password/i), {
            target: { value: 'wrong' },
        });

        fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalled();
        });

        const toastArgs = mockToast.mock.calls[0][0];
        expect(toastArgs.title).toMatch(/login failed/i);
    });
});
