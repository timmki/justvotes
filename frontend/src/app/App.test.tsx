import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from './App';
import { describe, expect, it } from 'vitest';

describe('app shell', () => { it('renders navigation', () => { render(<MemoryRouter><App /></MemoryRouter>); expect(screen.getByRole('link', { name: 'Polls' })).toBeTruthy(); }); });
