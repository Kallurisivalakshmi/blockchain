// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IAlertSystem.sol";
import "../interfaces/IAccessControl.sol";
import "../interfaces/IGuestVerification.sol";

/**
 * @title AlertSystem
 * @dev Main contract for real-time alerts and notifications
 * @notice Manages alert creation, resolution, and notification delivery
 */
contract AlertSystem is IAlertSystem {
    
    // Mapping from alertId to Alert
    mapping(string => Alert) private alerts;
    
    // Mapping from guestId to array of alertIds
    mapping(string => string[]) private guestAlerts;
    
    // Mapping from hotelAddress to array of alertIds
    mapping(string => string[]) private hotelAlerts;
    
    // Mapping from alertType to array of alertIds
    mapping(uint8 => string[]) private alertsByType;
    
    // Mapping from severity to array of alertIds
    mapping(uint8 => string[]) private alertsBySeverity;
    
    // Mapping from recipient address to NotificationPreferences
    mapping(address => NotificationPreferences) private notificationPreferences;
    
    // Access control and guest verification contracts
    IAccessControl public accessControl;
    IGuestVerification public guestVerification;
    
    // Event counters
    uint256 private alertCounter;
    
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
     * @param _guestVerification Address of the GuestVerification contract
     */
    constructor(address _accessControl, address _guestVerification) {
        accessControl = IAccessControl(_accessControl);
        guestVerification = IGuestVerification(_guestVerification);
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
     * @dev Set the guest verification contract address
     * @param _guestVerification Address of the GuestVerification contract
     */
    function setGuestVerification(address _guestVerification) external {
        require(
            msg.sender == address(guestVerification) ||
            accessControl.hasRole(msg.sender, IAccessControl.Role.SystemAdmin),
            "Only system admin can set guest verification"
        );
        guestVerification = IGuestVerification(_guestVerification);
    }
    
    /**
     * @dev Create a new alert
     * @param guestId Guest ID related to alert (empty if not applicable)
     * @param alertType Type of alert
     * @param severity Severity level
     * @param description Alert description
     * @return alertId Unique alert identifier
     */
    function createAlert(
        string memory guestId,
        AlertType alertType,
        AlertSeverity severity,
        string memory description
    ) external override onlyAuthorized returns (string memory alertId) {
        require(bytes(description).length > 0, "Description cannot be empty");
        
        // Generate unique alert ID
        alertCounter++;
        alertId = _generateAlertId(alertCounter);
        
        // Get hotel address from guest verification if guestId is provided
        string memory hotelAddress = "";
        if (bytes(guestId).length > 0) {
            hotelAddress = _getHotelAddressForGuest(guestId);
        }
        
        // Create alert
        alerts[alertId] = Alert({
            alertId: alertId,
            alertType: alertType,
            severity: severity,
            guestId: guestId,
            hotelAddress: hotelAddress,
            description: description,
            timestamp: block.timestamp,
            isResolved: false,
            resolvedBy: address(0),
            resolutionTimestamp: 0,
            resolutionNotes: ""
        });
        
        // Add to indexes
        if (bytes(guestId).length > 0) {
            guestAlerts[guestId].push(alertId);
        }
        
        if (bytes(hotelAddress).length > 0) {
            hotelAlerts[hotelAddress].push(alertId);
        }
        
        alertsByType[uint8(alertType)].push(alertId);
        alertsBySeverity[uint8(severity)].push(alertId);
        
        // Send notifications to authorized personnel
        _sendNotifications(alertId, alertType, severity);
        
        emit AlertCreated(alertId, uint8(alertType), uint8(severity), guestId, hotelAddress);
        
        return alertId;
    }
    
    /**
     * @dev Resolve an existing alert
     * @param alertId Unique alert identifier
     * @param resolutionNotes Notes about the resolution
     * @return success Whether resolution was successful
     */
    function resolveAlert(
        string memory alertId,
        string memory resolutionNotes
    ) external override onlyAuthorized returns (bool success) {
        Alert storage alert = alerts[alertId];
        require(alert.alertId != "", "Alert does not exist");
        require(!alert.isResolved, "Alert already resolved");
        
        alert.isResolved = true;
        alert.resolvedBy = msg.sender;
        alert.resolutionTimestamp = block.timestamp;
        alert.resolutionNotes = resolutionNotes;
        
        emit AlertResolved(alertId, msg.sender, block.timestamp);
        
        return true;
    }
    
    /**
     * @dev Get alert details
     * @param alertId Unique alert identifier
     * @return alert Alert struct containing alert details
     */
    function getAlert(
        string memory alertId
    ) external view override returns (Alert memory alert) {
        require(alerts[alertId].alertId != "", "Alert does not exist");
        return alerts[alertId];
    }
    
    /**
     * @dev Get all active alerts
     * @return alerts Array of active alert IDs
     */
    function getActiveAlerts() external view override returns (string[] memory alerts) {
        uint256 counter = 0;
        
        // Count active alerts first
        for (uint256 i = 1; i <= alertCounter; i++) {
            string memory alertId = _generateAlertId(i);
            if (alerts[alertId].alertId != "" && !alerts[alertId].isResolved) {
                counter++;
            }
        }
        
        // Allocate array and fill it
        string[] memory activeAlerts = new string[](counter);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= alertCounter; i++) {
            string memory alertId = _generateAlertId(i);
            if (alerts[alertId].alertId != "" && !alerts[alertId].isResolved) {
                activeAlerts[index] = alertId;
                index++;
            }
        }
        
        return activeAlerts;
    }
    
    /**
     * @dev Get alerts by type
     * @param alertType Type of alerts to filter by
     * @return alertIds Array of alert IDs matching the type
     */
    function getAlertsByType(
        AlertType alertType
    ) external view override returns (string[] memory alertIds) {
        return alertsByType[uint8(alertType)];
    }
    
    /**
     * @dev Get alerts by severity
     * @param severity Severity level to filter by
     * @return alertIds Array of alert IDs matching the severity
     */
    function getAlertsBySeverity(
        AlertSeverity severity
    ) external view override returns (string[] memory alertIds) {
        return alertsBySeverity[uint8(severity)];
    }
    
    /**
     * @dev Get alerts for a specific guest
     * @param guestId Guest ID to filter by
     * @return alertIds Array of alert IDs related to the guest
     */
    function getAlertsByGuest(
        string memory guestId
    ) external view override returns (string[] memory alertIds) {
        return guestAlerts[guestId];
    }
    
    /**
     * @dev Get alerts from a specific hotel
     * @param hotelAddress Hotel address to filter by
     * @return alertIds Array of alert IDs from the hotel
     */
    function getAlertsByHotel(
        string memory hotelAddress
    ) external view override returns (string[] memory alertIds) {
        return hotelAlerts[hotelAddress];
    }
    
    /**
     * @dev Set notification preferences for an address
     * @param recipient Address to receive notifications
     * @param emailNotifications Enable email notifications
     * @param smsNotifications Enable SMS notifications
     * @param pushNotifications Enable push notifications
     * @param alertTypes Types of alerts to receive
     * @param minSeverity Minimum severity to notify about
     */
    function setNotificationPreferences(
        address recipient,
        bool emailNotifications,
        bool smsNotifications,
        bool pushNotifications,
        AlertType[] memory alertTypes,
        AlertSeverity minSeverity
    ) external override onlyAuthorized {
        // Only system admin or the recipient themselves can set preferences
        require(
            msg.sender == recipient ||
            accessControl.hasRole(msg.sender, IAccessControl.Role.SystemAdmin),
            "Only recipient or system admin can set notification preferences"
        );
        
        notificationPreferences[recipient] = NotificationPreferences({
            recipient: recipient,
            emailNotifications: emailNotifications,
            smsNotifications: smsNotifications,
            pushNotifications: pushNotifications,
            alertTypes: alertTypes,
            minSeverity: minSeverity
        });
    }
    
    /**
     * @dev Get notification preferences for an address
     * @param recipient Address to query
     * @return prefs NotificationPreferences struct
     */
    function getNotificationPreferences(
        address recipient
    ) external view override returns (NotificationPreferences memory prefs) {
        return notificationPreferences[recipient];
    }
    
    /**
     * @dev Check if an address should receive notifications for a specific alert
     * @param recipient Address to check
     * @param alertType Type of alert
     * @param severity Severity level
     * @return shouldNotify Whether the address should be notified
     */
    function shouldNotify(
        address recipient,
        AlertType alertType,
        AlertSeverity severity
    ) external view override returns (bool shouldNotify) {
        NotificationPreferences memory prefs = notificationPreferences[recipient];
        
        // Check if recipient has preferences set
        if (prefs.recipient == address(0)) {
            return false;
        }
        
        // Check minimum severity
        if (uint8(severity) < uint8(prefs.minSeverity)) {
            return false;
        }
        
        // Check if alert type is in the list of types to receive
        bool typeMatch = false;
        for (uint256 i = 0; i < prefs.alertTypes.length; i++) {
            if (prefs.alertTypes[i] == alertType) {
                typeMatch = true;
                break;
            }
        }
        
        // If no specific types are selected, assume all types
        if (prefs.alertTypes.length == 0) {
            typeMatch = true;
        }
        
        // Check if any notification method is enabled
        bool hasNotificationMethod = prefs.emailNotifications || 
                                    prefs.smsNotifications || 
                                    prefs.pushNotifications;
        
        return typeMatch && hasNotificationMethod;
    }
    
    /**
     * @dev Get recent alerts within a time range
     * @param startTimestamp Start of time range
     * @param endTimestamp End of time range
     * @return alertIds Array of alert IDs in the time range
     */
    function getAlertsByTimeRange(
        uint256 startTimestamp,
        uint256 endTimestamp
    ) external view override returns (string[] memory alertIds) {
        uint256 counter = 0;
        
        // Count alerts in time range first
        for (uint256 i = 1; i <= alertCounter; i++) {
            string memory alertId = _generateAlertId(i);
            if (alerts[alertId].alertId != "" && 
                alerts[alertId].timestamp >= startTimestamp &&
                alerts[alertId].timestamp <= endTimestamp) {
                counter++;
            }
        }
        
        // Allocate array and fill it
        string[] memory result = new string[](counter);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= alertCounter; i++) {
            string memory alertId = _generateAlertId(i);
            if (alerts[alertId].alertId != "" && 
                alerts[alertId].timestamp >= startTimestamp &&
                alerts[alertId].timestamp <= endTimestamp) {
                result[index] = alertId;
                index++;
            }
        }
        
        return result;
    }
    
    /**
     * @dev Check if an alert exists
     * @param alertId Unique alert identifier
     * @return exists Whether alert exists
     */
    function alertExists(
        string memory alertId
    ) external view override returns (bool exists) {
        return alerts[alertId].alertId != "";
    }
    
    /**
     * @dev Internal function to send notifications
     * @param alertId Alert ID
     * @param alertType Type of alert
     * @param severity Severity level
     */
    function _sendNotifications(
        string memory alertId,
        AlertType alertType,
        AlertSeverity severity
    ) internal {
        address[] memory recipients = new address[](0);
        
        // In a real implementation, we would iterate through all users
        // and check their notification preferences
        // For this example, we'll emit the event with an empty array
        
        emit AlertNotificationsSent(alertId, recipients, block.timestamp);
    }
    
    /**
     * @dev Internal function to get hotel address for a guest
     * @param guestId Guest ID
     * @return hotelAddress Hotel address
     */
    function _getHotelAddressForGuest(
        string memory guestId
    ) internal view returns (string memory hotelAddress) {
        try guestVerification.getGuestHotel(guestId) returns (address _hotelAddress) {
            return _convertAddressToString(_hotelAddress);
        } catch {
            return "";
        }
    }
    
    /**
     * @dev Internal function to convert address to string
     * @param _address Address to convert
     * @return str String representation
     */
    function _convertAddressToString(
        address _address
    ) internal pure returns (string memory) {
        bytes32 temp = bytes32(uint256(uint160(_address)));
        bytes memory bytesStr = abi.encodePacked(temp);
        string memory str = string(bytesStr);
        return str;
    }
    
    /**
     * @dev Internal function to generate alert ID
     * @param counter Counter value
     * @return alertId Generated alert ID
     */
    function _generateAlertId(uint256 counter) internal pure returns (string memory) {
        return string(abi.encodePacked("ALERT-", _uint2str(counter)));
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