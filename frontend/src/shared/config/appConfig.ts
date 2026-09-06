const defaultAppName = 'JustVotes';

export function getAppName() {
    const runtimeConfigured = window.__JUSTVOTES_CONFIG__?.appName?.trim();
    const configured = runtimeConfigured || import.meta.env.VITE_APP_NAME?.trim();
    return configured || defaultAppName;
}

export function getAppInitials(appName: string) {
    return appName.trim().split(/\s+/).filter(Boolean).map((word) => word[0]).join('').toUpperCase();
}
