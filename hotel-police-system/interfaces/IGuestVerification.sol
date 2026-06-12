// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IGuestVerification
 * @dev Interface for Guest Verification Contract
 * @notice Provides functions for guest identity verification using Aadhaar and retina scan
 */
interface IGuestVerification {
    
    /**
     * @dev Struct to store guest biometric data references
     */
    struct GuestBiometricData {
        string aadhaarHash;          // IPFS hash of encrypted Aadhaar data
        string retinaScanHash;       // IPFS hash of encrypted retina scan
        uint256 verificationTimestamp;
        address verifiedBy;          // Hotel address that verified the guest
        bool isVerified;
    }
    
    /**
     * @dev Struct to store guest information
     */
    struct GuestInfo {
        string guestId;              // Unique guest identifier
        string name;
        string contactNumber;
        string roomNumber;
        uint256 checkInTime;
        uint256 checkOutTime;
        bool isActive;
    }
    
    /**
     * @dev Event emitted when a guest is verified
     * @param guestId Unique guest identifier
     * @param hotelAddress Address of the hotel
     * @param timestamp Verification timestamp
     */
    event GuestVerified(
        string indexed guestId,
        address indexed hotelAddress,
        uint256 timestamp
    );
    
    /**
     * @dev Event emitted when guest data is updated
     * @param guestId Unique guest identifier
     * @param updatedBy Address that updated the data
     * @param timestamp Update timestamp
     */
    event GuestDataUpdated(
        string indexed guestId,
        address indexed updatedBy,
        uint256 timestamp
    );
    
    /**
     * @dev Event emitted when there's a verification failure
     * @param guestId Unique guest identifier
     * @param reason Failure reason
     * @param timestamp Failure timestamp
     */
    event VerificationFailed(
        string indexed guestId,
        string reason,
        uint256 timestamp
    );
    
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
    ) external returns (bool success);
    
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
    ) external returns (bool success);
    
    /**
     * @dev Get guest verification status
     * @param guestId Unique guest identifier
     * @return isVerified Whether guest is verified
     * @return verifiedBy Address that verified the guest
     * @return timestamp Verification timestamp
     */
    function getGuestVerificationStatus(
        string memory guestId
    ) external view returns (
        bool isVerified,
        address verifiedBy,
        uint256 timestamp
    );
    
    /**
     * @dev Get guest biometric data references
     * @param guestId Unique guest identifier
     * @return aadhaarHash IPFS hash of encrypted Aadhaar data
     * @return retinaScanHash IPFS hash of encrypted retina scan
     */
    function getGuestBiometricData(
        string memory guestId
    ) external view returns (
        string memory aadhaarHash,
        string memory retinaScanHash
    );
    
    /**
     * @dev Get complete guest information
     * @param guestId Unique guest identifier
     * @return info GuestInfo struct containing guest details
     */
    function getGuestInfo(
        string memory guestId
    ) external view returns (GuestInfo memory info);
    
    /**
     * @dev Check if a guest exists in the system
     * @param guestId Unique guest identifier
     * @return exists Whether guest exists
     */
    function guestExists(
        string memory guestId
    ) external view returns (bool exists);
    
    /**
     * @dev Invalidate guest verification (check-out or revocation)
     * @param guestId Unique guest identifier
     * @return success Whether invalidation was successful
     */
    function invalidateGuest(
        string memory guestId
    ) external returns (bool success);
}