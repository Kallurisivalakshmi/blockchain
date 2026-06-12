// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title SecurityUtils
 * @dev Library for security-related utilities
 */
library SecurityUtils {
    
    /**
     * @dev Create a data ID with prefix and counter
     * @param prefix Prefix for the ID
     * @param counter Counter value
     * @return dataId Generated data ID
     */
    function createDataId(string memory prefix, uint256 counter) internal pure returns (string memory) {
        return string(abi.encodePacked(prefix, "-", uint2str(counter)));
    }
    
    /**
     * @dev Convert uint256 to string
     * @param value Value to convert
     * @return str String representation
     */
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
    
    /**
     * @dev Hash data with multiple salt values
     * @param data Data to hash
     * @param salt1 First salt value
     * @param salt2 Second salt value
     * @return hash Resulting hash
     */
    function hashWithSalts(
        string memory data,
        uint256 salt1,
        uint256 salt2
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(data, salt1, salt2));
    }
    
    /**
     * @dev Verify if data matches expected hash
     * @param data Data to verify
     * @param expectedHash Expected hash
     * @return isValid Whether data matches hash
     */
    function verifyHash(string memory data, bytes32 expectedHash) internal pure returns (bool) {
        return keccak256(bytes(data)) == expectedHash;
    }
}