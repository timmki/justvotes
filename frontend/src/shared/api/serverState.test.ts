import { describe, expect, it } from 'vitest';
import { presentQuery } from './serverState';

describe('presentQuery', () => {
  it('marks cached data as stale while it is being refreshed', () => {
    expect(presentQuery({ data: ['cached'], isPending: false, isError: false, isFetching: true, isStale: true, error: null })).toEqual({
      data: ['cached'],
      status: 'success',
      stale: true,
      error: null,
    });
  });
});
