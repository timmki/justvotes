import {describe, expect, it} from 'vitest';
import {identityActionKey} from './identityActionKey';

describe('identityActionKey', () => {
    it('offers to set an identity while none is set', () => {
        expect(identityActionKey(null)).toBe('common.identitySet');
    });

    it('offers to change the identity once one is set', () => {
        expect(identityActionKey('Benedict-42')).toBe('common.identityChange');
    });
});
