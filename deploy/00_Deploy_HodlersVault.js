let { networkConfig } = require('../helper-hardhat-config');

module.exports = async ({
    getNamedAccounts,
    deployments,
    getChainId
}) => {

    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = await getChainId();
    log("----------------------------------------------------");
    const hodlersVault = await deploy('HodlersVault', {
        from: deployer,
        args: [],
        log: true
    });
    log(`HodlersVault deployed, address: ${hodlersVault.address}.`);
    // log("Run HodlersVault  Feed contract with command:")
    // log("npx hardhat do-some-task --contract " + hodlersVault.address + " --network " + networkConfig[chainId]['name'])
    log("----------------------------------------------------")

}

module.exports.tags = ['all', 'main']
