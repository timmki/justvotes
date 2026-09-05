import {describe, expect, it, vi} from 'vitest';
import type {CatalogGateway, CatalogTemplate} from './catalogCommands';
import {createCatalogCommands} from './catalogCommands';

function template(id: string, name: string): CatalogTemplate {
    return {id, name};
}

function testDependencies(overrides: Partial<CatalogGateway> = {}) {
    const gateway: CatalogGateway = {
        getTemplates: vi.fn().mockResolvedValue([]),
        createTemplate: vi.fn().mockImplementation(async (name: string) => template(`id-${name}`, name)),
        renameTemplate: vi.fn().mockResolvedValue(template('template-1', 'Renamed')),
        deleteTemplate: vi.fn().mockResolvedValue(undefined),
        getGroups: vi.fn().mockResolvedValue([]),
        createGroup: vi.fn().mockResolvedValue({id: 'group-1', name: 'Board', description: ''}),
        renameGroup: vi.fn().mockResolvedValue({id: 'group-1', name: 'Renamed', description: ''}),
        deleteGroup: vi.fn().mockResolvedValue(undefined),
        getTemplatesInGroup: vi.fn().mockResolvedValue([]),
        assignTemplateToGroup: vi.fn().mockResolvedValue(undefined),
        removeTemplateFromGroup: vi.fn().mockResolvedValue(undefined),
        ...overrides,
    };
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    const removeQueries = vi.fn();
    return {gateway, cache: {invalidateQueries, removeQueries}, commands: createCatalogCommands({gateway, cache: {invalidateQueries, removeQueries}})};
}

describe('catalog commands', () => {
    it('normalizes a single template name and invalidates catalog projections', async () => {
        const {gateway, cache, commands} = testDependencies();

        await commands.createTemplate('  New template  ');

        expect(gateway.createTemplate).toHaveBeenCalledWith('New template');
        expect(cache.invalidateQueries).toHaveBeenCalledWith({queryKey: ['admin', 'templates']});
        expect(cache.invalidateQueries).not.toHaveBeenCalledWith({queryKey: ['admin', 'groups']});
    });

    it('preserves single-operation errors without invalidating stale projections', async () => {
        const createTemplate = vi.fn().mockRejectedValue(new Error('conflict'));
        const {cache, commands} = testDependencies({createTemplate});

        await expect(commands.createTemplate('Duplicate')).rejects.toThrow('conflict');

        expect(cache.invalidateQueries).not.toHaveBeenCalled();
    });

    it('does not invalidate projections after failed group commands', async () => {
        const {cache, commands} = testDependencies({
            createGroup: vi.fn().mockRejectedValue(new Error('create conflict')),
            renameGroup: vi.fn().mockRejectedValue(new Error('rename conflict')),
            deleteGroup: vi.fn().mockRejectedValue(new Error('delete conflict')),
        });

        await expect(commands.createGroup({name: 'Board', description: ''})).rejects.toThrow('create conflict');
        await expect(commands.renameGroup('group-1', 'Renamed')).rejects.toThrow('rename conflict');
        await expect(commands.deleteGroup('group-1')).rejects.toThrow('delete conflict');

        expect(cache.invalidateQueries).not.toHaveBeenCalled();
        expect(cache.removeQueries).not.toHaveBeenCalled();
    });

    it('invalidates the projection affected by each group command', async () => {
        const {gateway, cache, commands} = testDependencies();

        await commands.createGroup({name: ' Board ', description: ' Description '});
        await commands.renameGroup('group-1', ' Renamed ');
        await commands.assignTemplateToGroup('group-1', 'template-1');
        await commands.removeTemplateFromGroup('group-1', 'template-1');
        await commands.deleteGroup('group-1');

        expect(gateway.createGroup).toHaveBeenCalledWith({name: 'Board', description: 'Description'});
        expect(gateway.renameGroup).toHaveBeenCalledWith('group-1', 'Renamed');
        expect(cache.invalidateQueries).toHaveBeenCalledWith({queryKey: ['admin', 'groups']});
        expect(cache.invalidateQueries).toHaveBeenCalledWith({queryKey: ['admin', 'groups', 'group-1', 'templates']});
        expect(cache.removeQueries).toHaveBeenCalledWith({queryKey: ['admin', 'groups', 'group-1', 'templates']});
    });

    it('keeps batch results in input order and retries only failed values', async () => {
        let betaAttempts = 0;
        const createTemplate = vi.fn().mockImplementation(async (name: string) => {
            if (name === 'beta' && betaAttempts++ === 0) throw new Error('temporary failure');
            return template(`id-${name}`, name);
        });
        const {gateway, commands} = testDependencies({createTemplate});

        const result = await commands.importTemplates(' alpha, beta, gamma, delta ', [template('existing', 'alpha')]);

        expect(result.created.map((entry) => entry.name)).toEqual(['gamma', 'delta']);
        expect(result.skipped).toEqual([{kind: 'duplicate', name: 'alpha'}]);
        expect(result.failed.map((entry) => entry.name)).toEqual(['beta']);

        const retry = await commands.importTemplates(result.failed.map((entry) => entry.name).join(','), []);

        expect(retry.created.map((entry) => entry.name)).toEqual(['beta']);
        expect(retry.failed).toEqual([]);
        expect(createTemplate).toHaveBeenCalledTimes(4);
    });
});
