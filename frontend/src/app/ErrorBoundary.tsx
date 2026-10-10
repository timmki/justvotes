import {Component, type ErrorInfo, type ReactNode} from 'react';
import {type Locale, messages} from '../shared/i18n/translations';

export class AppErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
    state = {hasError: false};

    static getDerivedStateFromError() {
        return {hasError: true};
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('Application rendering failed', error, info);
    }

    render() {
        if (this.state.hasError) return <ErrorFallback/>;
        return this.props.children;
    }
}

function ErrorFallback() {
    let locale: Locale = 'de';
    if (document.documentElement.lang === 'en') locale = 'en';
    const common = messages[locale].common;
    const errors = messages[locale].errors;
    return <div className="page-frame error-page"><h1>{errors.boundary}</h1>
        <p>{errors.boundaryText}</p><a className="primary-button" href="/">{common.home}</a></div>;
}
