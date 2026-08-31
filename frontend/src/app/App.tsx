import { QueryClientProvider } from '@tanstack/react-query';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminPage } from '../features/admin/AdminPage';
import { HomePage, NotFoundPage } from '../features/home/HomePage';
import { AuditPage, OptionPage, PollPage, PollsPage, ResultsPage } from '../features/polls/PollPages';
import { apiClient } from '../shared/api/client';
import { queryClient } from '../shared/api/queryClient';
import { SessionNotice } from '../shared/ui/SessionNotice';
import { ToastProvider, useToast } from '../shared/ui/ToastProvider';
import { RouteState } from '../shared/ui/RouteState';
import { I18nProvider } from '../shared/i18n/I18nProvider';
import { ThemeProvider } from './theme';
import { AppErrorBoundary } from './ErrorBoundary';
import { Header } from './Header';

export function App() {
  return <AppErrorBoundary><QueryClientProvider client={queryClient}><I18nProvider><ThemeProvider><ToastProvider><AppContent /></ToastProvider></ThemeProvider></I18nProvider></QueryClientProvider></AppErrorBoundary>;
}

function AppContent() {
  return <div className="app-root"><Header /><SessionNotice /><main id="main-content" tabIndex={-1}><Routes><Route path="/" element={<HomePage />} /><Route path="/polls" element={<PollsPage />} /><Route path="/poll/results/:pollId/option/:optionNumber" element={<OptionPage />} /><Route path="/poll/results/:pollId" element={<ResultsPage />} /><Route path="/poll/audit/:pollId" element={<AuditPage />} /><Route path="/poll/:pollId" element={<PollPage />} /><Route path="/admin/*" element={<AdminPage />} /><Route path="/404" element={<NotFoundPage />} /><Route path="*" element={<Navigate to="/404" replace />} /></Routes></main></div>;
}

export { AppErrorBoundary, RouteState, ToastProvider, useToast };
export { apiClient };
