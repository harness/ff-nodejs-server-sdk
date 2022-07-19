# Node.js SDK For Harness Feature Flags

[![TypeScript version][ts-badge]][typescript-4-3]
[![Node.js version][nodejs-badge]][nodejs]
[![APLv2][license-badge]][license]

Use this README to get started with our Feature Flags (FF) SDK for Node.js. This guide outlines the basics of getting
started with the SDK and provides a full code sample for you to try out.

This sample doesn't include configuration options, for in depth steps and configuring the SDK, for example, disabling
streaming or using our Relay Proxy, see the [Node.js SDK Reference](https://docs.harness.io/article/3v7fclfg59-node-js-sdk-reference).

## Requirements

To use this SDK, make sure you’ve:

- Installed Node.js v12 or a newer version

To follow along with our test code sample, make sure you’ve:

- [Created a Feature Flag on the Harness Platform](https://docs.harness.io/article/1j7pdkqh7j-create-a-feature-flag) called `harnessappdemodarkmode`
- [Created a server SDK key](https://docs.harness.io/article/1j7pdkqh7j-create-a-feature-flag#step_3_create_an_sdk_key) and made a copy of it

## Installing the SDK

The first step is to install the FF SDK as a dependency in your application. To install using npm, use:

```shell
npm install @harnessio/ff-nodejs-server-sdk
```

Or to install with yarn, use:

```shell
yarn add @harnessio/ff-nodejs-server-sdk
```

## Code Sample

The following is a complete code example that you can use to test the `harnessappdemodarkmode` Flag you created on the
Harness Platform. When you run the code it will:

- Connect to the FF service.
- Report the value of the Flag every 10 seconds until the connection is closed.
- Listen for when the `harnessappdemodarkmode` Flag is toggled on or off on the Harness Platform and report the new value.

```javascript
const { Client, Event } = require('@harnessio/ff-nodejs-server-sdk');

(async () => {
  // set apiKey to your SDK API Key
  const apiKey = 'YOUR_FF_SDK_KEY';

  // set flagName to your flag identifier from the UI
  const flagName = 'harnessappdemodarkmode';

  console.log('Harness SDK Getting Started');

  // Create Client
  const client = new Client(apiKey);

  // Create a target (different targets can receive different results based on rules.
  // Here we are including "location" as a custom attribute)
  const target = {
    identifier: 'nodeserversdk',
    name: 'NodeServerSDK',
    attributes: {
      location: 'emea',
    },
  };

  await client.waitForInitialization();

  try {
    // Log the state of the flag every 10 seconds
    setInterval(async () => {
      const value = await client.boolVariation(flagName, target, false);
      console.log('Flag variation:', value);
    }, 10000);

    // We can also watch for the event when a flag changes
    client.on(Event.CHANGED, async (flagIdentifier) => {
      const value = await client.boolVariation(flagIdentifier, target, false);
      console.log(`${flagIdentifier} changed: ${value}`);
    });
  } catch (e) {
    console.error('Error:', e);
  }
})();
```

## Running the example

To run the example, execute your script:

```shell
node example.js
```

When you're finished you can exit the example by stopping the process using <kbd>control</kbd>-<kbd>c</kbd>.

## Additional Reading

For further examples and config options, see the [Node.js SDK Reference](https://docs.harness.io/article/3v7fclfg59-node-js-sdk-reference) and the [test Node.js project](https://github.com/drone/ff-nodejs-server-sdk).
For more information about Feature Flags, see our [Feature Flags documentation](https://docs.harness.io/article/0a2u2ppp8s-getting-started-with-feature-flags).

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
