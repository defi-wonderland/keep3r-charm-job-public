import { FakeContract, MockContract, MockContractFactory, smock } from '@defi-wonderland/smock';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signers';
import IKeep3rV1Artifact from '@solidity/interfaces/external/IKeep3rV1.sol/IKeep3rV1.json';
import IStrategyArtifact from '@solidity/interfaces/external/IStrategy.sol/IStrategy.json';
import { AlphaJob, AlphaJob__factory, IKeep3rV1, IStrategy, ProxyForTest__factory } from '@typechained';
import { wallet } from '@utils';
import { fnShouldOnlyBeCallableByGovernor } from '@utils/behaviours';
import { toUnit } from '@utils/bn';
import { ZERO_ADDRESS } from '@utils/constants';
import chai, { expect } from 'chai';
import { ethers } from 'hardhat';

chai.use(smock.matchers);

describe('AlphaJob', () => {
  let governor: SignerWithAddress;
  let keeper: SignerWithAddress;
  let jobFactory: MockContractFactory<AlphaJob__factory>;
  let job: MockContract<AlphaJob>;
  let keep3r: FakeContract<IKeep3rV1>;
  const requiredBond = wallet.generateRandomAddress();
  const requiredMinBond = toUnit(1);
  const requiredEarnings = toUnit(2);
  const requiredAge = toUnit(3);
  const requiredEOA = false;

  before(async () => {
    [, governor, keeper] = await ethers.getSigners();
    jobFactory = await smock.mock<AlphaJob__factory>('AlphaJob');
  });

  beforeEach(async () => {
    keep3r = await smock.fake<IKeep3rV1>(IKeep3rV1Artifact);

    job = await jobFactory.deploy(governor.address, keep3r.address, requiredBond, requiredMinBond, requiredEarnings, requiredAge, requiredEOA);
  });

  describe('constructor', () => {
    it('should set the governor', async () => {
      expect(await job.governor()).to.equal(governor.address);
    });

    it('should set the keep3r', async () => {
      expect(await job.keep3r()).to.equal(keep3r.address);
    });

    it('should set the required bond', async () => {
      expect(await job.requiredBond()).to.equal(requiredBond);
    });

    it('should set the required minimum bond', async () => {
      expect(await job.requiredMinBond()).to.equal(requiredMinBond);
    });

    it('should set the required earnings', async () => {
      expect(await job.requiredEarnings()).to.equal(requiredEarnings);
    });

    it('should set the required age', async () => {
      expect(await job.requiredAge()).to.equal(requiredAge);
    });

    it('should set the required EOA', async () => {
      expect(await job.requiredEOA()).to.equal(requiredEOA);
    });
  });

  describe('addStrategy', () => {
    const random = wallet.generateRandomAddress();

    fnShouldOnlyBeCallableByGovernor(
      () => job,
      'addStrategy',
      () => governor.address,
      () => [random]
    );

    it('should revert when strategy is already added', async () => {
      await job.connect(governor).addStrategy(random);
      await expect(job.connect(governor).addStrategy(random)).to.be.revertedWith('StrategyAlreadyAdded()');
    });

    it('should add strategy to the list', async () => {
      await job.connect(governor).addStrategy(random);
      expect(await job.strategies()).to.deep.equal([random]);
    });

    it('should be able to add multiple strategies', async () => {
      const random2 = wallet.generateRandomAddress();

      await job.connect(governor).addStrategy(random);
      await job.connect(governor).addStrategy(random2);
      expect(await job.strategies()).to.deep.equal([random, random2]);
    });

    it('should emit event', async () => {
      await expect(job.connect(governor).addStrategy(random)).to.emit(job, 'StrategyAddition').withArgs(random);
    });
  });

  describe('revokeStrategy', () => {
    const random = wallet.generateRandomAddress();

    beforeEach(async () => {
      await job.connect(governor).addStrategy(random);
    });

    fnShouldOnlyBeCallableByGovernor(
      () => job,
      'revokeStrategy',
      () => governor.address,
      () => [random]
    );

    it('should revert when strategy was not added', async () => {
      await expect(job.connect(governor).revokeStrategy(wallet.generateRandomAddress())).to.be.revertedWith('StrategyNotExistent()');
    });

    it('should remove strategy from the list', async () => {
      await job.connect(governor).revokeStrategy(random);
      expect(await job.strategies()).to.deep.equal([]);
    });

    it('should emit event', async () => {
      await expect(job.connect(governor).revokeStrategy(random)).to.emit(job, 'StrategyRevokation').withArgs(random);
    });
  });

  describe('workable()', () => {
    it('should return zero address if there are no strategies', async () => {
      expect(await job['workable()']()).to.equal(ZERO_ADDRESS);
    });

    context('when having strategies', () => {
      let strategyA: FakeContract<IStrategy>;
      let strategyB: FakeContract<IStrategy>;
      let strategyC: FakeContract<IStrategy>;

      beforeEach(async () => {
        strategyA = await smock.fake<IStrategy>(IStrategyArtifact);
        strategyB = await smock.fake<IStrategy>(IStrategyArtifact);
        strategyC = await smock.fake<IStrategy>(IStrategyArtifact);

        await job.connect(governor).addStrategy(strategyA.address);
        await job.connect(governor).addStrategy(strategyB.address);
        await job.connect(governor).addStrategy(strategyC.address);
      });

      it('should return zero address if the contract is paused', async () => {
        strategyA.shouldRebalance.returns(true);
        await job.setVariable('paused', true);
        expect(await job['workable()']()).to.equal(ZERO_ADDRESS);
      });

      it('should return zero address if no strategy is workable', async () => {
        expect(await job['workable()']()).to.equal(ZERO_ADDRESS);
      });

      it(`should return the address of the first workable strategy found`, async () => {
        strategyB.shouldRebalance.returns(true);
        strategyC.shouldRebalance.returns(true);
        expect(await job['workable()']()).to.equal(strategyB.address);
      });

      it('should not check all of the strategies if already found a workable one', async () => {
        strategyA.shouldRebalance.returns(true);

        await job['workable()']();

        expect(strategyA.shouldRebalance).to.be.calledOnce;
        expect(strategyB.shouldRebalance).not.to.be.called;
        expect(strategyC.shouldRebalance).not.to.be.called;
      });
    });
  });

  describe('workable(address)', () => {
    let strategyA: FakeContract<IStrategy>;
    let strategyB: FakeContract<IStrategy>;

    beforeEach(async () => {
      strategyA = await smock.fake<IStrategy>(IStrategyArtifact);
      strategyB = await smock.fake<IStrategy>(IStrategyArtifact);

      await job.connect(governor).addStrategy(strategyA.address);
      await job.connect(governor).addStrategy(strategyB.address);
    });

    it('should return false if the contract is paused', async () => {
      strategyA.shouldRebalance.returns(true);
      await job.setVariable('paused', true);
      expect(await job['workable(address)'](strategyA.address)).to.equal(false);
    });

    it('should return false if the strategy is not workable', async () => {
      expect(await job['workable(address)'](strategyA.address)).to.equal(false);
    });

    it('should return true if the strategy is workable', async () => {
      strategyA.shouldRebalance.returns(true);
      expect(await job['workable(address)'](strategyA.address)).to.equal(true);
    });

    it('should check the strategy status just once', async () => {
      await job['workable(address)'](strategyA.address);
      expect(strategyA.shouldRebalance).to.be.calledOnce;
    });

    it('should not be affected by other strategy status', async () => {
      strategyB.shouldRebalance.returns(true);
      expect(await job['workable(address)'](strategyA.address)).to.equal(false);
    });
  });

  describe('work', () => {
    let strategy: FakeContract<IStrategy>;

    beforeEach(async () => {
      strategy = await smock.fake<IStrategy>(IStrategyArtifact);
    });

    context('keeper validation', () => {
      beforeEach(async () => {
        strategy.shouldRebalance.returns(true);
      });

      it('should revert if allowed only EOA and it is not', async () => {
        keep3r.isBondedKeeper.returns(true);
        await job.setVariable('requiredEOA', true);

        const proxyFactory = (await ethers.getContractFactory('ProxyForTest')) as ProxyForTest__factory;
        const proxy = await proxyFactory.deploy();
        await expect(proxy.call(job.address, job.interface.encodeFunctionData('work', [strategy.address]))).to.be.reverted;
      });

      it('should not revert if allowed any address and it is not an EOA', async () => {
        keep3r.isBondedKeeper.returns(true);

        const proxyFactory = (await ethers.getContractFactory('ProxyForTest')) as ProxyForTest__factory;
        const proxy = await proxyFactory.deploy();
        await expect(proxy.call(job.address, job.interface.encodeFunctionData('work', [strategy.address]))).not.to.be.reverted;
      });

      it('should not revert if allowed only EOA and it is', async () => {
        keep3r.isBondedKeeper.returns(true);
        await job.setVariable('requiredEOA', true);

        await expect(job.work(strategy.address)).not.to.be.reverted;
      });

      context('when there are no requirement for the keeper', () => {
        beforeEach(async () => {
          await job.setVariable('requiredMinBond', 0);
          await job.setVariable('requiredEarnings', 0);
          await job.setVariable('requiredAge', 0);
        });

        it('should revert if keeper is not registered', async () => {
          keep3r.isKeeper.returns(false);
          await expect(job.connect(keeper).work(strategy.address)).to.be.revertedWith('KeeperNotRegistered()');
        });

        it('should pass if keeper is registered', async () => {
          keep3r.isKeeper.returns(true);
          await expect(job.connect(keeper).work(strategy.address)).not.to.be.reverted;
        });

        it('should call isKeeper with the correct arguments', async () => {
          keep3r.isKeeper.returns(true);
          await job.connect(keeper).work(strategy.address);
          await expect(keep3r.isKeeper).to.be.calledOnceWith(keeper.address);
        });
      });

      context('when there is no specific required bond', () => {
        beforeEach(async () => {
          await job.setVariable('requiredBond', ZERO_ADDRESS);
        });

        it('should revert if keeper does not pass the requirements', async () => {
          keep3r.isMinKeeper.returns(false);
          await expect(job.connect(keeper).work(strategy.address)).to.be.revertedWith('KeeperNotValid()');
        });

        it('should pass if keeper passes the requirements', async () => {
          keep3r.isMinKeeper.returns(true);
          await expect(job.connect(keeper).work(strategy.address)).not.to.be.reverted;
        });

        it('should call isMinKeeper with the correct arguments', async () => {
          keep3r.isMinKeeper.returns(true);
          await job.connect(keeper).work(strategy.address);
          await expect(keep3r.isMinKeeper).to.be.calledOnceWith(keeper.address, requiredMinBond, requiredEarnings, requiredAge);
        });
      });

      context('when there is a specific bond', () => {
        it('should revert if keeper does not pass the requirements', async () => {
          keep3r.isBondedKeeper.returns(false);
          await expect(job.connect(keeper).work(strategy.address)).to.be.revertedWith('KeeperNotValid()');
        });

        it('should pass if keeper passes the requirements', async () => {
          keep3r.isBondedKeeper.returns(true);
          await expect(job.connect(keeper).work(strategy.address)).not.to.be.reverted;
        });

        it('should call isBondedKeeper with the correct arguments', async () => {
          keep3r.isBondedKeeper.returns(true);
          await job.connect(keeper).work(strategy.address);
          await expect(keep3r.isBondedKeeper).to.be.calledOnceWith(keeper.address, requiredBond, requiredMinBond, requiredEarnings, requiredAge);
        });
      });
    });

    context('when the keeper is valid', () => {
      beforeEach(() => {
        keep3r.isBondedKeeper.returns(true);
      });

      it('should revert if the strategy is not workable', async () => {
        await expect(job.work(strategy.address)).to.be.revertedWith('StrategyNotWorkable()');
      });

      context('when the strategy is workable', () => {
        beforeEach(() => {
          strategy.shouldRebalance.returns(true);
        });

        it('should pay the keeper after doing the rebalance', async () => {
          await job.work(strategy.address);
          // TODO: remove any when issue is fixed: https://github.com/defi-wonderland/smock/issues/51
          (expect(keep3r.worked).to.be.calledAfter as any)(strategy.rebalance);
        });

        it('should call worked with the sender address', async () => {
          await job.connect(keeper).work(strategy.address);
          expect(keep3r.worked).to.be.calledOnceWith(keeper.address);
        });
      });
    });
  });

  describe('forceWork', () => {
    let strategy: FakeContract<IStrategy>;

    beforeEach(async () => {
      strategy = await smock.fake<IStrategy>(IStrategyArtifact);
    });

    fnShouldOnlyBeCallableByGovernor(
      () => job,
      'forceWork',
      () => governor,
      () => [strategy.address]
    );

    it('should call strategy rebalance', async () => {
      await job.connect(governor).forceWork(strategy.address);
      expect(strategy.rebalance).to.be.calledOnce;
    });
  });
});
