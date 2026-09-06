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

    it('trims, deduplicates case-insensitively, and serially attempts every valid value', async () => {
        let active = 0;
        let maxActive = 0;
        const createTemplate = vi.fn().mockImplementation(async (name: string) => {
            active += 1;
            maxActive = Math.max(maxActive, active);
            if (name === 'Gamma') {
                active -= 1;
                throw new Error('temporary failure');
            }
            const created = template(`id-${name}`, name);
            active -= 1;
            return created;
        });
        const {gateway, commands} = testDependencies({createTemplate});

        const result = await commands.importTemplates(
            ' Alpha, beta, BETA, , Gamma, delta, Epsilon, zeta ',
            [template('existing', 'alpha')],
        );

        expect(createTemplate.mock.calls.map(([name]) => name)).toEqual(['beta', 'Gamma', 'delta', 'Epsilon', 'zeta']);
        expect(result.created.map((entry) => entry.name)).toEqual(['beta', 'delta', 'Epsilon', 'zeta']);
        expect(result.skipped).toEqual([
            {kind: 'duplicate', name: 'Alpha'},
            {kind: 'duplicate', name: 'BETA'},
            {kind: 'empty'},
        ]);
        expect(result.failed.map((entry) => entry.name)).toEqual(['Gamma']);
        expect(maxActive).toBe(1);
    });

    it('assigns selected templates through the single-item API and refreshes once', async () => {
        let active = 0;
        let maxActive = 0;
        const assignTemplateToGroup = vi.fn().mockImplementation(async (_groupId: string, templateId: string) => {
            active += 1;
            maxActive = Math.max(maxActive, active);
            active -= 1;
            if (templateId === 'template-2') throw new Error('assignment failed');
        });
        const {gateway, cache, commands} = testDependencies({assignTemplateToGroup});
        const selected = [template('template-1', 'One'), template('template-2', 'Two'), template('template-3', 'Three')];

        const result = await commands.assignTemplatesToGroup('group-1', selected);

        expect(assignTemplateToGroup.mock.calls).toEqual([
            ['group-1', 'template-1'],
            ['group-1', 'template-2'],
            ['group-1', 'template-3'],
        ]);
        expect(result.assigned.map((entry) => entry.name)).toEqual(['One', 'Three']);
        expect(result.failed).toEqual([{id: 'template-2', name: 'Two', error: expect.any(Error)}]);
        expect(maxActive).toBe(1);
        expect(cache.invalidateQueries).toHaveBeenCalledTimes(1);
        expect(cache.invalidateQueries).toHaveBeenCalledWith({queryKey: ['admin', 'groups', 'group-1', 'templates']});
        expect(gateway.assignTemplateToGroup).toHaveBeenCalledTimes(3);
    });
});
