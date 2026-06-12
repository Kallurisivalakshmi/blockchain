// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IGuestVerification.sol";
import "../interfaces/IAccessControl.sol";
import "../interfaces/IDataStorage.sol";

/**
 * @title GuestVerification
 * @dev Main contract for guest verification using Aadhaar and retina scan
 * @notice Implements secure guest identity verification and management
 */
contract GuestVerification is IGuestVerification {
    
    // Mapping from guestId to GuestBiometricData
    mapping(string => GuestBiometricData) private guestBiometricData;
    
    // Mapping from guestId to GuestInfo
    mapping(string => GuestInfo) private guestInfo;
    
    // Mapping from hotel address to list of guest IDs
    mapping(address => string[]) private hotelGuests;
    
    // Mapping from guestId to hotel address
    mapping(string => address) private guestToHotel;
    
    // Access control contract reference
    IAccessControl public accessControl;
    
    // Data storage contract reference
    IDataStorage public dataStorage;
    
    // Event counters
    uint256 private guestCounter;
    
    // Modifiers
    modifier onlyHotel() {
        require(
            accessControl.hasRole(msg.sender, IAccessControl.Role.HotelStaff) ||
            accessControl.hasRole(msg.sender, IAccessControl.Role.HotelManager),
            "Only hotel staff can perform this action"
        );
        _;
    }
    
    modifier onlyVerifiedGuest(string memory _guestId) {
        require(guestExists(_guestId), "Guest does not exist");
        require(guestBiometricData[_guestId].isVerified, "Guest is not verified");
        _;
    }
    
    /**
     * @dev Constructor to initialize the contract
     * @param _accessControl Address of the AccessControl contract
     * @param _dataStorage Address of the DataStorage contract
     */
    constructor(address _accessControl, address _dataStorage) {
        accessControl = IAccessControl(_accessControl);
        dataStorage = IDataStorage(_dataStorage);
    }
    
    /**
     * @dev Set the access control contract address
     * @param _accessControl Address of the AccessControl contract
     */
    function setAccessControl(address _accessControl) external {
        require(msg.sender == address(accessControl) || 
                accessControl.hasRole(msg.sender, IAccessControl.Role.SystemAdmin),
                "Only system admin can set access control");
        accessControl = IAccessControl(_accessControl);
    }
    
    /**
     * @dev Set the data storage contract address
     * @param _dataStorage Address of the DataStorage contract
     */
    function setDataStorage(address _dataStorage) external {
        require(msg.sender == address(dataStorage) || 
                accessControl.hasRole(msg.sender, IAccessControl.Role.SystemAdmin),
                "Only system admin can set data storage");
        dataStorage = IDataStorage(_dataStorage);
    }
    
    /**
     * @dev Verify guest using Aadhaar and retina scan data
     * @param guestId Unique guest identifier
     * @param aadhaarHash IPFS hash of encrypted Aadhaar data
     * @param retinaScanHash IPFS hash of encrypted retina scan
     * @param guestName Guest name
     * @param contactNumber Guest contact number
     * @param roomNumber Room number assigned
     * @return success Whether verification was successful
     */
    function verifyGuest(
        string memory guestId,
        string memory aadhaarHash,
        string memory retinaScanHash,
        string memory guestName,
        string memory contactNumber,
        string memory roomNumber
    ) external override onlyHotel returns (bool success) {
        require(bytes(guestId).length > 0, "Guest ID cannot be empty");
        require(bytes(aadhaarHash).length > 0, "Aadhaar hash cannot be empty");
        require(bytes(retinaScanHash).length > 0, "Retina scan hash cannot be empty");
        require(!guestExists(guestId), "Guest already exists");
        
        // Store biometric data
        guestBiometricData[guestId] = GuestBiometricData({
            aadhaarHash: aadhaarHash,
            retinaScanHash: retinaScanHash,
            verificationTimestamp: block.timestamp,
            verifiedBy: msg.sender,
            isVerified: true
        });
        
        // Store guest info
        guestInfo[guestId] = GuestInfo({
            guestId: guestId,
            name: guestName,
            contactNumber: contactNumber,
            roomNumber: roomNumber,
            checkInTime: block.timestamp,
            checkOutTime: 0,
            isActive: true
        });
        
        // Map guest to hotel
        guestToHotel[guestId] = msg.sender;
        hotelGuests[msg.sender].push(guestId);
        
        // Store data references in data storage contract
        string memory aadhaarDataId = dataStorage.storeData(
            guestId,
            IDataStorage.DataType.AadhaarData,
            aadhaarHash,
            0, // Size will be updated
            "AES-256",
            "", // Encryption key hash
            30 days // Retention period
        );
        
        string memory retinaDataId = dataStorage.storeData(
            guestId,
            IDataStorage.DataType.RetinaScan,
            retinaScanHash,
            0, // Size will be updated
            "AES-256",
            "", // Encryption key hash
            30 days // Retention period
        );
        
        emit GuestVerified(guestId, msg.sender, block.timestamp);
        
        return true;
    }
    
    /**
     * @dev Update guest biometric data
     * @param guestId Unique guest identifier
     * @param aadhaarHash New IPFS hash of encrypted Aadhaar data
     * @param retinaScanHash New IPFS hash of encrypted retina scan
     * @return success Whether update was successful
     */
    function updateGuestBiometrics(
        string memory guestId,
        string memory aadhaarHash,
        string memory retinaScanHash
    ) external override onlyHotel onlyVerifiedGuest(guestId) returns (bool success) {
        require(guestToHotel[guestId] == msg.sender, "Only the verifying hotel can update biometrics");
        
        // Update biometric data
        guestBiometricData[guestId].aadhaarHash = aadhaarHash;
        guestBiometricData[guestId].retinaScanHash = retinaScanHash;
        guestBiometricData[guestId].verificationTimestamp = block.timestamp;
        guestBiometricData[guestId].verifiedBy = msg.sender;
        
        emit GuestDataUpdated(guestId, msg.sender, block.timestamp);
        
        return true;
    }
    
    /**
     * @dev Get guest verification status
     * @param guestId Unique guest identifier
     * @return isVerified Whether guest is verified
     * @return verifiedBy Address that verified the guest
     * @return timestamp Verification timestamp
     */
    function getGuestVerificationStatus(
        string memory guestId
    ) external view override returns (
        bool isVerified,
        address verifiedBy,
        uint256 timestamp
    ) {
        require(guestExists(guestId), "Guest does not exist");
        
        GuestBiometricData memory data = guestBiometricData[guestId];
        return (data.isVerified, data.verifiedBy, data.verificationTimestamp);
    }
    
    /**
     * @dev Get guest biometric data references
     * @param guestId Unique guest identifier
     * @return aadhaarHash IPFS hash of encrypted Aadhaar data
     * @return retinaScanHash IPFS hash of encrypted retina scan
     */
    function getGuestBiometricData(
        string memory guestId
    ) external view override returns (
        string memory aadhaarHash,
        string memory retinaScanHash
    ) {
        require(guestExists(guestId), "Guest does not exist");
        
        GuestBiometricData memory data = guestBiometricData[guestId];
        return (data.aadhaarHash, data.retinaScanHash);
    }
    
    /**
     * @dev Get complete guest information
     * @param guestId Unique guest identifier
     * @return info GuestInfo struct containing guest details
     */
    function getGuestInfo(
        string memory guestId
    ) external view override returns (GuestInfo memory info) {
        require(guestExists(guestId), "Guest does not exist");
        return guestInfo[guestId];
    }
    
    /**
     * @dev Check if a guest exists in the system
     * @param guestId Unique guest identifier
     * @return exists Whether guest exists
     */
    function guestExists(
        string memory guestId
    ) public view override returns (bool exists) {
        return bytes(guestInfo[guestId].guestId).length > 0;
    }
    
    /**
     * @dev Invalidate guest verification (check-out or revocation)
     * @param guestId Unique guest identifier
     * @return success Whether invalidation was successful
     */
    function invalidateGuest(
        string memory guestId
    ) external override onlyHotel onlyVerifiedGuest(guestId) returns (bool success) {
        require(guestToHotel[guestId] == msg.sender, "Only the verifying hotel can invalidate guest");
        
        // Mark guest as inactive
        guestInfo[guestId].isActive = false;
        guestInfo[guestId].checkOutTime = block.timestamp;
        
        // Mark biometric data as unverified
        guestBiometricData[guestId].isVerified = false;
        
        emit GuestDataUpdated(guestId, msg.sender, block.timestamp);
        
        return true;
    }
    
    /**
     * @dev Get all guests for a specific hotel
     * @param hotelAddress Address of the hotel
     * @return guestIds Array of guest IDs for the hotel
     */
    function getHotelGuests(
        address hotelAddress
    ) external view returns (string[] memory guestIds) {
        return hotelGuests[hotelAddress];
    }
    
    /**
     * @dev Get the hotel address for a specific guest
     * @param guestId Unique guest identifier
     * @return hotelAddress Address of the hotel
     */
    function getGuestHotel(
        string memory guestId
    ) external view returns (address hotelAddress) {
        require(guestExists(guestId), "Guest does not exist");
        return guestToHotel[guestId];
    }
    
    /**
     * @dev Check if a guest is currently active (checked in)
     * @param guestId Unique guest identifier
     * @return isActive Whether guest is active
     */
    function isGuestActive(
        string memory guestId
    ) external view returns (bool isActive) {
        require(guestExists(guestId), "Guest does not exist");
        return guestInfo[guestId].isActive;
    }
    
    /**
     * @dev Get guest count for a hotel
     * @param hotelAddress Address of the hotel
     * @return count Number of guests for the hotel
     */
    function getHotelGuestCount(
        address hotelAddress
    ) external view returns (uint256 count) {
        return hotelGuests[hotelAddress].length;
    }
}