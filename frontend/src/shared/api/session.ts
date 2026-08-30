import type { QueryClient } from '@tanstack/react-query';
import { clearProtectedQueries, queryClient } from './queryClient';

export class SessionCoordinator {
  private returnRoute: string | null = null;
  private readonly listeners = new Set<() => void>();

  constructor(private readonly client: QueryClient = queryClient) {}

  requireLogin(route: string) {
    clearProtectedQueries(this.client);
    if (this.returnRoute === null) this.returnRoute = route;
    this.listeners.forEach((listener) => listener());
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  isLoginRequired() {
    return this.returnRoute !== null;
  }

  consumeReturnRoute() {
    const route = this.returnRoute;
    this.returnRoute = null;
    this.listeners.forEach((listener) => listener());
    return route;
  }
}
