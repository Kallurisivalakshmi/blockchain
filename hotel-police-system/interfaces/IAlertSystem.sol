// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IAlertSystem
 * @dev Interface for Alert System Contract
 * @notice Manages real-time alerts and notifications for suspicious activities
 */
interface IAlertSystem {
    
    /**
     * @dev Enum for alert types
     */
    enum AlertType {
        SuspiciousGuest,      // Suspicious guest behavior
        WantedPerson,         // Wanted person detected
        SecurityBreach,      // Security breach attempt
        DataAccess,          // Unauthorized data access attempt
        VerificationFailure, // Guest verification failure
        Emergency,           // Emergency situation
        Custom               // Custom alert type
    }
    
    /**
     * @dev Enum for alert severity levels
     */
    enum AlertSeverity {
        Low,      // Low severity - informational
        Medium,   // Medium severity - requires attention
        High,     // High severity - immediate action required
        Critical  // Critical severity - emergency response needed
    }
    
    /**
     * @dev Struct to store alert information
     */
    struct Alert {
        string alertId;               // Unique alert identifier
        AlertType alertType;         // Type of alert
        AlertSeverity severity;      // Severity level
        string guestId;              // Guest ID related to alert (if applicable)
        string hotelAddress;         // Hotel address where alert originated
        string description;          // Alert description
        uint256 timestamp;           // When alert was created
        bool isResolved;             // Whether alert has been resolved
        address resolvedBy;          // Address that resolved the alert
        uint256 resolutionTimestamp; // When alert was resolved
        string resolutionNotes;      // Notes about resolution
    }
    
    /**
     * @dev Struct to store notification preferences
     */
    struct NotificationPreferences {
        address recipient;           // Address to receive notifications
        bool emailNotifications;    // Enable email notifications
        bool smsNotifications;      // Enable SMS notifications
        bool pushNotifications;     // Enable push notifications
        AlertType[] alertTypes;     // Types of alerts to receive
        AlertSeverity minSeverity;   // Minimum severity to notify about
    }
    
    /**
     * @dev Event emitted when a new alert is created
     * @param alertId Unique alert identifier
     * @param alertType Type of alert
     * @param severity Severity level
     * @param guestId Guest ID related to alert
     * @param hotelAddress Hotel address where alert originated
     */
    event AlertCreated(
        string indexed alertId,
        uint8 alertType,
        uint8 severity,
        string indexed guestId,
        string indexed hotelAddress
    );
    
    /**
     * @dev Event emitted when an alert is resolved
     * @param alertId Unique alert identifier
     * @param resolvedBy Address that resolved the alert
     * @param timestamp Resolution timestamp
     */
    event AlertResolved(
        string indexed alertId,
        address indexed resolvedBy,
        uint256 timestamp
    );
    
    /**
     * @dev Event emitted when alert notifications are sent
     * @param alertId Unique alert identifier
     * @param recipients Array of recipient addresses
     * @param timestamp Notification timestamp
     */
    event AlertNotificationsSent(
        string indexed alertId,
        address[] recipients,
        uint256 timestamp
    );
    
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
    ) external returns (string memory alertId);
    
    /**
     * @dev Resolve an existing alert
     * @param alertId Unique alert identifier
     * @param resolutionNotes Notes about the resolution
     * @return success Whether resolution was successful
     */
    function resolveAlert(
        string memory alertId,
        string memory resolutionNotes
    ) external returns (bool success);
    
    /**
     * @dev Get alert details
     * @param alertId Unique alert identifier
     * @return alert Alert struct containing alert details
     */
    function getAlert(
        string memory alertId
    ) external view returns (Alert memory alert);
    
    /**
     * @dev Get all active alerts
     * @return alerts Array of active alert IDs
     */
    function getActiveAlerts() external view returns (string[] memory alerts);
    
    /**
     * @dev Get alerts by type
     * @param alertType Type of alerts to filter by
     * @return alertIds Array of alert IDs matching the type
     */
    function getAlertsByType(
        AlertType alertType
    ) external view returns (string[] memory alertIds);
    
    /**
     * @dev Get alerts by severity
     * @param severity Severity level to filter by
     * @return alertIds Array of alert IDs matching the severity
     */
    function getAlertsBySeverity(
        AlertSeverity severity
    ) external view returns (string[] memory alertIds);
    
    /**
     * @dev Get alerts for a specific guest
     * @param guestId Guest ID to filter by
     * @return alertIds Array of alert IDs related to the guest
     */
    function getAlertsByGuest(
        string memory guestId
    ) external view returns (string[] memory alertIds);
    
    /**
     * @dev Get alerts from a specific hotel
     * @param hotelAddress Hotel address to filter by
     * @return alertIds Array of alert IDs from the hotel
     */
    function getAlertsByHotel(
        string memory hotelAddress
    ) external view returns (string[] memory alertIds);
    
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
    ) external;
    
    /**
     * @dev Get notification preferences for an address
     * @param recipient Address to query
     * @return prefs NotificationPreferences struct
     */
    function getNotificationPreferences(
        address recipient
    ) external view returns (NotificationPreferences memory prefs);
    
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
    ) external view returns (bool shouldNotify);
    
    /**
     * @dev Get recent alerts within a time range
     * @param startTimestamp Start of time range
     * @param endTimestamp End of time range
     * @return alertIds Array of alert IDs in the time range
     */
    function getAlertsByTimeRange(
        uint256 startTimestamp,
        uint256 endTimestamp
    ) external view returns (string[] memory alertIds);
    
    /**
     * @dev Check if an alert exists
     * @param alertId Unique alert identifier
     * @return exists Whether alert exists
     */
    function alertExists(
        string memory alertId
    ) external view returns (bool exists);
}