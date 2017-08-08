var ProfitSharing = artifacts.require("./ProfitSharing.sol");

module.exports = function(deployer) {
  deployer.deploy(ProfitSharing, "0x87B9Ed2Aa19a2871a1D7e8050c9368970C57e0D8");
};
