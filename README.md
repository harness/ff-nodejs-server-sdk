# Harness Feature Flags Server SDK for NodeJS

[![TypeScript version][ts-badge]][typescript-4-3]
[![Node.js version][nodejs-badge]][nodejs]
[![APLv2][license-badge]][license]

# Before you begin

Harness Feature Flags (FF) is a feature management solution that enables users to change the software’s functionality, without deploying new code. FF uses feature flags to hide code or behaviours without having to ship new versions of the software. A feature flag is like a powerful if statement.

For more information, see https://harness.io/products/feature-flags/

To read more, see https://ngdocs.harness.io/category/vjolt35atg-feature-flags

To sign up, https://app.harness.io/auth/#/signup/

## Getting started....

### Setup

```shell
npm install @harnessio/ff-nodejs-server-sdk
```

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

## License

Licensed under the APLv2.

[ts-badge]: https://img.shields.io/badge/TypeScript-4.3-blue.svg
[nodejs-badge]: https://img.shields.io/badge/Node.js->=%2012-blue.svg
[nodejs]: https://nodejs.org/dist/latest-v14.x/docs/api/
[typescript]: https://www.typescriptlang.org/
[typescript-4-3]: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-3.html
[license-badge]: https://img.shields.io/badge/license-APLv2-blue.svg
[license]: https://github.com/drone/ff-nodejs-server-sdk/blob/main/LICENSE
[jest]: https://facebook.github.io/jest/
[eslint]: https://github.com/eslint/eslint
[prettier]: https://prettier.io
[volta]: https://volta.sh
[gh-actions]: https://github.com/features/actions
