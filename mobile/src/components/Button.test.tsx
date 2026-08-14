import React from 'react';
import { Text, View } from 'react-native';
import { render } from '@testing-library/react-native';
import { Button } from './Button';

describe('Button', () => {
  it('renders primary button with title', () => {
    const { getByText } = render(<Button title="Press me" onPress={() => {}} />);
    expect(getByText('Press me')).toBeTruthy();
  });

  it('renders secondary variant', () => {
    const { getByText } = render(<Button title="Secondary" variant="secondary" onPress={() => {}} />);
    expect(getByText('Secondary')).toBeTruthy();
  });

  it('renders ghost variant', () => {
    const { getByText } = render(<Button title="Ghost" variant="ghost" onPress={() => {}} />);
    expect(getByText('Ghost')).toBeTruthy();
  });

  it('renders danger variant', () => {
    const { getByText } = render(<Button title="Delete" variant="danger" onPress={() => {}} />);
    expect(getByText('Delete')).toBeTruthy();
  });

  it('shows loading indicator when loading', () => {
    const { queryByText, getByTestId } = render(<Button title="Loading" loading onPress={() => {}} testID="btn-loading" />);
    expect(queryByText('Loading')).toBeNull();
    expect(getByTestId('btn-loading')).toBeTruthy();
  });

  it('disables press when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button title="Disabled" disabled onPress={onPress} />);
    getByText('Disabled').props.onPress?.();
    expect(onPress).not.toHaveBeenCalled();
  });

  it('applies custom style', () => {
    const { getByTestId } = render(<Button title="Styled" onPress={() => {}} style={{ opacity: 0.5 }} testID="btn-styled" />);
    expect(getByTestId('btn-styled').props.style).toEqual(expect.arrayContaining([expect.objectContaining({ opacity: 0.5 })]));
  });
});
