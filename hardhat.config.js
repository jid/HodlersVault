/**
 * @type import('hardhat/config').HardhatUserConfig
 */

require('@nomiclabs/hardhat-waffle');
require("./tasks/accounts");
require("dotenv").config();

module.exports = {
  solidity: "0.8.4",
};
