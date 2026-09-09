import React from 'react';
import { render, screen } from '@testing-library/react-native';
import {
  ScreenShell,
  SectionHeader,
  PremiumPanel,
  InfoCard,
  MetricTile,
  StatusPill,
  StateNotice,
  PrimaryButton,
  ActionRow,
  RoutePreview,
} from './MobilePrimitives';

describe('MobilePrimitives', () => {
  it('renders ScreenShell with children', () => {
    render(<ScreenShell><React.Fragment>Hello</React.Fragment></ScreenShell>);
    expect(screen.toJSON()).toContain('Hello');
  });

  it('renders SectionHeader with title and body', () => {
    render(<SectionHeader eyebrow="EYEBROW" title="Title" body="Body text" />);
    expect(screen.toJSON()).toContain('Title');
    expect(screen.toJSON()).toContain('Body text');
  });

  it('renders PremiumPanel with children', () => {
    render(<PremiumPanel><React.Fragment>Premium</React.Fragment></PremiumPanel>);
    expect(screen.toJSON()).toContain('Premium');
  });

  it('renders InfoCard with icon, title, and body', () => {
    render(<InfoCard icon="car" title="Ride" body="Book a ride" />);
    expect(screen.toJSON()).toContain('Ride');
    expect(screen.toJSON()).toContain('Book a ride');
  });

  it('renders MetricTile with label and value', () => {
    render(<MetricTile label="Distance" value="12 km" />);
    expect(screen.toJSON()).toContain('Distance');
    expect(screen.toJSON()).toContain('12 km');
  });

  it('renders StatusPill with label', () => {
    render(<StatusPill label="In Progress" />);
    expect(screen.toJSON()).toContain('In Progress');
  });

  it('renders StateNotice with loading indicator', () => {
    render(<StateNotice icon="car" title="Loading..." loading testID="state-notice" />);
    expect(screen.getByTestId('state-notice')).toBeTruthy();
  });

  it('renders PrimaryButton with label and icon', () => {
    render(<PrimaryButton label="Continue" icon="arrow-forward" onPress={() => {}} />);
    expect(screen.toJSON()).toContain('Continue');
  });

  it('renders ActionRow with label and value', () => {
    render(<ActionRow icon="car" label="Ride" value="2 km" onPress={() => {}} />);
    expect(screen.toJSON()).toContain('Ride');
    expect(screen.toJSON()).toContain('2 km');
  });

  it('renders RoutePreview with endpoints and stats', () => {
    render(<RoutePreview from="Amman" to="Zarqa" eta="25 min" distance="22 km" />);
    expect(screen.toJSON()).toContain('Amman');
    expect(screen.toJSON()).toContain('Zarqa');
    expect(screen.toJSON()).toContain('25 min');
    expect(screen.toJSON()).toContain('22 km');
  });
});
