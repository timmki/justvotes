import type {Poll} from './pollProjections';

export type PollSort = 'newest' | 'oldest';
export type PollDateFilter = 'yesterday' | 'today' | 'tomorrow' | 'date';

export type PollListState = {
    sort: PollSort;
    dateFilter: PollDateFilter;
    from: string | null;
    to: string | null;
};

const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parsePollListState(params: URLSearchParams): PollListState {
    const dateParam = params.get('date');
    const from = validDateValue(params.get('from'));
    const to = validDateValue(params.get('to'));
    const dateFilter = isDateFilter(dateParam) ? dateParam : from !== null || to !== null ? 'date' : 'today';
    return {
        sort: params.get('sort') === 'oldest' ? 'oldest' : 'newest',
        dateFilter,
        from: dateFilter === 'date' ? from : null,
        to: dateFilter === 'date' ? to : null,
    };
}

export function serializePollListState(state: PollListState) {
    const params = new URLSearchParams();
    if (state.sort === 'oldest') params.set('sort', state.sort);
    if (state.dateFilter !== 'today') params.set('date', state.dateFilter);
    if (state.dateFilter === 'date') {
        if (state.from) params.set('from', state.from);
        if (state.to) params.set('to', state.to);
    }
    return params;
}

export function hasInvalidPollDateRange({from, to}: PollListState) {
    return from !== null && to !== null && from > to;
}

export function projectPollListState(polls: Poll[], state: PollListState) {
    const ordered = [...polls].sort((left, right) => comparePolls(left, right, state.sort));
    if (hasInvalidPollDateRange(state)) return ordered;

    const {start, end} = dateRange(state);
    if (state.dateFilter === 'date' && start && end && state.from === state.to) end.setDate(end.getDate() + 1);
    return ordered.filter((poll) => {
        const createdAt = Date.parse(poll.createdAt);
        return Number.isFinite(createdAt) && (!start || createdAt >= start.getTime()) && (!end || createdAt < end.getTime());
    });
}

function isDateFilter(value: string | null): value is PollDateFilter {
    return value === 'yesterday' || value === 'today' || value === 'tomorrow' || value === 'date';
}

function dateRange(state: PollListState) {
    if (state.dateFilter === 'date') {
        const start = state.from ? localDateStart(state.from) : null;
        const end = state.to ? localDateStart(state.to) : null;
        return {start, end};
    }

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() + (state.dateFilter === 'yesterday' ? -1 : state.dateFilter === 'tomorrow' ? 1 : 0));
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return {start, end};
}

export function validDateValue(value: string | null) {
    if (!value || !datePattern.test(value)) return null;
    const date = localDateStart(value);
    return date && formatLocalDate(date) === value ? value : null;
}

function localDateStart(value: string) {
    const match = datePattern.exec(value);
    if (!match) return null;
    const date = new Date(0);
    date.setFullYear(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    date.setHours(0, 0, 0, 0);
    return date;
}

function formatLocalDate(date: Date) {
    return [date.getFullYear().toString().padStart(4, '0'), (date.getMonth() + 1).toString().padStart(2, '0'), date.getDate().toString().padStart(2, '0')].join('-');
}

function comparePolls(left: Poll, right: Poll, sort: PollSort) {
    const leftCreatedAt = Date.parse(left.createdAt);
    const rightCreatedAt = Date.parse(right.createdAt);
    if (Number.isFinite(leftCreatedAt) && Number.isFinite(rightCreatedAt) && leftCreatedAt !== rightCreatedAt) {
        return sort === 'newest' ? rightCreatedAt - leftCreatedAt : leftCreatedAt - rightCreatedAt;
    }
    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}
