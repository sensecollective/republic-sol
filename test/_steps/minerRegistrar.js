
const utils = require("../test_utils");
const { accounts, indexMap } = require("../accounts");
var config = require("../../republic-config");

// Initialise:
let ren, minerRegistrar;
(async () => {
  ren = await artifacts.require("RepublicToken").deployed();
  minerRegistrar = await artifacts.require("MinerRegistrar").deployed();
})();


const steps = {

  WaitForEpoch: async () => {
    while (true) {
      // Must be an on-chain call, or the time won't be updated
      const tx = await utils.logTx('Checking epoch', minerRegistrar.checkEpoch());
      // If epoch happened, return
      if (tx.logs.length > 0 && tx.logs[tx.logs.length - 1].event === "Epoch") { return; }

      await utils.sleep(config.epochInterval * 0.1);
    }
  },

  GetMinerCount: async () => {
    return await minerRegistrar.getMinerCount.call();
  },

  GetRegisteredMiners: async () => {
    return (await minerRegistrar.getCurrentMiners());
  },

  GetAllMiners: async () => {
    return (await minerRegistrar.getAllMiners());
  },

  GetRegisteredAccountIndexes: async () => {
    const miners = await steps.GetRegisteredMiners();
    return miners.map(miner => indexMap[miner]);
  },


  /** MINER SPECIFIC FUNCTIONS */

  /** Register */
  RegisterMiner: async (account, bond) => {
    const difference = bond - (await minerRegistrar.getBondPendingWithdrawal(account.republic));
    if (difference) {
      await ren.approve(minerRegistrar.address, difference, { from: account.address });
    }
    const tx = await utils.logTx('Registering', minerRegistrar.register(account.public, { from: account.address }));

    // Verify event
    // utils.assertEventsEqual(tx.logs[tx.logs.length - 1],
    //   { event: 'MinerRegistered', minerId: account.republic, bond: bond });
  },

  /** Deregister */
  DeregisterMiner: async (account) => {
    const tx = await utils.logTx('Deregistering', minerRegistrar.deregister(account.republic, { from: account.address }));
    // Verify event
    // const log = tx.logs[0];
    // assert(log.event == 'MinerDeregistered');
    // assert(log.args["minerId"] == account.republic);
  },

  /** GetBond */
  GetMinerBond: async (account) => {
    // TODO: CHange to call
    return await minerRegistrar.getBond(account.republic, { from: account.address });
  },

  GetAllMiners: async () => {
    return await minerRegistrar.getAllMiners.call();
  },

  /** getMNetworkSize */
  GetMNetworkSize: async () => {
    return await minerRegistrar.getMNetworkSize.call();
  },

  /*** Expected Pool Count ***/
  ExpectedPoolCount: (count) => {
    return Math.ceil(Math.log2(count)) - 1;
  },

  /** GetRenBalance */
  GetRenBalance: async (account) => {
    return await ren.balanceOf(account.address, { from: account.address });
  },

  // AssertPoolDistributions

  /** ApproveRenToMinerRegistrar */
  ApproveRenToMinerRegistrar: async (amount, account) => {
    ren.approve(minerRegistrar.address, amount, { from: account.address });
  },

  /** UpdateBond */
  UpdateMinerBond: async (account, newBond) => {
    tx = await utils.logTx('Updating bond', minerRegistrar.updateBond(account.republic, newBond, { from: account.address }));

    // Verify event
    // utils.assertEventsEqual(tx.logs[0],
    //   { event: 'MinerBondUpdated', minerId: account.republic, newBond: newBond });
  },

  WithdrawMinerBond: async (account) => {
    return await utils.logTx('Releasing bond', minerRegistrar.withdrawBond(account.republic, { from: account.address }));
  },

  /** GetPublicKey */
  GetMinerPublicKey: async (republicAddr) => {
    return await minerRegistrar.getPublicKey(republicAddr);
  },



  /** FUNCTIONS FOR ALL ACCOUNTS */

  WithdrawAllMinerBonds: async (accounts) => {
    await Promise.all(accounts.map(async account => {
      await steps.WithdrawMinerBond(account);
    }));
  },

  /** Register all accounts */
  RegisterAllMiners: async (accounts, bond) => {
    await Promise.all(accounts.map(async account => {
      await steps.RegisterMiner(account, bond);
    }));
  },

  /** Deregister all accounts */
  DeregisterAllMiners: async (accounts) => {
    await Promise.all(accounts.map(async account => {
      await steps.DeregisterMiner(account);
    }));
  },

}

module.exports = steps;