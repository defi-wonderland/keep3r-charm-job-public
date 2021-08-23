import { AlphaJob__factory, IKeep3rV1, IPassiveStrategy } from '@typechained';
import { toUnit } from '@utils/bn';
import { ZERO_ADDRESS } from '@utils/constants';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { contracts, evm, wallet } from '../utils';

const ADDRESS = {
  KEEP3R_V1: '0x1ceb5cb57c4d4e2b2433641b95dd330a33185a44',
  PASSIVE_STRATEGY: '0x4e03028626aa5e5d5e4CFeF2970231b0D6c5d5Ed',
  PASSIVE_STRATEGY_GOVERNOR: '0x9f2aa07f5d8f63fbdcf2f20bc0dd462816c337db',
  KEEPER: '0xf4dc7e5b00a39897736c7f560d55cba82c72a721',
};

const BLOCK = {
  PASSIVE_STRATEGY_WORKABLE: 12964037,
  PASSIVE_STRATEGY_NOT_WORKABLE: 12964039,
};

describe('@skip-on-coverage AlphaJob', () => {
  it('should be able to work when any strategy is workable', async () => {
    const { alphaJob, alphaJobGovernor, keep3r, keeper, passiveStrategy } = await resetAndSetup(BLOCK.PASSIVE_STRATEGY_WORKABLE);

    // add strategy to alpha job
    await alphaJob.connect(alphaJobGovernor).addStrategy(ADDRESS.PASSIVE_STRATEGY);

    // passive strategy should be workable
    expect(await alphaJob.connect(keeper).callStatic['workable(address)'](passiveStrategy.address)).to.be.true;

    // work
    const kp3rBondsBeforeWork = await keep3r.bonds(keeper._address, keep3r.address);
    await alphaJob.connect(keeper).work(passiveStrategy.address);
    const kp3rBondsAfterWork = await keep3r.bonds(keeper._address, keep3r.address);

    // keeper should have earned bonded KP3R
    expect(kp3rBondsAfterWork).to.be.gt(kp3rBondsBeforeWork);

    // passive strategy should not be workable anymore
    expect(await passiveStrategy.connect(keeper).shouldRebalance()).to.be.false;
    expect(await alphaJob.connect(keeper).callStatic['workable(address)'](passiveStrategy.address)).to.equal(false);
  });

  it('governor should be able to force work in a strategy when contract is paused', async () => {
    const { alphaJob, alphaJobGovernor, keep3r, keeper, passiveStrategy } = await resetAndSetup(BLOCK.PASSIVE_STRATEGY_WORKABLE);

    // add strategy to alpha job
    await alphaJob.connect(alphaJobGovernor).addStrategy(ADDRESS.PASSIVE_STRATEGY);

    // passive strategy should be workable
    expect(await alphaJob.connect(keeper).callStatic['workable(address)'](passiveStrategy.address)).to.be.true;

    // pause contract
    await alphaJob.connect(alphaJobGovernor).pause(true);

    // force work
    const kp3rBondsBeforeWork = await keep3r.bonds(keeper._address, keep3r.address);
    await alphaJob.connect(alphaJobGovernor).forceWork(passiveStrategy.address);
    const kp3rBondsAfterWork = await keep3r.bonds(keeper._address, keep3r.address);

    // keeper should not have earned bonded KP3R
    expect(kp3rBondsAfterWork).to.equal(kp3rBondsBeforeWork);

    // passive strategy should not be workable anymore
    expect(await passiveStrategy.connect(keeper).shouldRebalance()).to.be.false;
    expect(await alphaJob.connect(keeper).callStatic['workable(address)'](passiveStrategy.address)).to.equal(false);
  });

  it('governor should be able to force work in a strategy that is not workable', async () => {
    const { alphaJob, alphaJobGovernor, keep3r, keeper, passiveStrategy } = await resetAndSetup(BLOCK.PASSIVE_STRATEGY_NOT_WORKABLE);

    // add strategy to alpha job
    await alphaJob.connect(alphaJobGovernor).addStrategy(ADDRESS.PASSIVE_STRATEGY);

    // passive strategy should not be workable
    expect(await alphaJob.connect(keeper).callStatic['workable(address)'](passiveStrategy.address)).to.be.false;

    // force work
    await expect(alphaJob.connect(alphaJobGovernor).forceWork(passiveStrategy.address)).to.be.revertedWith('cannot rebalance');
  });
});

async function resetAndSetup(blockNumber: number) {
  const [, alphaJobGovernor] = await ethers.getSigners();

  await evm.reset({
    jsonRpcUrl: process.env.MAINNET_HTTPS_URL,
    blockNumber: blockNumber,
  });

  const keep3r = (await ethers.getContractAt('IKeep3rV1', ADDRESS.KEEP3R_V1)) as IKeep3rV1;
  const keep3rGovernor = await wallet.impersonate(await keep3r.callStatic.governance());
  const passiveStrategy = (await ethers.getContractAt('IPassiveStrategy', ADDRESS.PASSIVE_STRATEGY)) as IPassiveStrategy;

  const alphaJobFactory = (await ethers.getContractFactory('AlphaJob')) as AlphaJob__factory;
  const alphaJob = await alphaJobFactory.deploy(alphaJobGovernor.address, keep3r.address, ZERO_ADDRESS, 0, 0, 0, false);

  const keeper = await wallet.impersonate(ADDRESS.KEEPER);
  const passiveStrategyGovernor = await wallet.impersonate(ADDRESS.PASSIVE_STRATEGY_GOVERNOR);

  // give some ETH to keep3r governor
  await contracts.setBalance(keep3rGovernor._address, toUnit(10));

  // register alpha job as job
  await keep3r.connect(keep3rGovernor).addJob(alphaJob.address);

  // register alpha job some liquidity tokens
  await keep3r.connect(keep3rGovernor).addKPRCredit(alphaJob.address, toUnit(10));

  // change alphaJob to be passiveStrategy keeper
  await passiveStrategy.connect(passiveStrategyGovernor).setKeeper(alphaJob.address);

  return { alphaJob, alphaJobGovernor, keep3r, keeper, passiveStrategy };
}
