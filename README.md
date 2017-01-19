# wwwision-eventstream
Simple node.js package allowing easy consumption of [Event Store](https://geteventstore.com/) streams via its HTTP API

## Usage

```
npm install wwwision-eventstream --save
```

### Catch-up streams

```typescript
import EventStream from "wwwision-eventstream"

new EventStream({host: 'http://127.0.0.1', port: 2113}, 'some-stream')
    .on('event', e => {
        console.log(e.data)
    })
    .on('end', () => {
        console.log('DONE')
    })
    .catchup()
    .catch((e) => {
        console.log('ERROR:')
        console.log(e)
    })
```

### Catch-up and keep listening

```typescript
import EventStream from "wwwision-eventstream"

new EventStream({host: 'http://127.0.0.1', port: 2113}, 'some-stream')
    .on('event', e => {
        console.log(e.data)
    })
    .on('head', () => {
        console.log('HEAD REACHED, WAITING FOR NEW EVENTS')
    })
    .catchup()
    .catch((e) => {
        console.log('ERROR:')
        console.log(e)
    })
```

An optional `offset` argument can be passed to `catchup()` and `listen()` allowing to read events only from the given sequenceNumber (aka positionEventNumber). A negative number starts reading events from HEAD - x.
