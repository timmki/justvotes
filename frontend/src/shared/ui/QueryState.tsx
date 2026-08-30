import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ApiError } from '../api/errors';
import { presentQuery } from '../api/serverState';
import { useI18n } from '../i18n/I18nProvider';
import { RouteState } from './RouteState';

export function QueryState<T>({ query, children }: { query: UseQueryResult<T, unknown>; children: (data: T) => ReactNode }) {
  const { t } = useI18n();
  const presentation = presentQuery(query);
  if (presentation.status === 'loading') return <RouteState status="loading" />;
  if (presentation.status === 'error') return <RouteState status="error" error={presentation.error instanceof ApiError ? presentation.error.frontend : undefined} onRetry={() => { void query.refetch(); }} />;
  return <>{presentation.stale && <p className="stale-state" role="status">{t('common.refreshing')}</p>}{presentation.data === undefined ? <RouteState status="empty" /> : children(presentation.data)}</>;
}
