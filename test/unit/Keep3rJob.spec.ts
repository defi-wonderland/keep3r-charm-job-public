import { MockContract, MockContractFactory, smock } from '@defi-wonderland/smock';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signers';
import { Keep3rJobForTest, Keep3rJobForTest__factory } from '@typechained';
import { wallet } from '@utils';
import { fnShouldOnlyBeCallableByGovernor } from '@utils/behaviours';
import { toUnit } from '@utils/bn';
import { expect } from 'chai';
import { ContractTransaction } from 'ethers';
import { ethers } from 'hardhat';

describe('Keep3rJob', () => {
  let governor: SignerWithAddress;
  let jobFactory: MockContractFactory<Keep3rJobForTest__factory>;
  let job: MockContract<Keep3rJobForTest>;
  const keep3r = wallet.generateRandomAddress();
  const requiredBond = wallet.generateRandomAddress();
  const requiredMinBond = toUnit(1);
  const requiredEarnings = toUnit(2);
  const requiredAge = toUnit(3);
  const requiredEOA = false;

  before(async () => {
    [, governor] = await ethers.getSigners();
    jobFactory = await smock.mock<Keep3rJobForTest__factory>('Keep3rJobForTest');
  });

  beforeEach(async () => {
    job = await jobFactory.deploy(governor.address, keep3r, requiredBond, requiredMinBond, requiredEarnings, requiredAge, requiredEOA);
  });

  describe('setKeep3r', () => {
    const random = wallet.generateRandomAddress();

    it('should set the keep3r', async () => {
      await job.connect(governor).setKeep3r(random);
      expect(await job.keep3r()).to.equal(random);
    });

    it('should emit event', async () => {
      await expect(job.connect(governor).setKeep3r(random)).to.emit(job, 'Keep3rSet').withArgs(random);
    });
  });

  describe('setKeep3rRequirements', () => {
    let newRequiredBond = wallet.generateRandomAddress();
    let newRequiredMinBond = requiredMinBond.add(1);
    let newRequiredEarnings = requiredEarnings.add(1);
    let newRequiredAge = requiredAge.add(1);
    let newRequiredEOA = !requiredEOA;

    fnShouldOnlyBeCallableByGovernor(
      () => job,
      'setKeep3rRequirements',
      () => governor.address,
      [newRequiredBond, newRequiredMinBond, newRequiredEarnings, newRequiredAge, newRequiredEOA]
    );

    context('after calling the function', () => {
      let tx: ContractTransaction;

      beforeEach(async () => {
        tx = await job
          .connect(governor)
          .setKeep3rRequirements(newRequiredBond, newRequiredMinBond, newRequiredEarnings, newRequiredAge, newRequiredEOA);
      });

      it('should set the required bond', async () => {
        expect(await job.requiredBond()).to.equal(newRequiredBond);
      });

      it('should set the required minimum bond', async () => {
        expect(await job.requiredMinBond()).to.equal(newRequiredMinBond);
      });

      it('should set the required earnings', async () => {
        expect(await job.requiredEarnings()).to.equal(newRequiredEarnings);
      });

      it('should set the required age', async () => {
        expect(await job.requiredAge()).to.equal(newRequiredAge);
      });

      it('should set the required EOA', async () => {
        expect(await job.requiredEOA()).to.equal(newRequiredEOA);
      });

      it('should emit event', async () => {
        await expect(tx)
          .to.emit(job, 'Keep3rRequirementsSet')
          .withArgs(newRequiredBond, newRequiredMinBond, newRequiredEarnings, newRequiredAge, newRequiredEOA);
      });
    });
  });
});
