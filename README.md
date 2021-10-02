# Harness Feature Flags Server SDK for NodeJS

[![TypeScript version][ts-badge]][typescript-4-3]
[![Node.js version][nodejs-badge]][nodejs]
[![APLv2][license-badge]][license]

# Before you Begin
Harness Feature Flags (FF) is a feature management solution that enables users to change the software’s functionality, without deploying new code. FF uses feature flags to hide code or behaviours without having to ship new versions of the software. A feature flag is like a powerful if statement.

For more information, see https://harness.io/products/feature-flags/

To read more, see https://ngdocs.harness.io/category/vjolt35atg-feature-flags

To sign up, https://app.harness.io/auth/#/signup/

## Getting Started

### Setup

```npm install @harness/ff-nodejs-server-sdk```

### Import the package (CommonJS)

```
const { Client } = require('ff-nodejs-server-sdk');
```

### Import the package (ES modules)

```
import { Client } from 'ff-nodejs-server-sdk';
```

### Initialize

This is the most simple way to initialize SDK using only a server type key
```
const client = new Client('your server type SDK key');
```

Advanced initialization can be done using options
```
const client = new Client('your server type SDK key', {
  enableStream: false
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
```
const value = await client.boolVariation('test', target, false);
```

### Shutting down SDK
```
client.close();
```

### Avaialable public methods
```
function boolVariation(identifier: string, target: Target, defaultValue = true): boolean;
function stringVariation(identifier, target: Target, defaultValue = ''): string;
function numberVariation(identifier, target: Target, defaultValue = 1.0): number;
function jsonVariation(identifier, target: Target, defaultValue = {}): Record<string, unknown>;
function close();
```

### Avaialable options

```
baseUrl: string;
eventsUrl: string;
pollInterval: number;
eventsSyncInterval: number;
enableStream: boolean;
enableAnalytics: boolean;
cache: KeyValueStore;
store: AsyncKeyValueStore;
logger: Logger;
```

## Singleton example

```
import CfClient from 'ff-nodejs-server-sdk';

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
