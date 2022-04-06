import Client from '../client';
import { PollingProcessor } from '../polling';

jest.mock('../openapi/api');

it('check close client', async () => {
  // given
  const start = jest.spyOn(PollingProcessor.prototype, 'start');
  const close = jest.spyOn(PollingProcessor.prototype, 'close');

  // when
  const client = new Client('some key', {
    enableAnalytics: false,
  });
  await client.waitForInitialization();

  client.close();

  // then
  expect(start).toBeCalledTimes(1);
  expect(close).toBeCalledTimes(1);
});
