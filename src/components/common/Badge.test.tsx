import React from 'react';
import { render } from '@testing-library/react-native';
import { Badge } from './Badge';

describe('Badge Component', () => {
  test('renders the label text correctly', () => {
    const { getByText } = render(<Badge label="Intermediate" />);
    expect(getByText('Intermediate')).toBeTruthy();
  });

  test('renders correct text for other labels', () => {
    const { getByText } = render(<Badge label="Beginner" variant="secondary" />);
    expect(getByText('Beginner')).toBeTruthy();
  });
});
