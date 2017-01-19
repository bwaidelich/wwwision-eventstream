import fetch, {RequestInit} from "node-fetch"

interface Link {
    uri: string
    relation: string
}

interface AtomEntry {
    id: string
    eventId: string
    eventType: string
    eventNumber: number
    positionEventNumber: number
    data: string
    isMetaData: boolean
    metaData: string
}

interface AtomDocument {
    links: Link[]
    entries: AtomEntry[]
}

export interface EventStoreCredentials {
    username: string
    password: string
}

export interface EventStoreConnection {
    host: string
    port: number
    credentials?: EventStoreCredentials
}

export class Event {
    readonly id: string
    readonly eventType: string
    readonly eventNumber: number
    readonly sequenceNumber: number
    readonly data: any
    readonly metaData?: any

    constructor(id: string, eventType: string, eventNumber: number, sequenceNumber: number, rawData: string, rawMetaData?: string) {
        this.id = id
        this.eventType = eventType
        this.sequenceNumber = sequenceNumber
        this.data = JSON.parse(rawData)
        if (rawMetaData !== null) {
            this.metaData = JSON.parse(rawMetaData)
        }
    }
}

export default class EventStream {
    private callbacks: Map<string, Array<() => void>> = new Map()
    private connection: EventStoreConnection
    private streamName: string
    private requestConfiguration: RequestInit
    private lastFetchedUrl: string

    constructor(connection: EventStoreConnection, streamName: string) {
        this.connection = connection
        this.streamName = streamName
        this.requestConfiguration = {
            headers: {
                Accept: 'application/vnd.eventstore.atom+json',
                'User-Agent': 'wwwision-eventstream',
            }
        }
        if (connection.credentials) {
            let b = new Buffer(connection.credentials.username + ':' + connection.credentials.password)
            this.requestConfiguration.headers['Authorization'] = 'Basic ' + b.toString('base64')
        }
        this.callbacks.set('event', [])
        this.callbacks.set('head', [])
        this.callbacks.set('end', [])
    }

    catchup(offset: number = 0) {
        return this.fetchEvents(offset, true)
    }

    listen(offset: number = 0) {
        this.requestConfiguration.headers['ES-LongPoll'] = '10'
        return this.fetchEvents(offset, false)
    }

    private async fetchEvents(offset: number, endOnHead: boolean) {
        if (offset < 0) {
            this.lastFetchedUrl = `${this.connection.host}:${this.connection.port}/streams/${this.streamName}/head/backward/${Math.abs(offset)}`
        } else {
            this.lastFetchedUrl = `${this.connection.host}:${this.connection.port}/streams/${this.streamName}/${offset}/forward/20`
        }
        do {
            let current = await this.readPrevious()
            if (current === this.lastFetchedUrl) {
                this.emit('head')
                if (endOnHead) {
                    this.emit('end')
                    break
                }
            }
            this.lastFetchedUrl = current
        } while (true)
    }

    private fetchAtomDocument(url: string, embedEventData: boolean = false): Promise<AtomDocument> {
        if (embedEventData) {
            url += '?embed=body'
        }
        return fetch(url, this.requestConfiguration)
            .then(function (response) {
                return response.json<AtomDocument>()
            })
    }

    private async readPrevious(): Promise<string> {
        let document = await this.fetchAtomDocument(this.lastFetchedUrl, true)
        document.entries.reverse().map(entry => {
            this.emit('event', new Event(entry.eventId, entry.eventType, entry.eventNumber, entry.positionEventNumber, entry.data, entry.isMetaData ? entry.metaData : null))
        })
        let previous = EventStream.getLinkByRelation(document, 'previous')
        if (previous !== null) {
            return previous
        }
        return this.lastFetchedUrl
    }

    private static getLinkByRelation(document: AtomDocument, relation: string): string {
        for (let link of document.links) {
            if (link.relation == relation) {
                return link.uri
            }
        }
        return null
    }

    on(event: 'event', callback: (event: Event) => void): this
    on(event: 'head', callback: () => void): this
    on(event: 'end', callback: () => void): this
    on(event: string, callback: () => void): this {
        if (!this.callbacks.has(event)) {
            this.callbacks.set(event, [])
        }
        this.callbacks.get(event).push(callback)
        return this
    }

    private emit(eventName: string, ...args) {
        this.callbacks.get(eventName).forEach(c => {
            c.call(this, ...args)
        })
    }
}