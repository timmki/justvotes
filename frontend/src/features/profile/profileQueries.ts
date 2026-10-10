import {apiClient} from '../../shared/api/client';
import {queryKeys} from '../../shared/api/queryKeys';
import {useApiQuery} from '../../shared/api/useApiQuery';

export function useProfileQuery() {
    return useApiQuery(queryKeys.identityVotes, () => apiClient.getCurrentIdentityVotes());
}
