// SPDX-License-Identifier: UNLICENSE
pragma solidity ^0.8.9;

import "./IWETH.sol";
import "./IWormhole.sol";

contract TokenBridge {
    
    function isDeployed() external view returns (bool){
        return true;
    }

}