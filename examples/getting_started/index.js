const { Client, Event } = require('@harnessio/ff-nodejs-server-sdk');

// set apiKey to the SDK API Key
const apiKey = (process.env['FF_API_KEY']) ? process.env['FF_API_KEY'] : 'cffc3f1d-6ea9-4017-9455-dda84964cfb5';

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

