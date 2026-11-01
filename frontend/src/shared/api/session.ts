import type {QueryClient} from '@tanstack/react-query';
import {clearProtectedQueries, queryClient} from './queryClient';

/**
 * Remembers where a person wanted to go before signing in and whether the previous session expired,
 * so the login page can explain the situation and return to the original route afterwards.
 */
export class SessionCoordinator {
    private returnRoute: string | null = null;
    private expired = false;
    private loggedOut = false;
    private readonly listeners = new Set<() => void>();

    constructor(private readonly client: QueryClient = queryClient) {
    }

    /**
     * The session ended unexpectedly (expired, invalidated or locked).
     */
    requireLogin(route: string) {
        clearProtectedQueries(this.client);
        if (this.returnRoute === null) this.returnRoute = route;
        this.expired = true;
        this.notify();
    }

    /**
     * An anonymous visitor opened a protected route; it is restored after signing in.
     */
    rememberRoute(route: string) {
        if (this.returnRoute === null) this.returnRoute = route;
    }

    markLoggedOut() {
        this.returnRoute = null;
        this.expired = false;
        this.loggedOut = true;
        this.notify();
    }

    consumeLoggedOut() {
        const loggedOut = this.loggedOut;
        this.loggedOut = false;
        return loggedOut;
    }

    subscribe(listener: () => void) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    isLoginRequired() {
        return this.expired;
    }

    peekReturnRoute() {
        return this.returnRoute;
    }

    consumeReturnRoute() {
        const route = this.returnRoute;
        this.returnRoute = null;
        this.expired = false;
        this.notify();
        return route;
    }

    private notify() {
        this.listeners.forEach((listener) => listener());
    }
}
