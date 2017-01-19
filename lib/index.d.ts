export interface EventStoreCredentials {
    username: string;
    password: string;
}
export interface EventStoreConnection {
    host: string;
    port: number;
    credentials?: EventStoreCredentials;
}
export declare class Event {
    readonly id: string;
    readonly eventType: string;
    readonly eventNumber: number;
    readonly sequenceNumber: number;
    readonly data: any;
    readonly metaData?: any;
    constructor(id: string, eventType: string, eventNumber: number, sequenceNumber: number, rawData: string, rawMetaData?: string);
}
export default class EventStream {
    private callbacks;
    private connection;
    private streamName;
    private requestConfiguration;
    private lastFetchedUrl;
    constructor(connection: EventStoreConnection, streamName: string);
    catchup(offset?: number): Promise<void>;
    listen(offset?: number): Promise<void>;
    private fetchEvents(offset, endOnHead);
    private fetchAtomDocument(url, embedEventData?);
    private readPrevious();
    private static getLinkByRelation(document, relation);
    on(event: 'event', callback: (event: Event) => void): this;
    on(event: 'head', callback: () => void): this;
    on(event: 'end', callback: () => void): this;
    private emit(eventName, ...args);
}
