const defaultAppName = 'JustVotes';

export function getAppName() {
    const configured = import.meta.env.VITE_APP_NAME?.trim();
    return configured || defaultAppName;
}

export function getAppInitials(appName: string) {
    return appName.trim().split(/\s+/).filter(Boolean).map((word) => word[0]).join('').toUpperCase();
}
