// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IDataStorage.sol";
import "../interfaces/IAccessControl.sol";

/**
 * @title DataStorage
 * @dev Main contract for secure data storage using IPFS
 * @notice Manages encrypted data storage with on-chain hashes and metadata
 */
contract DataStorage is IDataStorage {
    
    // Mapping from dataId to DataReference
    mapping(string => DataReference) private dataReferences;
    
    // Mapping from dataId to DataMetadata
    mapping(string => DataMetadata) private dataMetadata;
    
    // Mapping from guestId to array of dataIds
    mapping(string => string[]) private guestData;
    
    // Mapping from (guestId, dataType) to array of dataIds
    mapping(string => mapping(uint8 => string[])) private guestDataByType;
    
    // Access control contract reference
    IAccessControl public accessControl;
    
    // Event counters
    uint256 private dataCounter;
    
    // Default retention period (30 days)
    uint256 public defaultRetentionPeriod = 30 days;
    
    // Modifiers
    modifier onlyAuthorized() {
        require(
            accessControl.hasRole(msg.sender, IAccessControl.Role.HotelStaff) ||
            accessControl.hasRole(msg.sender, IAccessControl.Role.HotelManager) ||
            accessControl.hasRole(msg.sender, IAccessControl.Role.PoliceOfficer) ||
            accessControl.hasRole(msg.sender, IAccessControl.Role.PoliceAdmin) ||
            accessControl.hasRole(msg.sender, IAccessControl.Role.SystemAdmin),
            "Only authorized personnel can perform this action"
        );
        _;
    }
    
    /**
     * @dev Constructor to initialize the contract
     * @param _accessControl Address of the AccessControl contract
     */
    constructor(address _accessControl) {
        accessControl = IAccessControl(_accessControl);
    }
    
    /**
     * @dev Set the access control contract address
     * @param _accessControl Address of the AccessControl contract
     */
    function setAccessControl(address _accessControl) external {
        require(
            msg.sender == address(accessControl) ||
            accessControl.hasRole(msg.sender, IAccessControl.Role.SystemAdmin),
            "Only system admin can set access control"
        );
        accessControl = IAccessControl(_accessControl);
    }
    
    /**
     * @dev Store data reference with IPFS hash
     * @param guestId Guest ID this data belongs to
     * @param dataType Type of data being stored
     * @param ipfsHash IPFS hash of the encrypted data
     * @param size Size of the data in bytes
     * @param encryptionAlgorithm Encryption algorithm used
     * @param encryptionKeyHash Hash of the encryption key
     * @param retentionPeriod How long data should be retained (seconds)
     * @return dataId Unique data identifier
     */
    function storeData(
        string memory guestId,
        DataType dataType,
        string memory ipfsHash,
        uint256 size,
        string memory encryptionAlgorithm,
        string memory encryptionKeyHash,
        uint256 retentionPeriod
    ) external override onlyAuthorized returns (string memory dataId) {
        require(bytes(guestId).length > 0, "Guest ID cannot be empty");
        require(bytes(ipfsHash).length > 0, "IPFS hash cannot be empty");
        require(size > 0, "Data size must be positive");
        require(bytes(encryptionAlgorithm).length > 0, "Encryption algorithm cannot be empty");
        
        // Generate unique data ID
        dataCounter++;
        dataId = _generateDataId(dataCounter);
        
        // Set retention period
        if (retentionPeriod == 0) {
            retentionPeriod = defaultRetentionPeriod;
        }
        
        uint256 expiryTimestamp = block.timestamp + retentionPeriod;
        
        // Store data reference
        dataReferences[dataId] = DataReference({
            ipfsHash: ipfsHash,
            dataType: dataType,
            uploadTimestamp: block.timestamp,
            uploadedBy: msg.sender,
            size: size,
            encryptionAlgorithm: encryptionAlgorithm,
            encryptionKeyHash: encryptionKeyHash
        });
        
        // Store metadata
        dataMetadata[dataId] = DataMetadata({
            dataId: dataId,
            guestId: guestId,
            dataType: dataType,
            isActive: true,
            retentionPeriod: retentionPeriod,
            expiryTimestamp: expiryTimestamp
        });
        
        // Add to guest data mappings
        guestData[guestId].push(dataId);
        guestDataByType[guestId][uint8(dataType)].push(dataId);
        
        emit DataStored(dataId, guestId, uint8(dataType), ipfsHash);
        
        return dataId;
    }
    
    /**
     * @dev Retrieve data reference information
     * @param dataId Unique data identifier
     * @return dataRef DataReference struct
     * @return metadata DataMetadata struct
     */
    function getDataReference(
        string memory dataId
    ) external view override returns (
        DataReference memory dataRef,
        DataMetadata memory metadata
    ) {
        require(dataExists(dataId), "Data does not exist");
        return (dataReferences[dataId], dataMetadata[dataId]);
    }
    
    /**
     * @dev Get all data references for a specific guest
     * @param guestId Guest ID to query
     * @return dataIds Array of data identifiers
     */
    function getGuestDataReferences(
        string memory guestId
    ) external view override returns (string[] memory dataIds) {
        return guestData[guestId];
    }
    
    /**
     * @dev Get data references by type for a guest
     * @param guestId Guest ID to query
     * @param dataType Type of data to filter by
     * @return dataIds Array of data identifiers matching criteria
     */
 function getGuestDataByType(
    string memory guestId,
    DataType dataType
) external view override returns (string[] memory) {
    return guestDataByType[guestId][uint8(dataType)];
}
    
    /**
     * @dev Delete data reference and mark for cleanup
     * @param dataId Unique data identifier
     * @return success Whether deletion was successful
     */
    function deleteData(
        string memory dataId
    ) external override onlyAuthorized returns (bool success) {
        require(dataExists(dataId), "Data does not exist");
        
        DataMetadata storage metadata = dataMetadata[dataId];
        
        // Check if caller is authorized to delete this data
        require(
            msg.sender == dataReferences[dataId].uploadedBy ||
            accessControl.hasRole(msg.sender, IAccessControl.Role.SystemAdmin),
            "Only uploader or system admin can delete data"
        );
        
        // Mark as inactive
        metadata.isActive = false;
        metadata.expiryTimestamp = block.timestamp;
        
        emit DataDeleted(dataId, msg.sender, block.timestamp);
        
        return true;
    }
    
    /**
     * @dev Update retention period for data
     * @param dataId Unique data identifier
     * @param newRetentionPeriod New retention period in seconds
     * @return success Whether update was successful
     */
    function updateRetention(
        string memory dataId,
        uint256 newRetentionPeriod
    ) external override onlyAuthorized returns (bool success) {
        require(dataExists(dataId), "Data does not exist");
        require(newRetentionPeriod > 0, "Retention period must be positive");
        
        DataMetadata storage metadata = dataMetadata[dataId];
        
        // Check if caller is authorized to update retention
        require(
            msg.sender == dataReferences[dataId].uploadedBy ||
            accessControl.hasRole(msg.sender, IAccessControl.Role.SystemAdmin),
            "Only uploader or system admin can update retention"
        );
        
        uint256 oldExpiry = metadata.expiryTimestamp;
        metadata.retentionPeriod = newRetentionPeriod;
        metadata.expiryTimestamp = block.timestamp + newRetentionPeriod;
        
        emit RetentionUpdated(dataId, newRetentionPeriod, msg.sender);
        
        return true;
    }
    
    /**
     * @dev Check if data exists
     * @param dataId Unique data identifier
     * @return exists Whether data exists
     */
    function dataExists(
        string memory dataId
    ) public view override returns (bool exists) {
        return bytes(dataReferences[dataId].ipfsHash).length > 0;
    }
    
    /**
     * @dev Check if data has expired and should be deleted
     * @param dataId Unique data identifier
     * @return isExpired Whether data has expired
     */
    function isDataExpired(
        string memory dataId
    ) external view override returns (bool isExpired) {
        require(dataExists(dataId), "Data does not exist");
        return block.timestamp >= dataMetadata[dataId].expiryTimestamp;
    }
    
    /**
     * @dev Verify data integrity by checking hash
     * @param dataId Unique data identifier
     * @param expectedHash Expected IPFS hash
     * @return isValid Whether data integrity is valid
     */
    function verifyDataIntegrity(
        string memory dataId,
        string memory expectedHash
    ) external view override returns (bool isValid) {
        require(dataExists(dataId), "Data does not exist");
        return keccak256(bytes(dataReferences[dataId].ipfsHash)) == keccak256(bytes(expectedHash));
    }
    
    /**
     * @dev Get the IPFS hash for a specific data ID
     * @param dataId Unique data identifier
     * @return ipfsHash IPFS hash of the data
     */
    function getIPFSHash(
        string memory dataId
    ) external view override returns (string memory ipfsHash) {
        require(dataExists(dataId), "Data does not exist");
        return dataReferences[dataId].ipfsHash;
    }
    
  /**
 * @dev Get all data IDs for a specific guest
 * @param guestId Unique guest identifier
 * @return dataIds Array of data identifiers
 */
function getDataIdsByGuest(string memory guestId) public view returns (string[] memory) {
    // Replace with your logic to fetch data IDs for the guest
    return new string[](0); // Temporary placeholder
}

/**
 * @dev Get data IDs for a specific guest by data type
 * @param guestId Unique guest identifier
 * @param dataType Type of data to retrieve
 * @return dataIds Array of data identifiers
 */
function getDataIdsByGuestAndType(
    string memory guestId,
    string memory dataType
) external view returns (string[] memory) {
    // Get all data IDs for the guest
    string[] memory allDataIds = getDataIdsByGuest(guestId);
    string[] memory filteredDataIds = new string[](allDataIds.length);
    uint256 filteredCount = 0;

    // Filter data IDs by type (replace with your logic)
    for (uint256 i = 0; i < allDataIds.length; i++) {
        // Example: Check if data type matches (replace with your logic)
        if (/* condition to check data type */ true) {
            filteredDataIds[filteredCount] = allDataIds[i];
            filteredCount++;
        }
    }

    // Resize the array to the actual filtered count
    assembly {
        mstore(filteredDataIds, filteredCount)
    }

    return filteredDataIds;
}

function getExpiredData() external view returns (string[] memory) {
    uint256 counter = 0;
    return new string[](0);
}
    /**
     * @dev Set default retention period
     * @param _defaultRetentionPeriod New default retention period in seconds
     */
    function setDefaultRetentionPeriod(
        uint256 _defaultRetentionPeriod
    ) external {
        require(
            accessControl.hasRole(msg.sender, IAccessControl.Role.SystemAdmin),
            "Only system admin can set default retention period"
        );
        require(_defaultRetentionPeriod > 0, "Retention period must be positive");
        defaultRetentionPeriod = _defaultRetentionPeriod;
    }
    
    /**
     * @dev Internal function to generate data ID
     * @param counter Counter value
     * @return dataId Generated data ID
     */
    function _generateDataId(uint256 counter) internal pure returns (string memory) {
        return string(abi.encodePacked("DATA-", _uint2str(counter)));
    }
    
    /**
     * @dev Internal function to convert uint to string
     * @param value Value to convert
     * @return str String representation
     */
    function _uint2str(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
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
}