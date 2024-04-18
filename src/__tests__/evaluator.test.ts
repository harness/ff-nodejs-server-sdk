import { Evaluator } from '../evaluator';
import { Logger } from '../log';
import { SimpleCache } from '../cache';
import { StorageRepository } from '../repository';
import {
  FeatureConfig,
  FeatureConfigKindEnum,
  FeatureState,
  Segment,
} from '../openapi';

const logger: Logger = {
  trace: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('Evaluator', () => {
  it('should fallback to identifier if bucketby attribute does not exist', async () => {
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

  async function loadFlags(repo: StorageRepository) {
    const featureConfigOr: FeatureConfig = {
      feature: 'boolflag_or',
      defaultServe: { variation: 'false' },
      environment: 'test',
      kind: FeatureConfigKindEnum.Boolean,
      offVariation: 'false',
      project: 'test',
      state: FeatureState.On,
      variationToTargetMap: [
        { variation: 'true', targets: [], targetSegments: ['or-segment'] },
      ],
      variations: [
        { identifier: 'true', name: 'True', value: 'true' },
        { identifier: 'false', name: 'False', value: 'false' },
      ],
      version: 1,
    };

    const featureConfigAnd: FeatureConfig = {
      feature: 'boolflag_and',
      defaultServe: { variation: 'false' },
      environment: 'test',
      kind: FeatureConfigKindEnum.Boolean,
      offVariation: 'false',
      project: 'test',
      state: FeatureState.On,
      variationToTargetMap: [
        { variation: 'true', targets: [], targetSegments: ['and-segment'] },
      ],
      variations: [
        { identifier: 'true', name: 'True', value: 'true' },
        { identifier: 'false', name: 'False', value: 'false' },
      ],
      version: 1,
    };

    await repo.setFlag('boolflag_or', featureConfigOr);
    await repo.setFlag('boolflag_and', featureConfigAnd);
  }
  async function loadSegments(repo: StorageRepository) {
    const segmentOr: Segment = {
      identifier: 'or-segment',
      name: 'is_harness_or_somethingelse_email_OR',
      environment: 'Production',
      // only 1 servingRules needs to be true (OR)
      servingRules: [
        {
          ruleId: 'this_or_rule_with_lower_priority_should_be_ignored',
          priority: 7,
          clauses: [
            {
              attribute: 'email',
              op: 'ends_with',
              values: ['@harness.io'],
              negate: false,
            },
          ],
        },
        {
          ruleId: 'rule1',
          priority: 1,
          clauses: [
            {
              attribute: 'email',
              op: 'ends_with',
              values: ['@harness.io'],
              negate: false,
            },
          ],
        },
        {
          ruleId: 'rule2',
          priority: 2,
          clauses: [
            {
              attribute: 'email',
              op: 'ends_with',
              values: ['@somethingelse.com'],
              negate: false,
            },
          ],
        },
      ],
      version: 2,
    };

    const segmentAnd: Segment = {
      identifier: 'and-segment',
      name: 'is_a_harness_developer_test_AND',
      environment: 'Production',
      servingRules: [
        {
          ruleId: 'rule1',
          priority: 1,
          // all clauses need to be true (AND)
          clauses: [
            {
              attribute: 'email',
              op: 'ends_with',
              values: ['@harness.io'],
              negate: false,
            },
            {
              attribute: 'role',
              op: 'equal',
              values: ['developer'],
              negate: false,
            },
          ],
        },
      ],
    };

    await repo.setSegment('or-segment', segmentOr);
    await repo.setSegment('and-segment', segmentAnd);
  }

  test.each([
    // if (target.attr.email endswith '@harness.io' && target.attr.role = 'developer')
    ['boolflag_and', true, 'user@harness.io', 'developer'],
    ['boolflag_and', false, 'user@harness.io', 'manager'],
    ['boolflag_and', false, 'user@gmail.com', 'developer'],
    ['boolflag_and', false, 'user@gmail.com', 'manager'],
    // if (target.attr.email endswith '@harness.io' || target.attr.email endswith '@somethingelse.com')
    ['boolflag_or', true, 'user@harness.io', 'n/a'],
    ['boolflag_or', true, 'user@somethingelse.com', 'n/a'],
    ['boolflag_or', false, 'user@gmail.com', 'n/a'],
  ])(
    'Flag %s should evaluate to %s when target email=%s role=%s',
    async (flagName, expected, email, role) => {
      const cache = new SimpleCache();
      const repository = new StorageRepository(cache);
      const evaluator = new Evaluator(repository, logger);

      await loadFlags(repository);
      await loadSegments(repository);

      const target = {
        identifier: 'test',
        name: 'test',
        attributes: {
          email,
          role,
        },
      };

      const result = await evaluator.boolVariation(flagName, target, !expected);

      expect(result).toEqual(expected);
    },
  );
});
