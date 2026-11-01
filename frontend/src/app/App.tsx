import {QueryClientProvider} from '@tanstack/react-query';
import {type ReactNode, useEffect} from 'react';
import {Navigate, Route, Routes, useLocation} from 'react-router-dom';
import {AdminPage} from '../features/admin/AdminPage';
import {InvitationPage} from '../features/auth/InvitationPage';
import {LoginPage} from '../features/auth/LoginPage';
import {PasswordChangePage} from '../features/auth/PasswordChangePage';
import {type CurrentSession, homeRoute, routeAllowed, useSessionQuery} from '../features/auth/sessionQueries';
import {ProfilePage} from '../features/profile/ProfilePage';
import {HomePage, NotFoundPage} from '../features/home/HomePage';
import {AuditPage} from '../features/polls/AuditPage';
import {PollPage} from '../features/polls/PollPage';
import {PollsPage} from '../features/polls/PollsPage';
import {OptionPage, ResultsPage} from '../features/polls/ResultsPages';
import {apiClient, sessionCoordinator} from '../shared/api/client';
import {ApiError, type FrontendError} from '../shared/api/errors';
import {queryClient} from '../shared/api/queryClient';
import {ToastProvider, useToast} from '../shared/ui/ToastProvider';
import {RouteState} from '../shared/ui/RouteState';
import {I18nProvider} from '../shared/i18n/I18nProvider';
import {ThemeProvider} from './theme';
import {AppErrorBoundary} from './ErrorBoundary';
import {AppShell} from './Header';

export function App() {
    return <AppErrorBoundary><QueryClientProvider
        client={queryClient}><I18nProvider><ThemeProvider><ToastProvider><AppContent/></ToastProvider></ThemeProvider></I18nProvider></QueryClientProvider></AppErrorBoundary>;
}

/**
 * The whole application requires a session. Without one only the login and the invitation page exist;
 * with one, every account only reaches the routes of its role.
 */
function AppContent() {
    const sessionQuery = useSessionQuery();
    let content: ReactNode;
    if (sessionQuery.isPending) content = <RouteState status="loading"/>;
    else if (sessionQuery.isError) {
        let error: FrontendError | undefined;
        if (sessionQuery.error instanceof ApiError) error = sessionQuery.error.frontend;
        content = <RouteState status="error" error={error} onRetry={() => void sessionQuery.refetch()}/>;
    } else if (!sessionQuery.data) content = <AnonymousRoutes/>;
    else if (sessionQuery.data.passwordChangeRequired) content = <PasswordChangeRoutes/>;
    else if (sessionQuery.data.role === 'admin') content = <AdminRoutes session={sessionQuery.data}/>;
    else content = <UserRoutes session={sessionQuery.data}/>;

    return <div className="app-root"><AppShell session={sessionQuery.data ?? null}>
        <main id="main-content" tabIndex={-1}>{content}</main>
    </AppShell></div>;
}

function AnonymousRoutes() {
    return <Routes>
        <Route path="/login" element={<LoginPage/>}/>
        <Route path="/invitation" element={<InvitationPage/>}/>
        <Route path="*" element={<RememberAndLogin/>}/>
    </Routes>;
}

function RememberAndLogin() {
    const location = useLocation();
    useEffect(() => {
        if (sessionCoordinator.consumeLoggedOut()) return;
        if (location.pathname !== '/' && location.pathname !== '/login') {
            sessionCoordinator.rememberRoute(location.pathname + location.search);
        }
    }, [location.pathname, location.search]);
    return <Navigate to="/login" replace/>;
}

function PasswordChangeRoutes() {
    return <Routes>
        <Route path="/password" element={<PasswordChangePage/>}/>
        <Route path="/invitation" element={<InvitationPage/>}/>
        <Route path="*" element={<Navigate to="/password" replace/>}/>
    </Routes>;
}

function UserRoutes({session}: {session: CurrentSession}) {
    return <Routes>
        <Route path="/" element={<HomePage/>}/>
        <Route path="/polls" element={<PollsPage/>}/>
        <Route path="/poll/results/:pollId/option/:optionNumber" element={<OptionPage/>}/>
        <Route path="/poll/results/:pollId" element={<ResultsPage/>}/>
        <Route path="/poll/audit/:pollId" element={<AuditPage/>}/>
        <Route path="/poll/:pollId" element={<PollPage/>}/>
        <Route path="/profile" element={<ProfilePage/>}/>
        <Route path="/password" element={<PasswordChangePage/>}/>
        <Route path="/invitation" element={<InvitationPage/>}/>
        <Route path="/404" element={<NotFoundPage/>}/>
        <Route path="*" element={<OtherAreaRedirect session={session}/>}/>
    </Routes>;
}

function AdminRoutes({session}: {session: CurrentSession}) {
    return <Routes>
        <Route path="/admin/*" element={<AdminPage/>}/>
        <Route path="/password" element={<PasswordChangePage/>}/>
        <Route path="/invitation" element={<InvitationPage/>}/>
        <Route path="*" element={<OtherAreaRedirect session={session}/>}/>
    </Routes>;
}

/**
 * Sends signed-in accounts from the login page or another role's area to their own start page;
 * unknown paths inside their own area show the not-found page.
 */
function OtherAreaRedirect({session}: {session: CurrentSession}) {
    const location = useLocation();
    const entry = location.pathname === '/login' || location.pathname === '/';
    const returnRoute = sessionCoordinator.peekReturnRoute();
    useEffect(() => {
        if (entry) sessionCoordinator.consumeReturnRoute();
    }, [entry]);
    if (!entry && routeAllowed(session, location.pathname)) return <Navigate to="/404" replace/>;
    if (entry && returnRoute && routeAllowed(session, pathOf(returnRoute))) return <Navigate to={returnRoute} replace/>;
    return <Navigate to={homeRoute(session)} replace/>;
}

function pathOf(route: string) {
    return new URL(route, 'http://justvotes.local').pathname;
}

export {AppErrorBoundary, RouteState, ToastProvider, useToast};
export {apiClient};
