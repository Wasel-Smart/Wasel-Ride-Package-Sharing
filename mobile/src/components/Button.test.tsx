import React from 'react';
import { Text, View } from 'react-native';
import TestRenderer from 'react-test-renderer';
import { Button } from './Button';

describe('Button', () => {
  it('renders primary button with title', () => {
    const renderer = TestRenderer.create(<Button title="Press me" onPress={() => {}} />);
    expect(JSON.stringify(renderer.toJSON())).toContain('Press me');
  });

  it('renders secondary variant', () => {
    const renderer = TestRenderer.create(<Button title="Secondary" variant="secondary" onPress={() => {}} />);
    expect(JSON.stringify(renderer.toJSON())).toContain('Secondary');
  });

  it('renders ghost variant', () => {
    const renderer = TestRenderer.create(<Button title="Ghost" variant="ghost" onPress={() => {}} />);
    expect(JSON.stringify(renderer.toJSON())).toContain('Ghost');
  });

  it('renders danger variant', () => {
    const renderer = TestRenderer.create(<Button title="Delete" variant="danger" onPress={() => {}} />);
    expect(JSON.stringify(renderer.toJSON())).toContain('Delete');
  });

  it('shows loading indicator when loading', () => {
    const renderer = TestRenderer.create(<Button title="Loading" loading onPress={() => {}} testID="btn-loading" />);
    const tree = JSON.stringify(renderer.toJSON());
    expect(tree).not.toContain('Loading');
    expect(tree).toContain('btn-loading');
  });

  it('disables press when disabled', () => {
    const onPress = jest.fn();
    const renderer = TestRenderer.create(<Button title="Disabled" disabled onPress={onPress} />);
    const root = renderer.root;
    const touchable = root.findByProps({ disabled: true });
    expect(touchable).toBeTruthy();
  });

  it('applies custom style', () => {
    const renderer = TestRenderer.create(<Button title="Styled" onPress={() => {}} style={{ opacity: 0.5 }} testID="btn-styled" />);
    const root = renderer.root;
    const button = root.findByProps({ testID: 'btn-styled' });
    expect(button.props.style).toEqual(expect.objectContaining({ opacity: 0.5 }));
  });
});
