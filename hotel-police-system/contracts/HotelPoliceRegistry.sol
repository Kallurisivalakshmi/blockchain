// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./AccessControl.sol";
import "./GuestVerification.sol";
import "./DataStorage.sol";
import "./AlertSystem.sol";

/**
 * @title HotelPoliceRegistry
 * @dev Main registry contract that ties all components together
 * @notice Provides a unified interface for the hotel-police collaboration system
 */
contract HotelPoliceRegistry {
    
    // System contract references
    AccessControl public accessControl;
    GuestVerification public guestVerification;
    DataStorage public dataStorage;
    AlertSystem public alertSystem;
    
    // System information
    string public systemName = "Hotel-Police Collaboration System";
    string public systemVersion = "1.0.0";
    uint256 public deploymentTimestamp;
    
    // System status
    bool public isSystemActive = true;
    
    // Events
    event SystemInitialized();
    event SystemStatusChanged(bool isActive);
    event ContractUpdated(string contractName, address newAddress);
    
    /**
     * @dev Constructor to initialize the system
     */
    constructor() {
        deploymentTimestamp = block.timestamp;
        
        // Deploy and initialize all system contracts
        accessControl = new AccessControl();
        dataStorage = new DataStorage(address(accessControl));
        guestVerification = new GuestVerification(address(accessControl), address(dataStorage));
        alertSystem = new AlertSystem(address(accessControl), address(guestVerification));
        
        emit SystemInitialized();
    }
    
    /**
     * @dev Set system active status
     * @param _isActive Whether the system should be active
     */
    function setSystemStatus(bool _isActive) external {
        require(
            accessControl.hasRole(msg.sender, IAccessControl.Role.SystemAdmin),
            "Only system admin can change system status"
        );
        isSystemActive = _isActive;
        emit SystemStatusChanged(_isActive);
    }
    
    /**
     * @dev Update contract references
     * @param _contractName Name of the contract to update
     * @param _newAddress New address of the contract
     */
    function updateContract(
        string memory _contractName,
        address _newAddress
    ) external {
        require(
            accessControl.hasRole(msg.sender, IAccessControl.Role.SystemAdmin),
            "Only system admin can update contracts"
        );
        
        if (keccak256(bytes(_contractName)) == keccak256(bytes("AccessControl"))) {
            accessControl = AccessControl(_newAddress);
        } else if (keccak256(bytes(_contractName)) == keccak256(bytes("GuestVerification"))) {
            guestVerification = GuestVerification(_newAddress);
        } else if (keccak256(bytes(_contractName)) == keccak256(bytes("DataStorage"))) {
            dataStorage = DataStorage(_newAddress);
        } else if (keccak256(bytes(_contractName)) == keccak256(bytes("AlertSystem"))) {
            alertSystem = AlertSystem(_newAddress);
        } else {
            revert("Invalid contract name");
        }
        
        emit ContractUpdated(_contractName, _newAddress);
    }
    
    /**
     * @dev Get system information
     * @return name System name
     * @return version System version
     * @return deployedAt Deployment timestamp
     * @return isActive Whether system is active
     */
    function getSystemInfo() external view returns (
        string memory name,
        string memory version,
        uint256 deployedAt,
        bool isActive
    ) {
        return (systemName, systemVersion, deploymentTimestamp, isSystemActive);
    }
    
    // Convenience functions that delegate to the appropriate contracts
    
    /**
     * @dev Verify a guest (delegates to GuestVerification)
     */
    function verifyGuest(
        string memory guestId,
        string memory aadhaarHash,
        string memory retinaScanHash,
        string memory guestName,
        string memory contactNumber,
        string memory roomNumber
    ) external returns (bool success) {
        return guestVerification.verifyGuest(
            guestId, aadhaarHash, retinaScanHash, guestName, contactNumber, roomNumber
        );
    }
    
    /**
     * @dev Create an alert (delegates to AlertSystem)
     */
    function createAlert(
        string memory guestId,
        AlertSystem.AlertType alertType,
        AlertSystem.AlertSeverity severity,
        string memory description
    ) external returns (string memory alertId) {
        return alertSystem.createAlert(guestId, alertType, severity, description);
    }
    
    /**
     * @dev Request access to guest data (delegates to AccessControl)
     */
    function requestAccess(
        string memory guestId,
        string memory purpose,
        uint256 duration
    ) external returns (string memory requestId) {
        return accessControl.requestAccess(guestId, purpose, duration);
    }
    
    /**
     * @dev Store data (delegates to DataStorage)
     */
    function storeData(
        string memory guestId,
        DataStorage.DataType dataType,
        string memory ipfsHash,
        uint256 size,
        string memory encryptionAlgorithm,
        string memory encryptionKeyHash,
        uint256 retentionPeriod
    ) external returns (string memory dataId) {
        return dataStorage.storeData(
            guestId, dataType, ipfsHash, size, encryptionAlgorithm, encryptionKeyHash, retentionPeriod
        );
    }
    
    /**
     * @dev Assign role (delegates to AccessControl)
     */
    function assignRole(
        address user,
        IAccessControl.Role role
    ) external returns (bool success) {
        return accessControl.assignRole(user, role);
    }
    
    // Additional system-level functions
    
    /**
     * @dev Emergency data access for law enforcement
     * @param guestId Guest ID to access
     * @param reason Reason for emergency access
     * @return success Whether access was granted
     */
    function emergencyDataAccess(
        string memory guestId,
        string memory reason
    ) external returns (bool success) {
        require(
            accessControl.hasRole(msg.sender, IAccessControl.Role.PoliceAdmin),
            "Only police admin can request emergency access"
        );
        
        // Create an emergency alert
        string memory alertId = alertSystem.createAlert(
            guestId,
            AlertSystem.AlertType.Emergency,
            AlertSystem.AlertSeverity.Critical,
            string(abi.encodePacked("Emergency data access requested: ", reason))
        );
        
        // Request immediate access with long duration
        string memory requestId = accessControl.requestAccess(
            guestId,
            string(abi.encodePacked("Emergency access: ", reason)),
            7 days // 7 days access for emergency
        );
        
        // Auto-approve emergency requests from police admin
        // In a real system, this would require proper authorization
        accessControl.approveAccessRequest(requestId);
        
        return true;
    }
    
    /**
     * @dev Batch verify multiple guests
     * @param guestIds Array of guest IDs
     * @param aadhaarHashes Array of Aadhaar hashes
     * @param retinaScanHashes Array of retina scan hashes
     * @param guestNames Array of guest names
     * @param contactNumbers Array of contact numbers
     * @param roomNumbers Array of room numbers
     * @return successes Array of success flags
     */
    function batchVerifyGuests(
        string[] memory guestIds,
        string[] memory aadhaarHashes,
        string[] memory retinaScanHashes,
        string[] memory guestNames,
        string[] memory contactNumbers,
        string[] memory roomNumbers
    ) external returns (bool[] memory successes) {
        require(guestIds.length == aadhaarHashes.length, "Array length mismatch");
        require(guestIds.length == retinaScanHashes.length, "Array length mismatch");
        require(guestIds.length == guestNames.length, "Array length mismatch");
        require(guestIds.length == contactNumbers.length, "Array length mismatch");
        require(guestIds.length == roomNumbers.length, "Array length mismatch");
        
        successes = new bool[](guestIds.length);
        
        for (uint256 i = 0; i < guestIds.length; i++) {
            successes[i] = guestVerification.verifyGuest(
                guestIds[i],
                aadhaarHashes[i],
                retinaScanHashes[i],
                guestNames[i],
                contactNumbers[i],
                roomNumbers[i]
            );
        }
        
        return successes;
    }
    
    /**
     * @dev Get comprehensive guest report for law enforcement
     * @param guestId Guest ID to query
     * @return report Comprehensive guest information including verification status, data references, and alerts
     */
    function getGuestReport(
        string memory guestId
    ) external view returns (
        IGuestVerification.GuestInfo memory guestInfo,
        IGuestVerification.GuestBiometricData memory biometricData,
        string[] memory dataReferences,
        string[] memory alerts
    ) {
        guestInfo = guestVerification.getGuestInfo(guestId);
        biometricData = guestVerification.getGuestBiometricData(guestId);
        dataReferences = dataStorage.getGuestDataReferences(guestId);
        alerts = alertSystem.getAlertsByGuest(guestId);
    }
}