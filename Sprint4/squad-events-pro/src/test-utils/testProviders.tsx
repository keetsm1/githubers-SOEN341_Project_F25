import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';

type TestUserRole = 'student' | 'company' | 'admin';

export function renderWithRouter(ui: React.ReactElement, route = '/') {
    return render(
        <MemoryRouter initialEntries={[route]}>
            {ui}
        </MemoryRouter>
    );
}
