# Keep3r Alpha Job

Rebalance Charm strategies whenever needed.

### AlphaJob address

Mainnet: https://etherscan.io/address/0xf1e138915ed8cf5b073fa5bd87cf6db39f549650#code

### How to work it

> :warning: Use `callStatic` for all methods (even `work`) to avoid spending gas.<br>
> Only send `work` transaction if `callStatic.work` succeeded,
> even if workable is true, the job might not have credits to pay or the rebalance will fail and the work tx will revert

```javascript
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const workableStrategy = await AlphaJob.callStatic.workable();
if (workableStrategy !== ZERO_ADDRESS) {
  await AlphaJob.callStatic.work(workableStrategy);
  console.log(`Worked strategy: ${workableStrategy}`);
}
```
