import {useQueries} from '@tanstack/react-query';
import {useApiQuery} from '../../shared/api/useApiQuery';
import {queryKeys} from '../../shared/api/queryKeys';
import {catalogGateway, type CatalogGateway, type CatalogGroup} from './catalogCommands';

export function createCatalogQueries({gateway}: { gateway: CatalogGateway }) {
    function useCatalogTemplates() {
        return useApiQuery(queryKeys.templates, () => gateway.getTemplates());
    }

    function useCatalogGroups() {
        return useApiQuery(queryKeys.groups, () => gateway.getGroups());
    }

    function useCatalogGroupTemplates(groupId: string, enabled = true) {
        const query = groupTemplatesQuery(gateway, groupId);
        return useApiQuery(query.queryKey, query.queryFn, {enabled});
    }

    function useCatalogGroupMemberships(groups: CatalogGroup[]) {
        return useQueries({
            queries: groups.map((group) => groupTemplatesQuery(gateway, group.id)),
        });
    }

    return {useCatalogTemplates, useCatalogGroups, useCatalogGroupTemplates, useCatalogGroupMemberships};
}

function groupTemplatesQuery(gateway: CatalogGateway, groupId: string) {
    return {
        queryKey: queryKeys.groupTemplates(groupId),
        queryFn: () => gateway.getTemplatesInGroup(groupId),
    };
}

export const catalogQueries = createCatalogQueries({
    gateway: catalogGateway,
});
