// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title StringUtils
 * @dev Library for string manipulation utilities
 */
library StringUtils {
    function concat(string memory a, string memory b) internal pure returns (string memory) {
        bytes memory aBytes = bytes(a);
        bytes memory bBytes = bytes(b);
        bytes memory result = new bytes(aBytes.length + bBytes.length);
        uint256 i;
        for (i = 0; i < aBytes.length; i++) {
            result[i] = aBytes[i];
        }
        for (i = 0; i < bBytes.length; i++) {
            result[aBytes.length + i] = bBytes[i];
        }
        return string(result);
    }
    
    function uint2str(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 j = value;
        uint256 length;
        while (j != 0) {
            length++;
            j /= 10;
        }
        bytes memory buffer = new bytes(length);
        while (value != 0) {
            length--;
            buffer[length] = bytes1(uint8(48 + value % 10));
            value /= 10;
        }
        return string(buffer);
    }
    
    function isEmpty(string memory str) internal pure returns (bool) {
        return bytes(str).length == 0;
    }
}