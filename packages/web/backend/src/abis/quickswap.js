const QUICK_ROUTER = '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff'
const QUICK_ROUTER_ABI = [
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

module.exports = {QUICK_ROUTER, QUICK_ROUTER_ABI};
