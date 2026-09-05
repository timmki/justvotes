import type {QueryClient} from '@tanstack/react-query';
import type {components} from '../../shared/api/generated/justvotes';
import {apiClient} from '../../shared/api/client';
import {queryClient} from '../../shared/api/queryClient';
import {queryKeys} from '../../shared/api/queryKeys';

export type CatalogTemplate = components['schemas']['Template'];
export type CatalogGroup = components['schemas']['TemplateGroup'];
export type CatalogGateway = {
    getTemplates: () => Promise<CatalogTemplate[]>;
    createTemplate: (name: string) => Promise<CatalogTemplate>;
    renameTemplate: (templateId: string, name: string) => Promise<CatalogTemplate>;
    deleteTemplate: (templateId: string) => Promise<void>;
    getGroups: () => Promise<CatalogGroup[]>;
    createGroup: (group: { name: string; description: string }) => Promise<CatalogGroup>;
    renameGroup: (groupId: string, name: string) => Promise<CatalogGroup>;
    deleteGroup: (groupId: string) => Promise<void>;
    getTemplatesInGroup: (groupId: string) => Promise<CatalogTemplate[]>;
    assignTemplateToGroup: (groupId: string, templateId: string) => Promise<void>;
    removeTemplateFromGroup: (groupId: string, templateId: string) => Promise<void>;
};

export type CatalogCache = Pick<QueryClient, 'invalidateQueries' | 'removeQueries'>;
export type CatalogBatchSkipped = { kind: 'empty' } | { kind: 'duplicate'; name: string };
export type CatalogBatchFailure = { name: string; error: unknown };
export type CatalogBatchResult = {
    created: CatalogTemplate[];
    skipped: CatalogBatchSkipped[];
    failed: CatalogBatchFailure[];
};
export type CatalogDeleteResult = {
    deleted: CatalogTemplate[];
    failed: Array<CatalogBatchFailure & { id: string }>;
};

export function createCatalogCommands({gateway, cache}: { gateway: CatalogGateway; cache: CatalogCache }) {
    return {
        async createTemplate(name: string) {
            const created = await gateway.createTemplate(normalizeName(name));
            await invalidateTemplateQueries(cache);
            return created;
        },

        async importTemplates(input: string, existingTemplates: CatalogTemplate[]): Promise<CatalogBatchResult> {
            const existingNames = new Set(existingTemplates.map((template) => normalizeName(template.name)));
            const seenNames = new Set<string>();
            const skipped: CatalogBatchSkipped[] = [];
            const candidates: string[] = [];

            for (const rawValue of input.split(',')) {
                const name = normalizeName(rawValue);
                if (!name) skipped.push({kind: 'empty'});
                else if (seenNames.has(name) || existingNames.has(name)) skipped.push({kind: 'duplicate', name});
                else {
                    seenNames.add(name);
                    candidates.push(name);
                }
            }

            const outcomes = await runWithConcurrency(candidates, 3, async (name) => {
                try {
                    return {kind: 'created' as const, template: await gateway.createTemplate(name)};
                } catch (error) {
                    return {kind: 'failed' as const, failure: {name, error}};
                }
            });
            const result: CatalogBatchResult = {
                created: outcomes.flatMap((outcome) => outcome.kind === 'created' ? [outcome.template] : []),
                skipped,
                failed: outcomes.flatMap((outcome) => outcome.kind === 'failed' ? [outcome.failure] : []),
            };
            if (result.created.length > 0) await invalidateTemplateQueries(cache);
            return result;
        },

        async renameTemplate(templateId: string, name: string) {
            const renamed = await gateway.renameTemplate(templateId, normalizeName(name));
            await invalidateTemplateQueriesAndMemberships(cache);
            return renamed;
        },

        async deleteTemplates(templates: CatalogTemplate[]): Promise<CatalogDeleteResult> {
            const outcomes = await runWithConcurrency(templates, 3, async (template) => {
                try {
                    await gateway.deleteTemplate(template.id);
                    return {kind: 'deleted' as const, template};
                } catch (error) {
                    return {kind: 'failed' as const, failure: {id: template.id, name: template.name, error}};
                }
            });
            const result: CatalogDeleteResult = {
                deleted: outcomes.flatMap((outcome) => outcome.kind === 'deleted' ? [outcome.template] : []),
                failed: outcomes.flatMap((outcome) => outcome.kind === 'failed' ? [outcome.failure] : []),
            };
            if (result.deleted.length > 0) await invalidateTemplateQueriesAndMemberships(cache);
            return result;
        },

        async createGroup(group: { name: string; description: string }) {
            const created = await gateway.createGroup({name: normalizeName(group.name), description: group.description.trim()});
            await cache.invalidateQueries({queryKey: queryKeys.groups});
            return created;
        },

        async renameGroup(groupId: string, name: string) {
            const renamed = await gateway.renameGroup(groupId, normalizeName(name));
            await cache.invalidateQueries({queryKey: queryKeys.groups});
            return renamed;
        },

        async deleteGroup(groupId: string) {
            await gateway.deleteGroup(groupId);
            cache.removeQueries({queryKey: queryKeys.groupTemplates(groupId)});
            await cache.invalidateQueries({queryKey: queryKeys.groups});
        },

        async assignTemplateToGroup(groupId: string, templateId: string) {
            await gateway.assignTemplateToGroup(groupId, templateId);
            await cache.invalidateQueries({queryKey: queryKeys.groupTemplates(groupId)});
        },

        async removeTemplateFromGroup(groupId: string, templateId: string) {
            await gateway.removeTemplateFromGroup(groupId, templateId);
            await cache.invalidateQueries({queryKey: queryKeys.groupTemplates(groupId)});
        },
    };
}

export const catalogGateway: CatalogGateway = {
    getTemplates: () => apiClient.getTemplates(),
    createTemplate: (name) => apiClient.createTemplate(name),
    renameTemplate: (templateId, name) => apiClient.renameTemplate(templateId, name),
    deleteTemplate: (templateId) => apiClient.deleteTemplate(templateId),
    getGroups: () => apiClient.getGroups(),
    createGroup: (group) => apiClient.createGroup(group),
    renameGroup: (groupId, name) => apiClient.renameGroup(groupId, name),
    deleteGroup: (groupId) => apiClient.deleteGroup(groupId),
    getTemplatesInGroup: (groupId) => apiClient.getTemplatesInGroup(groupId),
    assignTemplateToGroup: (groupId, templateId) => apiClient.assignTemplateToGroup(groupId, templateId),
    removeTemplateFromGroup: (groupId, templateId) => apiClient.removeTemplateFromGroup(groupId, templateId),
};

export const catalogCommands = createCatalogCommands({
    gateway: catalogGateway,
    cache: queryClient,
});

export function normalizeName(value: string) {
    return value.trim();
}

async function invalidateTemplateQueries(cache: CatalogCache) {
    await cache.invalidateQueries({queryKey: queryKeys.templates});
}

async function invalidateTemplateQueriesAndMemberships(cache: CatalogCache) {
    await Promise.all([
        invalidateTemplateQueries(cache),
        cache.invalidateQueries({queryKey: queryKeys.groups}),
    ]);
}

async function runWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>) {
    const results = new Array<R>(items.length);
    let nextIndex = 0;

    async function consume() {
        while (nextIndex < items.length) {
            const index = nextIndex++;
            results[index] = await worker(items[index]);
        }
    }

    await Promise.all(Array.from({length: Math.min(limit, items.length)}, consume));
    return results;
}
