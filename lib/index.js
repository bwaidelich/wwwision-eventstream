"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const node_fetch_1 = require("node-fetch");
class Event {
    constructor(id, eventType, eventNumber, sequenceNumber, rawData, rawMetaData) {
        this.id = id;
        this.eventType = eventType;
        this.sequenceNumber = sequenceNumber;
        this.data = JSON.parse(rawData);
        if (rawMetaData !== null) {
            this.metaData = JSON.parse(rawMetaData);
        }
    }
}
exports.Event = Event;
class EventStream {
    constructor(connection, streamName) {
        this.callbacks = new Map();
        this.connection = connection;
        this.streamName = streamName;
        this.requestConfiguration = {
            headers: {
                Accept: 'application/vnd.eventstore.atom+json',
                'User-Agent': 'wwwision-eventstream',
            }
        };
        if (connection.credentials) {
            let b = new Buffer(connection.credentials.username + ':' + connection.credentials.password);
            this.requestConfiguration.headers['Authorization'] = 'Basic ' + b.toString('base64');
        }
        this.callbacks.set('event', []);
        this.callbacks.set('head', []);
        this.callbacks.set('end', []);
    }
    catchup(offset = 0) {
        return this.fetchEvents(offset, true);
    }
    listen(offset = 0) {
        this.requestConfiguration.headers['ES-LongPoll'] = '10';
        return this.fetchEvents(offset, false);
    }
    fetchEvents(offset, endOnHead) {
        return __awaiter(this, void 0, void 0, function* () {
            if (offset < 0) {
                this.lastFetchedUrl = `${this.connection.host}:${this.connection.port}/streams/${this.streamName}/head/backward/${Math.abs(offset)}`;
            }
            else {
                this.lastFetchedUrl = `${this.connection.host}:${this.connection.port}/streams/${this.streamName}/${offset}/forward/20`;
            }
            do {
                let current = yield this.readPrevious();
                if (current === this.lastFetchedUrl) {
                    this.emit('head');
                    if (endOnHead) {
                        this.emit('end');
                        break;
                    }
                }
                this.lastFetchedUrl = current;
            } while (true);
        });
    }
    fetchAtomDocument(url, embedEventData = false) {
        if (embedEventData) {
            url += '?embed=body';
        }
        return node_fetch_1.default(url, this.requestConfiguration)
            .then(function (response) {
            return response.json();
        });
    }
    readPrevious() {
        return __awaiter(this, void 0, void 0, function* () {
            let document = yield this.fetchAtomDocument(this.lastFetchedUrl, true);
            document.entries.reverse().map(entry => {
                this.emit('event', new Event(entry.eventId, entry.eventType, entry.eventNumber, entry.positionEventNumber, entry.data, entry.isMetaData ? entry.metaData : null));
            });
            let previous = EventStream.getLinkByRelation(document, 'previous');
            if (previous !== null) {
                return previous;
            }
            return this.lastFetchedUrl;
        });
    }
    static getLinkByRelation(document, relation) {
        for (let link of document.links) {
            if (link.relation == relation) {
                return link.uri;
            }
        }
        return null;
    }
    on(event, callback) {
        if (!this.callbacks.has(event)) {
            this.callbacks.set(event, []);
        }
        this.callbacks.get(event).push(callback);
        return this;
    }
    emit(eventName, ...args) {
        this.callbacks.get(eventName).forEach(c => {
            c.call(this, ...args);
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = EventStream;
