// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IAccessControl
 * @dev Interface for Access Control Contract
 * @notice Manages role-based access for hotels and police departments
 */
interface IAccessControl {
    
    /**
     * @dev Enum for user roles in the system
     */
    enum Role {
        None,           // No role assigned
        HotelStaff,     // Hotel staff member
        HotelManager,   // Hotel manager
        PoliceOfficer,  // Regular police officer
        PoliceAdmin,    // Police department administrator
        SystemAdmin     // System administrator
    }
    
    /**
     * @dev Struct to store access request information
     */
    struct AccessRequest {
        string requestId;             // Unique request identifier
        address requester;           // Address requesting access
        string guestId;              // Guest ID being accessed
        Role requesterRole;          // Role of the requester
        string purpose;              // Purpose of access request
        uint256 requestTimestamp;    // When request was made
        uint256 expiryTimestamp;     // When request expires
        bool isApproved;             // Whether request is approved
        address[] approvers;         // Addresses that approved the request
        string[] conditions;         // Conditions for access
    }
    
    /**
     * @dev Struct to store access log entry
     */
    struct AccessLog {
        string logId;                 // Unique log identifier
        address accessor;            // Address that accessed data
        string guestId;              // Guest ID accessed
        uint256 accessTimestamp;     // When access occurred
        string dataAccessed;         // What data was accessed
        bool isAuthorized;           // Whether access was authorized
    }
    
    /**
     * @dev Event emitted when a role is assigned
     * @param user Address of the user
     * @param role Assigned role
     * @param assignedBy Address that assigned the role
     */
    event RoleAssigned(
        address indexed user,
        uint8 role,
        address indexed assignedBy
    );
    
    /**
     * @dev Event emitted when a role is revoked
     * @param user Address of the user
     * @param role Revoked role
     * @param revokedBy Address that revoked the role
     */
    event RoleRevoked(
        address indexed user,
        uint8 role,
        address indexed revokedBy
    );
    
    /**
     * @dev Event emitted when access is granted
     * @param requestId Unique request identifier
     * @param requester Address requesting access
     * @param guestId Guest ID being accessed
     */
    event AccessGranted(
        string indexed requestId,
        address indexed requester,
        string indexed guestId
    );
    
    /**
     * @dev Event emitted when access is denied
     * @param requestId Unique request identifier
     * @param requester Address requesting access
     * @param guestId Guest ID being accessed
     * @param reason Reason for denial
     */
    event AccessDenied(
        string indexed requestId,
        address indexed requester,
        string indexed guestId,
        string reason
    );
    
    /**
     * @dev Event emitted when data is accessed
     * @param accessor Address that accessed data
     * @param guestId Guest ID accessed
     * @param timestamp Access timestamp
     */
    event DataAccessed(
        address indexed accessor,
        string indexed guestId,
        uint256 timestamp
    );
    
    /**
     * @dev Assign a role to a user
     * @param user Address of the user
     * @param role Role to assign
     * @return success Whether role assignment was successful
     */
    function assignRole(
        address user,
        Role role
    ) external returns (bool success);
    
    /**
     * @dev Revoke a role from a user
     * @param user Address of the user
     * @param role Role to revoke
     * @return success Whether role revocation was successful
     */
    function revokeRole(
        address user,
        Role role
    ) external returns (bool success);
    
    /**
     * @dev Get the role of a user
     * @param user Address of the user
     * @return role User's role
     */
    function getRole(
        address user
    ) external view returns (Role role);
    
    /**
     * @dev Check if a user has a specific role
     * @param user Address of the user
     * @param role Role to check
     * @return hasRole Whether user has the specified role
     */
    function hasRole(
        address user,
        Role role
    ) external view returns (bool hasRole);
    
    /**
     * @dev Request access to guest data
     * @param guestId Guest ID to access
     * @param purpose Purpose of access request
     * @param duration Duration of access in seconds
     * @return requestId Unique request identifier
     */
    function requestAccess(
        string memory guestId,
        string memory purpose,
        uint256 duration
    ) external returns (string memory requestId);
    
    /**
     * @dev Approve an access request
     * @param requestId Unique request identifier
     * @return success Whether approval was successful
     */
    function approveAccessRequest(
        string memory requestId
    ) external returns (bool success);
    
    /**
     * @dev Deny an access request
     * @param requestId Unique request identifier
     * @param reason Reason for denial
     * @return success Whether denial was successful
     */
    function denyAccessRequest(
        string memory requestId,
        string memory reason
    ) external returns (bool success);
    
    /**
     * @dev Check if access is granted for a specific request
     * @param requestId Unique request identifier
     * @return isGranted Whether access is granted
     * @return expiryTimestamp When access expires
     */
    function isAccessGranted(
        string memory requestId
    ) external view returns (
        bool isGranted,
        uint256 expiryTimestamp
    );
    
    /**
     * @dev Get access request details
     * @param requestId Unique request identifier
     * @return request AccessRequest struct
     */
    function getAccessRequest(
        string memory requestId
    ) external view returns (AccessRequest memory request);
    
    /**
     * @dev Log data access
     * @param guestId Guest ID accessed
     * @param dataType Type of data accessed
     * @return logId Unique log identifier
     */
    function logDataAccess(
        string memory guestId,
        string memory dataType
    ) external returns (string memory logId);
    
    /**
     * @dev Get access logs for audit
     * @param guestId Guest ID to filter by (empty string for all)
     * @param startTimestamp Start timestamp for filtering
     * @param endTimestamp End timestamp for filtering
     * @return logs Array of access log entries
     */
    function getAccessLogs(
        string memory guestId,
        uint256 startTimestamp,
        uint256 endTimestamp
    ) external view returns (AccessLog[] memory logs);
    
    /**
     * @dev Check if current caller can access specific guest data
     * @param guestId Guest ID to check access for
     * @return canAccess Whether access is allowed
     */
    function canAccessGuestData(
        string memory guestId
    ) external view returns (bool canAccess);
}