const { expect } = require("chai");
const { ethers } = require("ethers");
const BigNumber = require('bignumber.js');
const { time } = require('@openzeppelin/test-helpers');

describe("HodlersVault contract", function () {
  let hodlersVault;
  let owner, addr1, addr2, addr3;
  let hodlersVaultAddress;
  let provider;

  beforeEach(async() => {
    const HodlersVault = await hre.ethers.getContractFactory("HodlersVault");
    [owner, addr1, addr2, addr3] = await hre.ethers.getSigners();

    hodlersVault = await HodlersVault.deploy();
    hodlersVaultAddress = hodlersVault.address;

    provider = hre.ethers.provider;
  });


  it("Should be owner", async function () {
    expect(await hodlersVault.owner()).to.equal(owner.address);
  });


  describe("function hodl()", function() {

    it("Should revert on creating HODL position with 0 value", async function () {
      await expect(hodlersVault.hodl(addr1.address, 365, {value: 0})).to.be.revertedWith("HodlersVault: can't HODL 0 tokens.");
    });

    it("Should revert on creating HODL position for 0x address", async function () {
      await expect(hodlersVault.hodl(ethers.constants.AddressZero, 365, {value: ethers.utils.parseEther("0.001")})).to.be.revertedWith("HodlersVault: can't HODL for 0x0 address.");
    });

    it("Should create HODL position", async function () {
      let expectedLength = 1;
      await hodlersVault.hodl(addr1.address, 365, {value: ethers.utils.parseEther("0.001")});
      const hodlings = await hodlersVault.hodlingOf(addr1.address);
      expect(hodlings.length).to.eq(expectedLength, `Invalid HODL positions count: ${hodlings.length}. Expected length: ${expectedLength}`);
    });

    it("Only single HODL position is possible", async function() {
      await hodlersVault.hodl(addr1.address, 365, {value: 12e9});
      await expect(hodlersVault.hodl(addr1.address, 12, {value: 256e12})).to.be.revertedWith("HodlersVault: only single HODL position is possible.");
    });

    it("Should emit SetHodlPosition event", async function() {
      let ethValue = ethers.utils.parseEther("0.003");
      let nextBlockTimestamp = BigNumber.sum(await time.latest(), time.duration.days(10)).toNumber();
      let releaseTime =  BigNumber.sum(nextBlockTimestamp, time.duration.days(160)).toNumber();
      
      // Set timestamp for next block
      await provider.send("evm_setNextBlockTimestamp", [nextBlockTimestamp]);

      await expect(hodlersVault.hodl(addr1.address, 160, {value: ethValue}))
      .to.emit(hodlersVault, 'SetHodlPosition')
      .withArgs(addr1.address, ethValue, releaseTime);
    });

  });


  describe("function withdrawHodlingFor()", function() {

    it("Should revert on withdrawing HODL position on acount of someone else", async function(){
      expect(hodlersVault.withdrawHodlingFor(addr1.address, 0)).to.be.revertedWith("HodlersVault: Only owner of funds can withdraw them.");
    });

    it("Should revert on withdrawing HODL position before its release time", async function(){
      await hodlersVault.hodl(addr1.address, 7, {value: ethers.utils.parseEther("0.003")});
      await time.increase(time.duration.days(6));
      expect(hodlersVault.connect(addr1).withdrawHodlingFor(addr1.address, 0)).to.be.revertedWith("HodlersVault: Can't withdraw before release time.");
    });

    it("Should 'zero' HODL position after successful withdrawal", async function(){
      let ethValue = ethers.utils.parseEther("0.081");
      await hodlersVault.hodl(addr2.address, 236, {value: ethValue});
      expect((await hodlersVault.hodlingOf(addr2.address))[0][0]).to.eq(ethValue, "Invalid HODL position returned.");

      await time.increase(time.duration.days(400));
      await hodlersVault.connect(addr2).withdrawHodlingFor(addr2.address, 0);
      expect((await hodlersVault.hodlingOf(addr2.address))[0][0]).to.eq(0, "HODL position should be 0.");
    });

    it("Should emit WithdrawHodlPosition event after successful withdrawal", async function(){
      let ethValue = ethers.utils.parseEther("0.081");
      await hodlersVault.hodl(addr2.address, 236, {value: ethValue});
      expect((await hodlersVault.hodlingOf(addr2.address))[0][0]).to.eq(ethValue, "Invalid HODL position returned.");

      // Set timestamp for next block
      let nextBlockTimestamp = BigNumber.sum(await time.latest(), time.duration.days(341)).toNumber();
      await provider.send("evm_setNextBlockTimestamp", [nextBlockTimestamp]);

      expect(await hodlersVault.connect(addr2).withdrawHodlingFor(addr2.address, 0))
      .to.emit(hodlersVault, 'WithdrawHodlPosition')
      .withArgs(addr2.address, ethValue, nextBlockTimestamp);
    });

  });


  describe("function liquidateHodlingFor()", function() {

    it("Should revert when caller is not contract owner", async function(){
      await hodlersVault.hodl(addr1.address, 365, {value: 12e9});
      await expect(hodlersVault.connect(addr2).liquidateHodlingFor(addr1.address, 0)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should liquidate any HODL position when caller is contract owner", async function(){
      let ethValue = ethers.utils.parseEther("0.000345");
      await hodlersVault.hodl(addr1.address, 365, {value: ethValue});
      expect((await hodlersVault.hodlingOf(addr1.address))[0][0]).to.eq(ethValue, "Invalid HODL position returned.");

      await hodlersVault.liquidateHodlingFor(addr1.address, 0);
      let hodlings = await hodlersVault.hodlingOf(addr1.address);
      const hodlValue = hodlings[0][0];

      expect(hodlValue).to.eq(0, `HODL position not liquidated, value: ${hodlValue}.`);
    });

  });


  describe("function withdraw()", function() {

    it("Should withdraw contract funds when caller is contract owner", async function(){
      let ethValueReadable = "0.943";
      let ethValue = ethers.utils.parseEther(ethValueReadable);

      // 1. Create Mock contract with selfdesctruct functionality, set backup address to hodlersVault.address and send some ETH.
      const MockSelfdestruct = await hre.ethers.getContractFactory("MockSelfdestruct");
      mockSelfdestruct = await MockSelfdestruct.deploy(hodlersVaultAddress, {value: ethValue});
      mockSelfdestructAddress = mockSelfdestruct.address;
      let mockBalance = await provider.getBalance(mockSelfdestructAddress);

      expect(mockBalance).to.eq(ethValue,"Balance of the MockSelfdestruct contract should be > 0.");
      
      // 2. Selfdestruct Mock contract, with.
      await mockSelfdestruct.destroy();
      let hodlersVaultBalance = await provider.getBalance(hodlersVaultAddress);
      expect(hodlersVaultBalance).to.eq(ethValue,`Balance of the hodlersVault contract should be equal to ${ethValueReadable}.`);

      // 3. Withdraw funds from hodlersVault.
      await hodlersVault.withdraw();
      hodlersVaultBalance = await provider.getBalance(hodlersVaultAddress);
      expect(hodlersVaultBalance).to.eq(0,"Balance of the hodlersVault contract should be 0.");
    });

    it("Should revert on contract funds withdraw when caller is not contract owner", async function(){
      expect(hodlersVault.connect(addr3).withdraw()).to.be.revertedWith("Ownable: caller is not the owner");
    });

  });


  describe("function receive()", function() {

    it("Should revert", async function(){
      let ethValueReadable = "0.0127";
      let ethValue = ethers.utils.parseEther(ethValueReadable);
      let tx = {
          to: hodlersVaultAddress,
          value: ethValue
      };
      expect(addr1.sendTransaction(tx)).to.be.revertedWith("HodlersVault: contract doesn't accept Ether.");
    });

  });


  describe("function fallback()", function() {

    it("Should revert", async function(){
      let ethValueReadable = "0.0127";
      let ethValue = ethers.utils.parseEther(ethValueReadable);
      let tx = {
          to: hodlersVaultAddress,
          value: ethValue,
          data: "0xa1b2c3d4"
      };
      expect(addr1.sendTransaction(tx)).to.be.revertedWith("HodlersVault: contract doesn't accept Ether or invalid API call.");
    });

  });

});
