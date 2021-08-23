import { Provider } from '@ethersproject/providers';
import { expect } from 'chai';
import { Contract, Signer } from 'ethers';
import { wallet } from '.';

export type Impersonator = Signer | Provider | string;

export const fnShouldOnlyBeCallableByGovernor = createOnlyCallableCheck('governor', 'OnlyGovernor()');
export const fnShouldOnlyBeCallableByPendingGovernor = createOnlyCallableCheck('pending governor', 'OnlyPendingGovernor()');

export function createOnlyCallableCheck(allowedLabel: string, error: string) {
  return (
    delayedContract: () => Contract,
    fnName: string,
    allowedWallet: Impersonator | (() => Impersonator),
    args: unknown[] | (() => unknown[])
  ) => {
    it(`should be callable by ${allowedLabel}`, async () => {
      const impersonator: Impersonator = typeof allowedWallet === 'function' ? allowedWallet() : allowedWallet;
      return expect(callFunction(impersonator)).not.to.be.revertedWith(error);
    });

    it('should not be callable by any address', async () => {
      return expect(callFunction(await wallet.generateRandom())).to.be.revertedWith(error);
    });

    function callFunction(impersonator: Impersonator) {
      const argsArray: unknown[] = typeof args === 'function' ? args() : args;
      const fn = delayedContract().connect(impersonator)[fnName] as (...args: unknown[]) => unknown;
      return fn(...argsArray, { gasPrice: 0 });
    }
  };
}
