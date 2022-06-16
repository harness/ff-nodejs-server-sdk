const { Client, Event } = require('@harnessio/ff-nodejs-server-sdk');

(async () => {
  // set apiKey to your SDK API Key
  const apiKey =
    process.env['FF_API_KEY'] ?? 'cffc3f1d-6ea9-4017-9455-dda84964cfb5';

  // set flagName to your flag identifier from the UI
  const flagName = process.env['FF_FLAG_NAME'] ?? 'harnessappdemodarkmode';

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
