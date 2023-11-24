import { Evaluator } from '../evaluator';
import { Logger } from '../log';

describe('Evaluator', () => {
  it('should fallback to identifier if bucketby attribute does not exist', async () => {
    const logger: Logger = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    const mock_query = {
      getFlag: jest.fn(),
      getSegment: jest.fn(),
      findFlagsBySegment: jest.fn(),
    };

    const feature_config = {
      feature: 'flag',
      kind: 'string',
      state: 'on',
      variationToTargetMap: [],
      variations: [
        { identifier: 'variation1', value: 'default_on' },
        { identifier: 'variation2', value: 'wanted_value' },
        { identifier: 'variation3', value: 'default_off' },
      ],
      defaultServe: {
        distribution: null,
        variation: 'default_on',
      },
      offVariation: 'variation3',
      rules: [
        {
          ruleId: 'rule1',
          clauses: [
            {
              op: 'equal',
              attribute: 'identifier',
              values: ['test'],
            },
          ],
          serve: {
            distribution: {
              bucketBy: 'i_do_not_exist',
              variations: [
                { variation: 'variation1', weight: 56 },
                { variation: 'variation2', weight: 1 }, // bucket 57
                { variation: 'variation3', weight: 43 },
              ],
            },
          },
        },
      ],
    };

    mock_query.getFlag.mockReturnValue(feature_config);

    const evaluator = new Evaluator(mock_query, logger);

    const target = {
      identifier: 'test', // Test will fall back to bucketing on this (bucket 57)
      name: 'test name',
      attributes: {
        location: 'emea',
      },
    };

    const actual_variation = await evaluator.stringVariation(
      'flag',
      target,
      'fallback_value',
      null,
    );

    expect(actual_variation).toEqual('wanted_value');
  });
});
