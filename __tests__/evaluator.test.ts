import * as fs from 'fs';
import * as path from 'path';

import { SimpleCache } from '../src/cache';
import { StorageRepository } from '../src/repository';
import { FeatureConfig, FeatureConfigKindEnum, Segment } from '../src/openapi';
import { Evaluator } from '../src/evaluator';
import { Target } from '../src/types';

const directory = path.join(__dirname, 'ff-test-cases/tests');

interface Usecase {
  flag: FeatureConfig;
  segments: Segment[];
  targets: Target[];
  expected: Record<string, unknown>;
}

const cache = new SimpleCache();
const repository = new StorageRepository(cache);
const evaluator = new Evaluator(repository);

const results = [];
let files = [];
try {
  files = fs.readdirSync(directory);
} catch (err) {
  if (err) {
    throw new Error('Unable to scan directory: ' + err);
  }
}

for (const file of files) {
  try {
    const data = fs.readFileSync(path.join(directory, file), 'utf8');
    const usecase = JSON.parse(data) as Usecase;
    usecase.flag.feature += file;
    repository.setFlag(usecase.flag.feature, usecase.flag);

    usecase.segments?.forEach((segment: Segment) =>
      repository.setSegment(segment.identifier, segment),
    );

    Object.entries(usecase.expected).forEach(([targetIdentifier, value]) => {
      const result = [file, targetIdentifier, value, usecase];
      results.push(result);
    });
  } catch (err) {
    if (err) {
      throw err;
    }
  }
}

describe('evaluation flag', () => {
  test.each(results)(
    `Usecase %p with target %p and expected value %p`,
    async (
      _file: string,
      targetIdentifier: string,
      expected: unknown,
      usecase: Usecase,
    ) => {
      let target: Target;
      if (targetIdentifier === '_no_target') {
        target = undefined;
      } else {
        target = usecase.targets.find(
          (item) => item.identifier === targetIdentifier,
        );
      }
      let received: unknown;
      switch (usecase.flag.kind) {
        case FeatureConfigKindEnum.Boolean:
          received = await evaluator.boolVariation(
            usecase.flag.feature,
            target,
            false,
          );
          break;
        case FeatureConfigKindEnum.String:
          received = await evaluator.stringVariation(
            usecase.flag.feature,
            target,
            '',
          );
          break;
        case FeatureConfigKindEnum.Int:
          received = await evaluator.numberVariation(
            usecase.flag.feature,
            target,
            0,
          );
          break;
        case FeatureConfigKindEnum.Json:
          received = await evaluator.jsonVariation(
            usecase.flag.feature,
            target,
            {},
          );
          break;
      }
      expect(received).toBe(expected);
    },
  );
});
