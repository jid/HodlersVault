// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

contract MockSelfdestruct {
    address payable private backup;
    
    constructor(address payable _backup) payable {
        backup = _backup;
    }

    function destroy() external {
        selfdestruct(backup);
    }
}