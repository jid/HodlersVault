const { expect } = require("chai");
const { ethers } = require("ethers");
const testUtils = require("../utils/utils");


describe("HodlersVault contract", function () {
  let hodlersVault;
  let owner, addr1, addr2, addr3;

  beforeEach(async() => {
    const HodlersVault = await hre.ethers.getContractFactory("HodlersVault");
    [owner, addr1, addr2, addr3] = await hre.ethers.getSigners();

    hodlersVault = await HodlersVault.deploy();
  });

  it("Should be owner", async function () {
    expect(await hodlersVault.owner()).to.equal(owner.address);
  });

  describe("function hodl()", function() {
    it("Should throw on creating HODL position with 0 value", async function () {
      await expect(hodlersVault.hodl(owner.address, 365, {value: 0})).to.be.revertedWith("HodlersVault: can't HODL 0 tokens.");
    });

    it("Should throw on creating HODL position for 0x address", async function () {
      await expect(hodlersVault.hodl(hre.ethers.constants.AddressZero, 365, {value: 1})).to.be.revertedWith("HodlersVault: can't HODL for 0x0 address.");
    });

    it("Should create HODL position", async function () {
      let expectedLength = 1;
      await hodlersVault.hodl(owner.address, 365, {value: 39e9});
      const hodlings = await hodlersVault.hodlingOf(owner.address);
      expect(hodlings.length).to.eq(expectedLength, `Invalid HODL positions count: ${hodlings.length}. Expected length: ${expectedLength}`);
    });

    it("Only single HODL position is possible", async function() {
      await hodlersVault.hodl(owner.address, 365, {value: 12e9});
      await expect(hodlersVault.hodl(owner.address, 12, {value: 256e12})).to.be.revertedWith("HodlersVault: only single HODL position is possible.");
    });

  });
});
