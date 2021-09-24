import * as fs from 'fs';
import * as path from 'path';

import { SimpleCache } from '../src/cache';
import { StorageRepository } from '../src/repository';
import { FeatureConfig, FeatureConfigKindEnum } from '../src/openapi';
import { Evaluator } from '../src/evaluator';
import { Target } from '../src/types';

const directory = path.join(__dirname, 'usecases');

interface Usecase {
  flag: FeatureConfig;
  targets: Target[];
  expected: Record<string, unknown>;
}

const cache = new SimpleCache();
const repository = new StorageRepository(cache);
const evaluator = new Evaluator(repository);

let files = [];
try {
  files = fs.readdirSync(directory);
} catch (err) {
  if (err) {
    throw new Error('Unable to scan directory: ' + err);
  }
}

const results = [];

for (const file of files) {
  try {
    const data = fs.readFileSync(path.join(directory, file), 'utf8');
    const usecase = JSON.parse(data) as Usecase;
    usecase.flag.feature += file;
    repository.setFlag(usecase.flag.feature, usecase.flag);

    Object.entries(usecase.expected).forEach(([targetIdentifier, value]) => {
      const result = [
        file,
        targetIdentifier,
        value,
        usecase,
      ];
      console.log(file, targetIdentifier, value)
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
    (file: string, targetIdentifier: string, expected: unknown, usecase: Usecase) => {
      let target: Target;
      if (targetIdentifier === '_no_target') {
        target = undefined;
      } else {
        target = usecase.targets.find(
          (item) => item.identifier === targetIdentifier,
        );
      }
      let got: unknown;
      switch (usecase.flag.kind) {
        case FeatureConfigKindEnum.Boolean:
          got = evaluator.boolVariation(
            usecase.flag.feature,
            target,
            false,
          );
          break;
        case FeatureConfigKindEnum.String:
          got = evaluator.stringVariation(usecase.flag.feature, target, '');
          break;
        case FeatureConfigKindEnum.Int:
          got = evaluator.numberVariation(usecase.flag.feature, target, 0);
          break;
        case FeatureConfigKindEnum.Json:
          got = evaluator.jsonVariation(usecase.flag.feature, target, {});
          break;
      }
      console.log(
        `Usecase ${file} with target ${targetIdentifier} and expected value ${expected} got ${got}`,
      );
      expect(expected).toBe(got);
  })
});
