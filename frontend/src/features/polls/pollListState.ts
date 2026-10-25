import type {Poll} from './pollProjections';

export type PollSort = 'newest' | 'oldest';
export type PollDateFilter = 'all' | 'yesterday' | 'today' | 'tomorrow' | 'date';

export type PollListState = {
    sort: PollSort;
    dateFilter: PollDateFilter;
    from: string | null;
    to: string | null;
};

const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parsePollListState(params: URLSearchParams): PollListState {
    const dateParam = params.get('date');
    let from = validDateValue(params.get('from'));
    let to = validDateValue(params.get('to'));
    let dateFilter: PollDateFilter = 'all';
    if (isDateFilter(dateParam)) dateFilter = dateParam;
    else if (from !== null || to !== null) dateFilter = 'date';
    let sort: PollSort = 'newest';
    if (params.get('sort') === 'oldest') sort = 'oldest';
    if (dateFilter !== 'date') {
        from = null;
        to = null;
    }
    return {sort, dateFilter, from, to};
}

export function serializePollListState(state: PollListState) {
    const params = new URLSearchParams();
    if (state.sort === 'oldest') params.set('sort', state.sort);
    if (state.dateFilter !== 'all') params.set('date', state.dateFilter);
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
    if (state.dateFilter === 'all') return ordered;
    if (hasInvalidPollDateRange(state)) return ordered;

    const {start, end} = dateRange(state);
    if (state.dateFilter === 'date' && start && end && state.from === state.to) end.setDate(end.getDate() + 1);
    return ordered.filter((poll) => {
        const createdAt = Date.parse(poll.createdAt);
        return Number.isFinite(createdAt) && (!start || createdAt >= start.getTime()) && (!end || createdAt < end.getTime());
    });
}

function isDateFilter(value: string | null): value is PollDateFilter {
    return value === 'all' || value === 'yesterday' || value === 'today' || value === 'tomorrow' || value === 'date';
}

function dateRange(state: PollListState) {
    if (state.dateFilter === 'date') {
        let start: Date | null = null;
        let end: Date | null = null;
        if (state.from) start = localDateStart(state.from);
        if (state.to) end = localDateStart(state.to);
        return {start, end};
    }

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    let dayOffset = 0;
    if (state.dateFilter === 'yesterday') dayOffset = -1;
    else if (state.dateFilter === 'tomorrow') dayOffset = 1;
    start.setDate(start.getDate() + dayOffset);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return {start, end};
}

export function validDateValue(value: string | null) {
    if (!value || !datePattern.test(value)) return null;
    const date = localDateStart(value);
    if (date && formatLocalDate(date) === value) return value;
    return null;
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
        if (sort === 'newest') return rightCreatedAt - leftCreatedAt;
        return leftCreatedAt - rightCreatedAt;
    }
    if (left.id < right.id) return -1;
    if (left.id > right.id) return 1;
    return 0;
}
