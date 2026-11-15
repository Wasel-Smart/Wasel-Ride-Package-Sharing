import { fireEvent, render, screen } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router';
import { WaselRouteTransition } from '../../src/components/wasel-ui/WaselRouteTransition';

describe('WaselRouteTransition', () => {
  it('keeps the initial route visible and animates later navigations', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <WaselRouteTransition>
          <Routes>
            <Route path="/" element={<><p>Initial page</p><Link to="/next">Continue</Link></>} />
            <Route path="/next" element={<p>Next page</p>} />
          </Routes>
        </WaselRouteTransition>
      </MemoryRouter>,
    );

    expect(container.querySelector('.wasel-route-enter')).toBeNull();
    fireEvent.click(screen.getByRole('link', { name: 'Continue' }));
    expect(screen.getByText('Next page')).toBeTruthy();
    expect(container.querySelector('.wasel-route-enter')).not.toBeNull();
  });
});
