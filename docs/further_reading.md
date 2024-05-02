## Configuration Options
The following configuration options are available to control the behaviour of the SDK.
You can provide options by passing them in when the client is created e.g.
```javascript
// Create Options
const options = {
  baseUrl: "http://www.alternative-url.com",
  eventsUrl: "http://www.alternative-url.com"
}

// Create client with options
const client = new Client(apiKey, options);
```


| Name      | Description | default |
| ----------- | ----------- |---------
| baseUrl     | the URL used to fetch feature flag evaluations. You should change this when using the Feature Flag proxy to http://localhost:7000| https://config.ff.harness.io/api/1.0 |
| eventsUrl   | the URL used to post metrics data to the feature flag service. You should change this when using the Feature Flag proxy to http://localhost:7000      | https://events.ff.harness.io/api/1.0 |
| pollInterval   | when running in stream mode, the interval in seconds that we poll for changes.        | 60 |
| enableStream   | Enable streaming mode.        | true |
| enableAnalytics   | Enable analytics.  Metrics data is posted every 60s        | true |

## Logging Configuration
You can provide your own logger to the SDK, passing it in as a config option.
The following example creates an instance of the winston logger, sets the level
to DEBUG and passes it to the client.

```javascript
const winston = require('winston')

// Create client with logger
const client = new Client(apiKey, {
  logger: new winston.createLogger({
    level: 'debug',
    transports: [new winston.transports.Console()]
  })
});
```


## Importing and Initializing the SDK 

### Import the package (CommonJS)

```javascript
const { Client } = require('@harnessio/ff-nodejs-server-sdk');
```

### Import the package (ES modules)

```typescript
import { Client } from '@harnessio/ff-nodejs-server-sdk';
```

### Initialize

This is the most simple way to initialize SDK using only a server type key

```
const client = new Client('your server type SDK key');
```

Advanced initialization can be done using options

```typescript
const client = new Client('your server type SDK key', {
  enableStream: false,
});
```

### Define a target

```
const target = {
  identifier: 'harness',
  name: 'Harness',
  attributes: {}
};
```

### Evaluate the flag with default value set to false

```typescript
const value = await client.boolVariation('test', target, false);
```

### Shutting down SDK

```
client.close();
```

### Available public methods

```typescript
function boolVariation(
  identifier: string,
  target: Target,
  defaultValue: boolean = true,
): Promise<boolean>;
function stringVariation(
  identifier: string,
  target: Target,
  defaultValue: boolean = '',
): Promise<string>;
function numberVariation(
  identifier: string,
  target: Target,
  defaultValue: boolean = 1.0,
): Promise<number>;
function jsonVariation(
  identifier: string,
  target: Target,
  defaultValue: boolean = {},
): Promise<Record<string, unknown>>;
function close(): void;
```

### Available options

```
baseUrl: string;             // baseUrl is where the flag configurations are located
eventsUrl: string;           // eventsUrl is where we send summarized target events
pollInterval: number;        // pollInterval (default 60s)
eventsSyncInterval: number;  // Metrics push event (default 60s)
enableStream: boolean;       // enable server sent events
enableAnalytics: boolean;    // enable analytics
cache: KeyValueStore;        // set custom cache (default lru cache)
store: AsyncKeyValueStore;   // set custom persistent store (default file store)
logger: Logger;              // set logger (default console)
axiosTimeout: number;        // set timeout for requests to Harness (default 30s) 
```

## Singleton example

```
import CfClient from '@harnessio/ff-nodejs-server-sdk';

CfClient.init('your server type SDK key');

const FLAG_KEY = 'test_bool';
const target = {
  identifier: 'harness',
  name: 'Harness',
  attributes: {}
};
const defaultValue = false;

setInterval(async() => {
    const value = await CfClient.boolVariation(FLAG_KEY, target, defaultValue);
    console.log("Evaluation for flag test and target none: ", value);
}, 10000);
```

## Wait for initialization example

```
const { Client } = require('@harnessio/ff-nodejs-server-sdk');

console.log('Starting application');
const client = new Client('1c100d25-4c3f-487b-b198-3b3d01df5794');
client
  .waitForInitialization()
  .then(() => {
    setInterval(async () => {
      const target = {
        identifier: 'harness',
      };
      const value = await client.boolVariation('test', target, false);
      console.log('Evaluation for flag test and target: ', value, target);
    }, 10000);

    console.log('Application started');
  })
  .catch((error) => {
    console.log('Error', error);
  });
```

## Listening on events

You can listen on these events:

- `Event.READY` - SDK successfully initialized
- `Event.FAILED` - SDK throws an error
- `Event.CHANGED` - any new version of flag or segment triggers this event, if segment is changed then it will find all flags with segment match operator

Methods:

```typescript
on(Event.READY, () => {
  console.log('READY');
});

on(Event.FAILED, () => {
  console.log('FAILED');
});

on(Event.CHANGED, (identifier) => {
  console.log('Changed', identifier);
});
```

and if you want to remove the `functionReference` listener for `Event.READY`:

```
off(Event.READY, functionReference);
```

or if you want to remove all listeners on `Event.READY`:

```
off(Event.READY);
```

or if you call `off()` without params it will close the client.

> All events are applicable to off() function.