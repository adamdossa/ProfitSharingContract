const ProfitSharingMock = artifacts.require("./test/ProfitSharingMock.sol");
const MiniMeToken = artifacts.require("./MiniMeToken.sol");
const MiniMeTokenFactory = artifacts.require("MiniMeTokenFactory");
const assertFail = require("./helpers/assertFail");

contract('ProfitSharingMock', function (accounts) {

  console.log("Coinbase Account: ", accounts[0]);
  const ONEETHER  = 1000000000000000000;
  const YEAR = 86400 * 366;
  const gasPrice = 0;

  // =========================================================================
  it("tests profit sharing functionality", async () => {

    //First we setup a MiniMeToken and generate some balances

    var miniMeTokenFactory = await MiniMeTokenFactory.new({from: accounts[0]});
    var miniMeToken = await MiniMeToken.new(miniMeTokenFactory.address, {from: accounts[0]});
    var profitSharing = await ProfitSharingMock.new(miniMeToken.address, {from: accounts[0]});

    //Generate some token balances
    await miniMeToken.generateTokens(accounts[1], 100);
    await miniMeToken.generateTokens(accounts[2], 300);
    await miniMeToken.generateTokens(accounts[4], 400);

    //Make a deposit
    await profitSharing.depositDividend({from: accounts[0], value: ONEETHER});

    //Claim dividend
    var beforeBalanceOne = await web3.eth.getBalance(accounts[1]);
    var beforeBalanceTwo = await web3.eth.getBalance(accounts[2]);
    var txId1 = await profitSharing.claimDividend(0, {from: accounts[1], gasPrice: gasPrice});
    var txId2 = await profitSharing.claimDividend(0, {from: accounts[2], gasPrice: gasPrice});
    var afterBalanceOne = await web3.eth.getBalance(accounts[1]);
    var afterBalanceTwo = await web3.eth.getBalance(accounts[2]);
    var gasCostTxId1 = txId1.receipt.gasUsed * gasPrice;
    var gasCostTxId2 = txId2.receipt.gasUsed * gasPrice;
    assert.equal(beforeBalanceOne.add(0.125 * ONEETHER).sub(gasCostTxId1).toNumber(), afterBalanceOne.toNumber(), "account_1 should claim 0.25 of dividend");
    assert.equal(beforeBalanceTwo.add(0.375 * ONEETHER).sub(gasCostTxId2).toNumber(), afterBalanceTwo.toNumber(), "account_2 should claim 0.75 of dividend");

    //Make sure further claims on this dividend fail
    await assertFail(async () => {
      await profitSharing.claimDividend(0, {from: accounts[1], gasPrice: gasPrice});
    })
    await assertFail(async () => {
      await profitSharing.claimDividend(0, {from: accounts[2], gasPrice: gasPrice});
    })

    //Make sure zero balances give no value
    var beforeBalanceThree = await web3.eth.getBalance(accounts[3]);
    var txId3 = await profitSharing.claimDividend(0, {from: accounts[3], gasPrice: gasPrice});
    var afterBalanceThree = await web3.eth.getBalance(accounts[3]);
    var gasCostTxId3 = txId3.receipt.gasUsed * gasPrice;
    assert.equal(beforeBalanceThree.sub(gasCostTxId1).toNumber(), afterBalanceThree.toNumber(), "account_3 should have no claim");

    //Add a new token balance for account 3
    await miniMeToken.generateTokens(accounts[3], 800);

    //Recycle remainder of dividend 0
    await profitSharing.setMockedNow(YEAR);
    await profitSharing.recycleDividend(0, {from: accounts[0]});

    //Check everyone can clain recycled dividend
    beforeBalanceOne = await web3.eth.getBalance(accounts[1]);
    beforeBalanceTwo = await web3.eth.getBalance(accounts[2]);
    beforeBalanceThree = await web3.eth.getBalance(accounts[3]);
    var beforeBalanceFour = await web3.eth.getBalance(accounts[4]);

    txId1 = await profitSharing.claimDividendAll({from: accounts[1], gasPrice: gasPrice});
    txId2 = await profitSharing.claimDividendAll({from: accounts[2], gasPrice: gasPrice});
    txId3 = await profitSharing.claimDividendAll({from: accounts[3], gasPrice: gasPrice});
    var txId4 = await profitSharing.claimDividendAll({from: accounts[4], gasPrice: gasPrice});

    afterBalanceOne = await web3.eth.getBalance(accounts[1]);
    afterBalanceTwo = await web3.eth.getBalance(accounts[2]);
    afterBalanceThree = await web3.eth.getBalance(accounts[3]);
    var afterBalanceFour = await web3.eth.getBalance(accounts[4]);

    gasCostTxId1 = txId1.receipt.gasUsed * gasPrice;
    gasCostTxId2 = txId2.receipt.gasUsed * gasPrice;
    gasCostTxId3 = txId3.receipt.gasUsed * gasPrice;
    var gasCostTxId4 = txId3.receipt.gasUsed * gasPrice;

    //Balances for recycled dividend 1 are 100, 300, 800, 400, total = 16, recycled dividend is 0.5 ETH
    assert.equal(beforeBalanceOne.add((100 / 1600) * (ONEETHER / 2)).sub(gasCostTxId1).toNumber(), afterBalanceOne.toNumber(), "account_1 should claim dividend");
    assert.equal(beforeBalanceTwo.add((300 / 1600) * (ONEETHER / 2)).sub(gasCostTxId2).toNumber(), afterBalanceTwo.toNumber(), "account_2 should claim dividend");
    assert.equal(beforeBalanceThree.add((800 / 1600) * (ONEETHER / 2)).sub(gasCostTxId2).toNumber(), afterBalanceThree.toNumber(), "account_2 should claim dividend");
    assert.equal(beforeBalanceFour.add((400 / 1600) * (ONEETHER / 2)).sub(gasCostTxId2).toNumber(), afterBalanceFour.toNumber(), "account_2 should claim dividend");

  });

});
