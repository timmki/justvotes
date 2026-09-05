import type {ReactNode} from 'react';
import {PageFrame} from '../../shared/ui/PageFrame';
import type {FrontendError} from '../../shared/api/errors';

export const notFoundError: FrontendError = {
    kind: 'problem',
    status: 404,
    code: 'not_found',
    detail: null,
    retryable: false,
    messageKey: 'errors.notFound',
};

export function DataPage({eyebrow, title, description, children}: {
    eyebrow: string;
    title: string;
    description: string;
    children: ReactNode;
}) {
    return <PageFrame eyebrow={eyebrow} title={title} description={description}>{children}</PageFrame>;
}
