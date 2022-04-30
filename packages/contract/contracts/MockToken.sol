// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
    constructor() ERC20("Mock Token", "MCK") {
        _mint(msg.sender, 10**(10 + decimals()));
    }

    function decimals() public view virtual override returns (uint8) {
        return 12;
    }
}
