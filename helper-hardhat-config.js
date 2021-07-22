const networkConfig = {
    default: {
        name: 'hardhat'
    },
    31337: {
        name: 'localhost'
    },
    42: {
        name: 'kovan'
    },
    4: {
        name: 'rinkeby'
    },
    1: {
        name: 'mainnet'
    },
    5: {
        name: 'goerli'
    }
}

const developmentChains = ["hardhat", "localhost"];

const getNetworkIdFromName = async (networkIdName) => {
    for (const id in networkConfig) {
        if (networkConfig[id]['name'] == networkIdName) {
            return id;
        }
    }
    return null;
}

module.exports = {
    networkConfig,
    getNetworkIdFromName,
    developmentChains
}
