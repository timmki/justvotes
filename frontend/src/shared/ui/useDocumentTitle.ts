import {useEffect} from 'react';
import {getAppName} from '../config/appConfig';

/**
 * Names the browser tab after the current page; leaving the page restores the plain application name.
 */
export function useDocumentTitle(title: string) {
    useEffect(() => {
        const appName = getAppName();
        if (title && title !== appName) document.title = `${title} · ${appName}`;
        else document.title = appName;
        return () => {
            document.title = appName;
        };
    }, [title]);
}
