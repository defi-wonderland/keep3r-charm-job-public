import { ZERO_ADDRESS } from '@utils/constants';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

const deployFunction: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const governor = '0xbc0e61Daef021f9abBf73e88a2334670d8d1E4A8';

  console.info(`Deployer: ${deployer}`);
  console.info(`Governor: ${governor}`);

  const args = [
    governor, // governor
    '0x1ceb5cb57c4d4e2b2433641b95dd330a33185a44', // keep3r v1
    ZERO_ADDRESS, // requiredBond
    0, // requiredMinBond
    0, // requiredEarnings
    0, // requiredAge
    true, // requiredEOA
  ];

  const alphaJob = await hre.deployments.deploy('AlphaJob', {
    contract: 'AlphaJob',
    from: deployer,
    args,
    log: true,
  });

  console.info(`Execute: npx hardhat verify --network NETWORK ${alphaJob.address} ${args.join(' ')}`);
};

deployFunction.tags = ['AlphaJob'];

export default deployFunction;
