Harness Feature Flags NodeJS SDK
========================

[![TypeScript version][ts-badge]][typescript-4-3]
[![Node.js version][nodejs-badge]][nodejs]
[![APLv2][license-badge]][license]


## Table of Contents
**[Intro](#Intro)**<br>
**[Requirements](#Requirements)**<br>
**[Quickstart](#Quickstart)**<br>
**[Further Reading](docs/further_reading.md)**<br>
**[Build Instructions](docs/build.md)**<br>

## Intro

Harness Feature Flags (FF) is a feature management solution that enables users to change the software’s functionality, without deploying new code. FF uses feature flags to hide code or behaviours without having to ship new versions of the software. A feature flag is like a powerful if statement.
* For more information, see https://harness.io/products/feature-flags/
* To read more, see https://ngdocs.harness.io/category/vjolt35atg-feature-flags
* To sign up, https://app.harness.io/auth/#/signup/

![FeatureFlags](https://github.com/harness/ff-python-server-sdk/raw/main/docs/images/ff-gui.png)

## Requirements
[NodeJS](https://nodejs.org/en/download/) >= 12 <br>

## Quickstart
The Feature Flag SDK provides a client that connects to the feature flag service, and fetches the value
of feature flags.   The following section provides an example of how to install the SDK and initalize it from
an application.
This quickstart assumes you have followed the instructions to [setup a Feature Flag project and have created a flag called `harnessappdemodarkmode` and created a server API Key](https://ngdocs.harness.io/article/1j7pdkqh7j-create-a-feature-flag#step_1_create_a_project).



### Install the SDK
```bash
npm install @harnessio/ff-nodejs-server-sdk
```

### A Simple Example
Here is a complete example that will connect to the feature flag service and report the flag value every 10 seconds until the connection is closed.
Any time a flag is toggled from the feature flag service you will receive the updated value.

```javascript
const { Client, Event } = require('@harnessio/ff-nodejs-server-sdk');

// set apiKey to the SDK API Key
const apiKey = (process.env['FF_API_KEY']) ? process.env['FF_API_KEY'] : '';

// set flagName to the flag identifier from the UI
const flagName = (process.env['FF_FLAG_NAME']) ? process.env['FF_FLAG_NAME'] : 'harnessappdemodarkmode';

console.log('Harness SDK Getting Started');

// Create Client
const client = new Client(apiKey);

// Create a target (different targets can get different results based on rules.
// This include a custom attribute 'location')
const target = {
  identifier: 'nodeserversdk',
  name: 'NodeServerSDK',
  attributes: {
    "location": "emea"
  }
};

client
  .waitForInitialization()
  .then(() => {
    // Loop forever reporting the state of the flag
    setInterval(async () => {
      const value = await client.boolVariation(flagName, target, false);
      console.log('Flag variation: ', value);
    }, 10000);


    // We can also watch for event, when a flag changes.
    client.on(Event.CHANGED, (flagIdentifier) => {
      console.log('Flag changed',flagIdentifier);
    });

  })
  .catch((error) => {
    console.log('Error', error);
  });

process.on('SIGINT', function () {
  console.log('Got SIGINT.  Press Control-D to exit.');
  client.close()
});
```

### Running the example

```bash
export FF_API_KEY=<your key here>
cd examples/getting_started

npm install 
node examples/getting_started/index.js
```

### Running with docker
If you don't have the right version of python installed locally, or don't want to install the dependencies you can
use docker to get started quickly.

```bash
# Install the package
docker run -v $(pwd)/examples/getting_started:/app -w /app node:lts-alpine npm install

# Run the script
docker run -e FF_API_KEY=$FF_API_KEY -v $(pwd)/examples/getting_started:/app -w /app node:lts-alpine node index.js
```

### Additional Reading

Further examples and config options are in the further reading section:

[Further Reading](docs/further_reading.md)


-------------------------
[Harness](https://www.harness.io/) is a feature management platform that helps teams to build better software and to
test features quicker.

-------------------------

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
