// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IAccessControl.sol";

/**
 * @title AccessControl
 * @dev Main contract for role-based access control
 * @notice Manages permissions and access requests for hotels and police
 */
contract AccessControl is IAccessControl {
    
    // Mapping from user address to their role
    mapping(address => Role) private userRoles;
    
    // Mapping from requestId to AccessRequest
    mapping(string => AccessRequest) private accessRequests;
    
    // Mapping from requestId to approval status
    mapping(string => mapping(address => bool)) private requestApprovals;
    
    // Array of access logs for audit trail
    AccessLog[] private accessLogs;
    
    // Mapping from guestId to active access requests
    mapping(string => string[]) private guestAccessRequests;
    
    // Multi-signature requirements: how many approvals are needed for police access
    uint256 public requiredApprovals = 2;
    
    // Event counters
    uint256 private requestCounter;
    uint256 private logCounter;
    
    // Modifiers
    modifier onlyPolice() {
        require(
            hasRole(msg.sender, Role.PoliceOfficer) ||
            hasRole(msg.sender, Role.PoliceAdmin),
            "Only police personnel can perform this action"
        );
        _;
    }
    
    modifier onlyAdmin() {
        require(
            hasRole(msg.sender, Role.PoliceAdmin) ||
            hasRole(msg.sender, Role.SystemAdmin),
            "Only admin personnel can perform this action"
        );
        _;
    }
    
    modifier onlySystemAdmin() {
        require(
            hasRole(msg.sender, Role.SystemAdmin),
            "Only system admin can perform this action"
        );
        _;
    }
    
    /**
     * @dev Constructor to initialize the contract
     */
    constructor() {
        // Assign system admin role to contract deployer
        userRoles[msg.sender] = Role.SystemAdmin;
        emit RoleAssigned(msg.sender, uint8(Role.SystemAdmin), msg.sender);
    }
    
    /**
     * @dev Assign a role to a user
     * @param user Address of the user
     * @param role Role to assign
     * @return success Whether role assignment was successful
     */
    function assignRole(
        address user,
        Role role
    ) external override onlyAdmin returns (bool success) {
        require(user != address(0), "Invalid user address");
        require(role != Role.None, "Cannot assign None role");
        
        // System admin can only be assigned by current system admin
        if (role == Role.SystemAdmin) {
            require(hasRole(msg.sender, Role.SystemAdmin), "Only system admin can assign system admin role");
        }
        
        // Police roles can only be assigned by police admin or system admin
        if (role == Role.PoliceOfficer || role == Role.PoliceAdmin) {
            require(
                hasRole(msg.sender, Role.PoliceAdmin) ||
                hasRole(msg.sender, Role.SystemAdmin),
                "Only police admin or system admin can assign police roles"
            );
        }
        
        // Hotel roles can be assigned by hotel managers or system admin
        if (role == Role.HotelStaff || role == Role.HotelManager) {
            require(
                hasRole(msg.sender, Role.HotelManager) ||
                hasRole(msg.sender, Role.SystemAdmin),
                "Only hotel manager or system admin can assign hotel roles"
            );
        }
        
        userRoles[user] = role;
        emit RoleAssigned(user, uint8(role), msg.sender);
        
        return true;
    }
    
    /**
     * @dev Revoke a role from a user
     * @param user Address of the user
     * @param role Role to revoke
     * @return success Whether role revocation was successful
     */
    function revokeRole(
        address user,
        Role role
    ) external override onlyAdmin returns (bool success) {
        require(user != address(0), "Invalid user address");
        require(user != msg.sender, "Cannot revoke own role");
        
        // Check current role matches the role to revoke
        require(userRoles[user] == role, "User does not have this role");
        
        // Cannot revoke system admin role unless you're the only system admin
        if (role == Role.SystemAdmin) {
            bool isLastAdmin = true;
            for (uint256 i = 0; i < _getAllUsers().length; i++) {
                if (_getAllUsers()[i] != user && userRoles[_getAllUsers()[i]] == Role.SystemAdmin) {
                    isLastAdmin = false;
                    break;
                }
            }
            require(!isLastAdmin, "Cannot revoke last system admin role");
        }
        
        userRoles[user] = Role.None;
        emit RoleRevoked(user, uint8(role), msg.sender);
        
        return true;
    }
    
    /**
     * @dev Get the role of a user
     * @param user Address of the user
     * @return role User's role
     */
    function getRole(
        address user
    ) external view override returns (Role role) {
        return userRoles[user];
    }
    
    /**
     * @dev Check if a user has a specific role
     * @param user Address of the user
     * @param role Role to check
     * @return hasRole Whether user has the specified role
     */
    function hasRole(
        address user,
        Role role
    ) public view override returns (bool hasRole) {
        return userRoles[user] == role;
    }
    
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
    ) external override onlyPolice returns (string memory requestId) {
        require(bytes(guestId).length > 0, "Guest ID cannot be empty");
        require(bytes(purpose).length > 0, "Purpose cannot be empty");
        require(duration > 0, "Duration must be positive");
        
        // Generate unique request ID
        requestCounter++;
        requestId = _generateRequestId(requestCounter);
        
        // Create access request
        uint256 expiryTimestamp = block.timestamp + duration;
        
        accessRequests[requestId] = AccessRequest({
            requestId: requestId,
            requester: msg.sender,
            guestId: guestId,
            requesterRole: userRoles[msg.sender],
            purpose: purpose,
            requestTimestamp: block.timestamp,
            expiryTimestamp: expiryTimestamp,
            isApproved: false,
            approvers: new address[](0),
            conditions: new string[](0)
        });
        
        // Add to guest's access requests
        guestAccessRequests[guestId].push(requestId);
        
        emit AlertNotificationsSent(requestId, new address[](0), block.timestamp);
        
        return requestId;
    }
    
    /**
     * @dev Approve an access request
     * @param requestId Unique request identifier
     * @return success Whether approval was successful
     */
    function approveAccessRequest(
        string memory requestId
    ) external override onlyPolice returns (bool success) {
        AccessRequest storage request = accessRequests[requestId];
        require(request.requestId != "", "Request does not exist");
        require(!request.isApproved, "Request already approved");
        require(block.timestamp < request.expiryTimestamp, "Request has expired");
        
        // Check if approver is authorized (police admin or system admin)
        require(
            hasRole(msg.sender, Role.PoliceAdmin) ||
            hasRole(msg.sender, Role.SystemAdmin),
            "Only police admin or system admin can approve requests"
        );
        
        // Add approver to the list
        request.approvers.push(msg.sender);
        
        // Check if enough approvals have been collected
        if (request.approvers.length >= requiredApprovals) {
            request.isApproved = true;
            emit AccessGranted(requestId, request.requester, request.guestId);
            
            // Log the access
            _logDataAccess(request.requester, request.guestId, "Guest data access approved");
        }
        
        return true;
    }
    
    /**
     * @dev Deny an access request
     * @param requestId Unique request identifier
     * @param reason Reason for denial
     * @return success Whether denial was successful
     */
    function denyAccessRequest(
        string memory requestId,
        string memory reason
    ) external override onlyPolice returns (bool success) {
        AccessRequest storage request = accessRequests[requestId];
        require(request.requestId != "", "Request does not exist");
        require(!request.isApproved, "Request already approved");
        require(block.timestamp < request.expiryTimestamp, "Request has expired");
        
        // Check if denier is authorized
        require(
            hasRole(msg.sender, Role.PoliceAdmin) ||
            hasRole(msg.sender, Role.SystemAdmin),
            "Only police admin or system admin can deny requests"
        );
        
        // Mark as denied by setting expiry to past
        request.expiryTimestamp = block.timestamp - 1;
        
        emit AccessDenied(requestId, request.requester, request.guestId, reason);
        
        return true;
    }
    
    /**
     * @dev Check if access is granted for a specific request
     * @param requestId Unique request identifier
     * @return isGranted Whether access is granted
     * @return expiryTimestamp When access expires
     */
    function isAccessGranted(
        string memory requestId
    ) external view override returns (
        bool isGranted,
        uint256 expiryTimestamp
    ) {
        AccessRequest memory request = accessRequests[requestId];
        require(request.requestId != "", "Request does not exist");
        
        return (request.isApproved && block.timestamp < request.expiryTimestamp, request.expiryTimestamp);
    }
    
    /**
     * @dev Get access request details
     * @param requestId Unique request identifier
     * @return request AccessRequest struct
     */
    function getAccessRequest(
        string memory requestId
    ) external view override returns (AccessRequest memory request) {
        return accessRequests[requestId];
    }
    
    /**
     * @dev Log data access
     * @param guestId Guest ID accessed
     * @param dataType Type of data accessed
     * @return logId Unique log identifier
     */
    function logDataAccess(
        string memory guestId,
        string memory dataType
    ) external override returns (string memory logId) {
        logCounter++;
        logId = _generateLogId(logCounter);
        
        accessLogs.push(AccessLog({
            logId: logId,
            accessor: msg.sender,
            guestId: guestId,
            accessTimestamp: block.timestamp,
            dataAccessed: dataType,
            isAuthorized: canAccessGuestData(guestId)
        }));
        
        emit DataAccessed(msg.sender, guestId, block.timestamp);
        
        return logId;
    }
    
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
    ) external view override returns (AccessLog[] memory logs) {
        uint256 counter = 0;
        
        // Count matching logs first
        for (uint256 i = 0; i < accessLogs.length; i++) {
            AccessLog memory log = accessLogs[i];
            if ((bytes(guestId).length == 0 || keccak256(bytes(log.guestId)) == keccak256(bytes(guestId))) &&
                log.accessTimestamp >= startTimestamp &&
                log.accessTimestamp <= endTimestamp) {
                counter++;
            }
        }
        
        // Allocate array and fill it
        logs = new AccessLog[](counter);
        uint256 index = 0;
        
        for (uint256 i = 0; i < accessLogs.length; i++) {
            AccessLog memory log = accessLogs[i];
            if ((bytes(guestId).length == 0 || keccak256(bytes(log.guestId)) == keccak256(bytes(guestId))) &&
                log.accessTimestamp >= startTimestamp &&
                log.accessTimestamp <= endTimestamp) {
                logs[index] = log;
                index++;
            }
        }
        
        return logs;
    }
    
    /**
     * @dev Check if current caller can access specific guest data
     * @param guestId Guest ID to check access for
     * @return canAccess Whether access is allowed
     */
    function canAccessGuestData(
        string memory guestId
    ) public view override returns (bool canAccess) {
        // System admin can access any data
        if (hasRole(msg.sender, Role.SystemAdmin)) {
            return true;
        }
        
        // Police can access if they have an approved request
        if (hasRole(msg.sender, Role.PoliceOfficer) || hasRole(msg.sender, Role.PoliceAdmin)) {
            string[] memory requests = guestAccessRequests[guestId];
            for (uint256 i = 0; i < requests.length; i++) {
                (bool isGranted, ) = isAccessGranted(requests[i]);
                if (isGranted && accessRequests[requests[i]].requester == msg.sender) {
                    return true;
                }
            }
        }
        
        // Hotel staff can only access their own guests
        if (hasRole(msg.sender, Role.HotelStaff) || hasRole(msg.sender, Role.HotelManager)) {
            // In a real implementation, we would check if the guest belongs to this hotel
            // This would require integration with GuestVerification contract
            return true; // Simplified for this example
        }
        
        return false;
    }
    
    /**
     * @dev Set the number of required approvals for police access
     * @param _requiredApprovals Number of approvals required
     */
    function setRequiredApprovals(uint256 _requiredApprovals) external onlySystemAdmin {
        require(_requiredApprovals > 0, "Required approvals must be positive");
        requiredApprovals = _requiredApprovals;
    }
    
    /**
     * @dev Get all access requests for a guest
     * @param guestId Guest ID to query
     * @return requestIds Array of request IDs
     */
    function getGuestAccessRequests(
        string memory guestId
    ) external view returns (string[] memory requestIds) {
        return guestAccessRequests[guestId];
    }
    
    /**
     * @dev Internal function to log data access
     * @param accessor Address that accessed data
     * @param guestId Guest ID accessed
     * @param dataType Type of data accessed
     */
    function _logDataAccess(
        address accessor,
        string memory guestId,
        string memory dataType
    ) internal {
        logCounter++;
        string memory logId = _generateLogId(logCounter);
        
        accessLogs.push(AccessLog({
            logId: logId,
            accessor: accessor,
            guestId: guestId,
            accessTimestamp: block.timestamp,
            dataAccessed: dataType,
            isAuthorized: true
        }));
        
        emit DataAccessed(accessor, guestId, block.timestamp);
    }
    
    /**
     * @dev Internal function to generate request ID
     * @param counter Counter value
     * @return requestId Generated request ID
     */
    function _generateRequestId(uint256 counter) internal pure returns (string memory) {
        return string(abi.encodePacked("REQ-", _uint2str(counter)));
    }
    
    /**
     * @dev Internal function to generate log ID
     * @param counter Counter value
     * @return logId Generated log ID
     */
    function _generateLogId(uint256 counter) internal pure returns (string memory) {
        return string(abi.encodePacked("LOG-", _uint2str(counter)));
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
    
    /**
     * @dev Internal function to get all users (for admin functions)
     * @return users Array of user addresses
     */
    function _getAllUsers() internal view returns (address[] memory) {
        address[] memory users = new address[](0);
        // In a real implementation, we would need to track all users
        // This is a simplified version
        return users;
    }
}