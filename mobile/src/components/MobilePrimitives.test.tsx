import React from 'react';
import { Text, View } from 'react-native';
import TestRenderer from 'react-test-renderer';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 0, Medium: 1, Heavy: 2 },
}));

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
    const renderer = TestRenderer.create(<ScreenShell><Text>Hello</Text></ScreenShell>);
    expect(JSON.stringify(renderer.toJSON())).toContain('Hello');
  });

  it('renders SectionHeader with title and body', () => {
    const renderer = TestRenderer.create(<SectionHeader eyebrow="EYEBROW" title="Title" body="Body text" />);
    const tree = JSON.stringify(renderer.toJSON());
    expect(tree).toContain('Title');
    expect(tree).toContain('Body text');
  });

  it('renders PremiumPanel with children', () => {
    const renderer = TestRenderer.create(<PremiumPanel><Text>Premium</Text></PremiumPanel>);
    expect(JSON.stringify(renderer.toJSON())).toContain('Premium');
  });

  it('renders InfoCard with icon, title, and body', () => {
    const renderer = TestRenderer.create(<InfoCard icon="car" title="Ride" body="Book a ride" />);
    const tree = JSON.stringify(renderer.toJSON());
    expect(tree).toContain('Ride');
    expect(tree).toContain('Book a ride');
  });

  it('renders MetricTile with label and value', () => {
    const renderer = TestRenderer.create(<MetricTile label="Distance" value="12 km" />);
    const tree = JSON.stringify(renderer.toJSON());
    expect(tree).toContain('Distance');
    expect(tree).toContain('12 km');
  });

  it('renders StatusPill with label', () => {
    const renderer = TestRenderer.create(<StatusPill label="In Progress" />);
    expect(JSON.stringify(renderer.toJSON())).toContain('In Progress');
  });

  it('renders StateNotice with loading indicator', () => {
    const renderer = TestRenderer.create(<StateNotice icon="car" title="Loading..." loading testID="state-notice" />);
    const tree = JSON.stringify(renderer.toJSON());
    expect(tree).toContain('state-notice');
  });

  it('renders PrimaryButton with label and icon', () => {
    const renderer = TestRenderer.create(<PrimaryButton label="Continue" icon="arrow-forward" onPress={() => {}} />);
    expect(JSON.stringify(renderer.toJSON())).toContain('Continue');
  });

  it('renders ActionRow with label and value', () => {
    const renderer = TestRenderer.create(<ActionRow icon="car" label="Ride" value="2 km" onPress={() => {}} />);
    const tree = JSON.stringify(renderer.toJSON());
    expect(tree).toContain('Ride');
    expect(tree).toContain('2 km');
  });

  it('renders RoutePreview with endpoints and stats', () => {
    const renderer = TestRenderer.create(<RoutePreview from="Amman" to="Zarqa" eta="25 min" distance="22 km" />);
    const tree = JSON.stringify(renderer.toJSON());
    expect(tree).toContain('Amman');
    expect(tree).toContain('Zarqa');
    expect(tree).toContain('25 min');
    expect(tree).toContain('22 km');
  });
});
