import React from 'react';
import { Text, View } from 'react-native';
import { render } from '@testing-library/react-native';
import { MobilePrimitives } from './MobilePrimitives';

describe('MobilePrimitives', () => {
  it('renders ScreenShell with children', () => {
    const { getByText } = render(<MobilePrimitives.ScreenShell><Text>Hello</Text></MobilePrimitives.ScreenShell>);
    expect(getByText('Hello')).toBeTruthy();
  });

  it('renders SectionHeader with title and body', () => {
    const { getByText } = render(<MobilePrimitives.SectionHeader eyebrow="EYEBROW" title="Title" body="Body text" />);
    expect(getByText('Title')).toBeTruthy();
    expect(getByText('Body text')).toBeTruthy();
  });

  it('renders PremiumPanel with children', () => {
    const { getByText } = render(<MobilePrimitives.PremiumPanel><Text>Premium</Text></MobilePrimitives.PremiumPanel>);
    expect(getByText('Premium')).toBeTruthy();
  });

  it('renders InfoCard with icon, title, and body', () => {
    const { getByText } = render(<MobilePrimitives.InfoCard icon="car" title="Ride" body="Book a ride" />);
    expect(getByText('Ride')).toBeTruthy();
    expect(getByText('Book a ride')).toBeTruthy();
  });

  it('renders MetricTile with label and value', () => {
    const { getByText } = render(<MobilePrimitives.MetricTile label="Distance" value="12 km" />);
    expect(getByText('Distance')).toBeTruthy();
    expect(getByText('12 km')).toBeTruthy();
  });

  it('renders StatusPill with label', () => {
    const { getByText } = render(<MobilePrimitives.StatusPill label="In Progress" />);
    expect(getByText('In Progress')).toBeTruthy();
  });

  it('renders StateNotice with loading indicator', () => {
    const { getByTestId } = render(<MobilePrimitives.StateNotice icon="car" title="Loading..." loading testID="state-notice" />);
    expect(getByTestId('state-notice')).toBeTruthy();
  });

  it('renders PrimaryButton with label and icon', () => {
    const { getByText } = render(<MobilePrimitives.PrimaryButton label="Continue" icon="arrow-forward" onPress={() => {}} />);
    expect(getByText('Continue')).toBeTruthy();
  });

  it('renders ActionRow with label and value', () => {
    const { getByText } = render(<MobilePrimitives.ActionRow icon="car" label="Ride" value="2 km" onPress={() => {}} />);
    expect(getByText('Ride')).toBeTruthy();
    expect(getByText('2 km')).toBeTruthy();
  });

  it('renders RoutePreview with endpoints and stats', () => {
    const { getByText } = render(<MobilePrimitives.RoutePreview from="Amman" to="Zarqa" eta="25 min" distance="22 km" />);
    expect(getByText('Amman')).toBeTruthy();
    expect(getByText('Zarqa')).toBeTruthy();
    expect(getByText('25 min')).toBeTruthy();
    expect(getByText('22 km')).toBeTruthy();
  });
});
