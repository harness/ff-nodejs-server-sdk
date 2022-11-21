import * as fs from 'fs';
import * as path from 'path';

import { SimpleCache } from '../src/cache';
import { StorageRepository } from '../src/repository';
import { FeatureConfig, FeatureConfigKindEnum, Segment } from '../src/openapi';
import { Evaluator } from '../src/evaluator';
import { Target } from '../src/types';
import { defaultOptions } from '../src/constants';

const directory = path.join(__dirname, 'ff-test-cases/tests');

interface Fixture {
  flags: FeatureConfig[];
  segments: Segment[];
  targets: Target[];
  tests: Test[];
}

interface Test {
  flag: string;
  expected: string;
  target: string;
}

const cache = new SimpleCache();
const repository = new StorageRepository(cache);
const evaluator = new Evaluator(repository, defaultOptions.logger);

const testCases = [];
let files = [];
try {
  const walk = function(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
      file = dir + '/' + file;
      const stat = fs.statSync(file);
      if (stat && stat.isDirectory()) {
        /* Recurse into a subdirectory */
        results = results.concat(walk(file));
      } else {
        /* Is a file */
        results.push(file);
      }
    });
    return results;
  };
  files = walk(directory)
} catch (err) {
  if (err) {
    throw new Error('Unable to scan directory: ' + err);
  }
}

for (const file of files) {
  try {
    const data = fs.readFileSync(file, 'utf8');
    const fixture = JSON.parse(data) as Fixture;

    // Store all the flags for the test in the repo
    fixture.flags?.forEach((flag: FeatureConfig) =>
      repository.setFlag(flag.feature, flag),
    );

    // Store all segments for the test in the repo
    fixture.segments?.forEach((segment: Segment) =>
      repository.setSegment(segment.identifier, segment),
    );


    fixture.tests?.forEach((tc: Test) => {
      // Get the flag for this test
      const fc = fixture.flags?.find(
        (item) => item.feature === tc.flag,
      );

      let target: Target;
      if (tc.target === '_no_target') {
        target = undefined;
      } else {
        target = fixture.targets.find(
          (item) => item.identifier === tc.target,
        );
      }

      const result = [file.replace(directory, ""), target, tc.expected, fc];
      testCases.push(result);
    });


  } catch (err) {
    if (err) {
      throw err;
    }
  }
}

describe('evaluation flag', () => {
  test.each(testCases)(
    `Usecase %p with target %p and expected value %p`,
    async (
      _file: string,
      target: Target,
      expected: string,
      flag: FeatureConfig
    ) => {

      let received: unknown;
      switch (flag?.kind) {
        case FeatureConfigKindEnum.Boolean:
          received = await evaluator.boolVariation(
            flag.feature,
            target,
            false,
          );
          break;
        case FeatureConfigKindEnum.String:
          received = await evaluator.stringVariation(
            flag.feature,
            target,
            '',
          );
          break;
        case FeatureConfigKindEnum.Int:
          received = await evaluator.numberVariation(
            flag.feature,
            target,
            0,
          );
          break;
        case FeatureConfigKindEnum.Json:
          received = await evaluator.jsonVariation(
            flag.feature,
            target,
            {},
          );
          // parse the expected JSON string to JSON
          expected = JSON.parse(expected)
          break;
      }
      expect(received).toStrictEqual(expected);
    },
  );
});
