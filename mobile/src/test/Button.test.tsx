import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../components/Button';

describe('Button', () => {
    it('renders correctly with default props', () => {
        const { getByText } = render(<Button title="Press Me" onPress={() => { }} />);
        expect(getByText('Press Me')).toBeTruthy();
    });

    it('calls onPress when pressed', () => {
        const mockOnPress = jest.fn();
        const { getByText } = render(<Button title="Tap Me" onPress={mockOnPress} />);
        fireEvent.press(getByText('Tap Me'));
        expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('renders with a different variant', () => {
        const { getByTestId } = render(<Button title="Secondary" onPress={() => { }} variant="secondary" testID="secondary-button" />);
        expect(getByTestId('secondary-button')).toBeTruthy();
    });

    it('is disabled when disabled prop is true', () => {
        const mockOnPress = jest.fn();
        const { getByText } = render(<Button title="Disabled" onPress={mockOnPress} disabled />);
        fireEvent.press(getByText('Disabled'));
        expect(mockOnPress).not.toHaveBeenCalled();
    });
});