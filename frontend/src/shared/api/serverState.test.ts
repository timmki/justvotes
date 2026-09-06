import {describe, expect, it} from 'vitest';
import {presentQuery} from './serverState';

describe('presentQuery', () => {
    it('keeps cached data available while it is being refreshed', () => {
        expect(presentQuery({
            data: ['cached'],
            isPending: false,
            isError: false,
            error: null
        })).toEqual({
            data: ['cached'],
            status: 'success',
            error: null,
        });
    });
});
