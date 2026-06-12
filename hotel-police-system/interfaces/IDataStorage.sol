// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IDataStorage
 * @dev Interface for Data Storage Contract
 * @notice Manages secure storage of guest data using IPFS and on-chain hashes
 */
interface IDataStorage {
    
    /**
     * @dev Enum for data types stored in the system
     */
    enum DataType {
        AadhaarData,      // Aadhaar card information
        RetinaScan,       // Retina scan biometric data
        GuestPhoto,       // Guest photograph
        IdentificationDoc, // Other identification documents
        StayHistory,      // Guest stay history
        EmergencyContact  // Emergency contact information
    }
    
    /**
     * @dev Struct to store data reference information
     */
    struct DataReference {
        string ipfsHash;           // IPFS hash of the encrypted data
        DataType dataType;        // Type of data stored
        uint256 uploadTimestamp;   // When data was uploaded
        address uploadedBy;        // Address that uploaded the data
        uint256 size;             // Size of the data in bytes
        string encryptionAlgorithm; // Encryption algorithm used
        string encryptionKeyHash; // Hash of the encryption key (stored off-chain)
    }
    
    /**
     * @dev Struct to store data access metadata
     */
    struct DataMetadata {
        string dataId;             // Unique data identifier
        string guestId;           // Guest ID this data belongs to
        DataType dataType;        // Type of data
        bool isActive;            // Whether data is active/valid
        uint256 retentionPeriod;  // How long data should be retained (seconds)
        uint256 expiryTimestamp;  // When data should be deleted
    }
    
    /**
     * @dev Event emitted when data is stored
     * @param dataId Unique data identifier
     * @param guestId Guest ID this data belongs to
     * @param dataType Type of data stored
     * @param ipfsHash IPFS hash of the data
     */
    event DataStored(
        string indexed dataId,
        string indexed guestId,
        uint8 dataType,
        string ipfsHash
    );
    
    /**
     * @dev Event emitted when data is retrieved
     * @param dataId Unique data identifier
     * @param retrievedBy Address that retrieved the data
     * @param timestamp Retrieval timestamp
     */
    event DataRetrieved(
        string indexed dataId,
        address indexed retrievedBy,
        uint256 timestamp
    );
    
    /**
     * @dev Event emitted when data is deleted
     * @param dataId Unique data identifier
     * @param deletedBy Address that deleted the data
     * @param timestamp Deletion timestamp
     */
    event DataDeleted(
        string indexed dataId,
        address indexed deletedBy,
        uint256 timestamp
    );
    
    /**
     * @dev Event emitted when data retention is updated
     * @param dataId Unique data identifier
     * @param newRetentionPeriod New retention period in seconds
     * @param updatedBy Address that updated the retention
     */
    event RetentionUpdated(
        string indexed dataId,
        uint256 newRetentionPeriod,
        address indexed updatedBy
    );
    
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
    ) external returns (string memory dataId);
    
   
    function getDataReference(
        string memory dataId
    ) external view returns (
        DataReference memory DataReference,
        DataMetadata memory metadata
    );
    
    /**
     * @dev Get all data references for a specific guest
     * @param guestId Guest ID to query
     * @return dataIds Array of data identifiers
     */
    function getGuestDataReferences(
        string memory guestId
    ) external view returns (string[] memory dataIds);
    
    /**
     * @dev Get data references by type for a guest
     * @param guestId Guest ID to query
     * @param dataType Type of data to filter by
     * @return dataIds Array of data identifiers matching criteria
     */
    function getGuestDataByType(
        string memory guestId,
        DataType dataType
    ) external view returns (string[] memory dataIds);
    
    /**
     * @dev Delete data reference and mark for cleanup
     * @param dataId Unique data identifier
     * @return success Whether deletion was successful
     */
    function deleteData(
        string memory dataId
    ) external returns (bool success);
    
    /**
     * @dev Update retention period for data
     * @param dataId Unique data identifier
     * @param newRetentionPeriod New retention period in seconds
     * @return success Whether update was successful
     */
    function updateRetention(
        string memory dataId,
        uint256 newRetentionPeriod
    ) external returns (bool success);
    
    /**
     * @dev Check if data exists
     * @param dataId Unique data identifier
     * @return exists Whether data exists
     */
    function dataExists(
        string memory dataId
    ) external view returns (bool exists);
    
    /**
     * @dev Check if data has expired and should be deleted
     * @param dataId Unique data identifier
     * @return isExpired Whether data has expired
     */
    function isDataExpired(
        string memory dataId
    ) external view returns (bool isExpired);
    
    /**
     * @dev Verify data integrity by checking hash
     * @param dataId Unique data identifier
     * @param expectedHash Expected IPFS hash
     * @return isValid Whether data integrity is valid
     */
    function verifyDataIntegrity(
        string memory dataId,
        string memory expectedHash
    ) external view returns (bool isValid);
    
    /**
     * @dev Get the IPFS hash for a specific data ID
     * @param dataId Unique data identifier
     * @return ipfsHash IPFS hash of the data
     */
    function getIPFSHash(
        string memory dataId
    ) external view returns (string memory ipfsHash);
}