const defaultAppName = 'JustVotes';

export function getAppName() {
    const configured = import.meta.env.VITE_APP_NAME?.trim();
    return configured || defaultAppName;
}
