const SHUSHI_ROUTER = '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
const SHUSHI_WMATIC = '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270'
const SHUSHI_ROUTER_ABI = [
    {
        "inputs":[
            {"internalType":"uint256","name":"amountIn","type":"uint256"},
            {"internalType":"address[]","name":"path","type":"address[]"}
        ],
        "name":"getAmountsOut",
        "outputs":[
            {"internalType":"uint256[]","name":"amounts","type":"uint256[]"}
        ],
        "stateMutability":"view",
        "type":"function"
    }
];

module.exports = {SHUSHI_ROUTER, SHUSHI_ROUTER_ABI, SHUSHI_WMATIC}
