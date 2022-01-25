/* eslint-disable import/no-extraneous-dependencies */
import snapshotMatcher from '@hilla/generator-typescript-utils/testing/snapshotMatcher.js';
import { expect, use } from 'chai';
import sinonChai from 'sinon-chai';
import BackbonePlugin from '../../src/index.js';
import { createGenerator, loadInput, pathBase } from '../utils/common.js';

use(sinonChai);
use(snapshotMatcher);

describe('BackbonePlugin', () => {
  context('when there is a complex hierarchy of entities', () => {
    const sectionName = 'ComplexHierarchy';
    const modelSectionPath = `${pathBase}/${sectionName.toLowerCase()}/models`;

    it('correctly generates code', async () => {
      const generator = createGenerator([BackbonePlugin]);
      const input = await loadInput(sectionName, import.meta.url);
      const files = await generator.process(input);
      expect(files.length).to.equal(4);

      const [endpointFile, grandParentModelEntityFile, modelEntityFile, parentModelEntityFile] = files;
      await expect(await endpointFile.text()).toMatchSnapshot(`${sectionName}Endpoint`, import.meta.url);
      await expect(await modelEntityFile.text()).toMatchSnapshot('Model.entity', import.meta.url);
      await expect(await parentModelEntityFile.text()).toMatchSnapshot('ParentModel.entity', import.meta.url);
      await expect(await grandParentModelEntityFile.text()).toMatchSnapshot('GrandParentModel.entity', import.meta.url);
      expect(endpointFile.name).to.equal(`${sectionName}Endpoint.ts`);
      expect(modelEntityFile.name).to.equal(`${modelSectionPath}/ComplexHierarchyModel.ts`);
      expect(parentModelEntityFile.name).to.equal(`${modelSectionPath}/ComplexHierarchyParentModel.ts`);
      expect(grandParentModelEntityFile.name).to.equal(`${modelSectionPath}/ComplexHierarchyGrandParentModel.ts`);
    });
  });
});
