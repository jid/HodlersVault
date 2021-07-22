const { expect } = require("chai");
const { ethers } = require("ethers");
const testUtils = require("../utils/utils");
const BigNumber = require('bignumber.js');


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
    it("Should throw on creating HODL position with 0 value", async function () {
      await expect(hodlersVault.hodl(addr1.address, 365, {value: 0})).to.be.revertedWith("HodlersVault: can't HODL 0 tokens.");
    });

    it("Should throw on creating HODL position for 0x address", async function () {
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

    xit("Should emit SetHodlPosition event", async function() {
      let ethValue = ethers.utils.parseEther("0.003");
      let releaseTime = (await hre.ethers.getDefaultProvider().getBlock()).timestamp + 365 * 3600;
      await expect(hodlersVault.hodl(addr1.address, 365, {value: ethValue}))
      .to.emit(hodlersVault, 'SetHodlPosition')
      .withArgs(addr1.address, ethValue, releaseTime);
    });
  });

  describe("function withdrawHodlingFor()", function() {

  });

  describe("function liquidateHodlingFor()", function() {
    it("Should revert when caller is not contract owner", async function(){
      await hodlersVault.hodl(addr1.address, 365, {value: 12e9});
      await expect(hodlersVault.connect(addr2).liquidateHodlingFor(addr1.address, 0)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should liquidate HODL position when caller is contract owner", async function(){
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

      // 1. Create Mock contract with selfdesctruct functionality, set backup address to hodlersVault.address and send some ETH
      const MockSelfdestruct = await hre.ethers.getContractFactory("MockSelfdestruct");
      mockSelfdestruct = await MockSelfdestruct.deploy(hodlersVaultAddress, {value: ethValue});
      mockSelfdestructAddress = mockSelfdestruct.address;
      let mockBalance = await provider.getBalance(mockSelfdestructAddress);

      expect(mockBalance).to.eq(ethValue,"Balance of the MockSelfdestruct contract should be > 0.");
      
      // 2. Selfdestruct Mock contract, with backup address set to hodlersVaultAddress.
      await mockSelfdestruct.destroy();
      let hodlersVaultBalance = await provider.getBalance(hodlersVaultAddress);
      expect(hodlersVaultBalance).to.eq(ethValue,`Balance of the hodlersVault contract should be equal to ${ethValueReadable}.`);

      // 3. Withdraw funds from hodlersVault.
      await hodlersVault.withdraw();
      hodlersVaultBalance = await provider.getBalance(hodlersVaultAddress);
      expect(hodlersVaultBalance).to.eq(0,"Balance of the hodlersVault contract should be 0.");
    });
    xit("Should revert on contract funds withdraw when caller is not contract owner", async function(){
      
    });
  });

  describe("function receive()", function() {
    xit("Should revert", async function(){
      
    });
  });

  describe("function fallback()", function() {
    xit("Should revert", async function(){

    });
  });
});
