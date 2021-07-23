/**
 * @type import('hardhat/config').HardhatUserConfig
 */

require('@nomiclabs/hardhat-waffle');
require('@nomiclabs/hardhat-web3');
require("./tasks/accounts");
require("dotenv").config();

module.exports = {
  solidity: "0.8.4",
};
