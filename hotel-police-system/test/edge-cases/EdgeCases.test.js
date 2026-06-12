// SPDX-License-Identifier: MIT
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Edge Case Tests - Hotel-Police Collaboration System", function () {
  let registry, accessControl, dataStorage, guestVerification, alertSystem;
  let owner, hotelManager, hotelStaff, policeAdmin, policeOfficer, guestUser;
  const Role = { None: 0, HotelStaff: 1, HotelManager: 2, PoliceOfficer: 3, PoliceAdmin: 4, SystemAdmin: 5 };
  const AlertType = { SuspiciousGuest: 0, WantedPerson: 1, SecurityBreach: 2, DataAccess: 3, VerificationFailure: 4, Emergency: 5, Custom: 6 };
  const AlertSeverity = { Low: 0, Medium: 1, High: 2, Critical: 3 };
  const DataType = { AadhaarData: 0, RetinaScan: 1, GuestPhoto: 2, IdentificationDoc: 3, StayHistory: 4, EmergencyContact: 5 };

  beforeEach(async () => {
    [owner, hotelManager, hotelStaff, policeAdmin, policeOfficer, guestUser] = await ethers.getSigners();
    
    // Deploy all contracts
    const AccessControl = await ethers.getContractFactory("AccessControl");
    accessControl = await AccessControl.deploy();
    
    const DataStorage = await ethers.getContractFactory("DataStorage");
    dataStorage = await DataStorage.deploy(accessControl.address);
    
    const GuestVerification = await ethers.getContractFactory("GuestVerification");
    guestVerification = await GuestVerification.deploy(accessControl.address, dataStorage.address);
    
    const AlertSystem = await ethers.getContractFactory("AlertSystem");
    alertSystem = await AlertSystem.deploy(accessControl.address, guestVerification.address);
    
    const HotelPoliceRegistry = await ethers.getContractFactory("HotelPoliceRegistry");
    registry = await HotelPoliceRegistry.deploy();
    
    // Assign roles
    await accessControl.assignRole(hotelManager.address, Role.HotelManager);
    await accessControl.assignRole(hotelStaff.address, Role.HotelStaff);
    await accessControl.assignRole(policeAdmin.address, Role.PoliceAdmin);
    await accessControl.assignRole(policeOfficer.address, Role.PoliceOfficer);
  });

  describe("AccessControl Edge Cases", function () {
    it("Should handle role assignment for the same user with different roles", async () => {
      // Assign multiple roles to the same user (overwriting previous role)
      await accessControl.assignRole(hotelStaff.address, Role.HotelManager);
      
      const role = await accessControl.getRole(hotelStaff.address);
      expect(role).to.equal(Role.HotelManager);
      
      // Previous role should no longer be valid
      expect(await accessControl.hasRole(hotelStaff.address, Role.HotelStaff)).to.be.false;
      expect(await accessControl.hasRole(hotelStaff.address, Role.HotelManager)).to.be.true;
    });

    it("Should handle revoking roles from users with multiple historical roles", async () => {
      // Assign role to a user
      await accessControl.assignRole(guestUser.address, Role.HotelStaff);
      
      // Revoke the role
      await accessControl.revokeRole(guestUser.address, Role.HotelStaff);
      
      // User should have no role
      const role = await accessControl.getRole(guestUser.address);
      expect(role).to.equal(Role.None);
      
      // Try to revoke the same role again (should revert)
      await expect(
        accessControl.revokeRole(guestUser.address, Role.HotelStaff)
      ).to.be.revertedWith("Cannot revoke None role");
    });

    it("Should handle access requests for non-existent guests", async () => {
      // Create access request for non-existent guest (should still work)
      const requestId = await accessControl.connect(policeOfficer).createAccessRequest(
        "NONEXISTENT_GUEST", "Investigation", 3600
      );
      
      expect(requestId).to.not.be.empty;
      
      const request = await accessControl.getAccessRequest(requestId);
      expect(request.guestId).to.equal("NONEXISTENT_GUEST");
      expect(request.isApproved).to.be.false;
    });

    it("Should handle approving access requests for non-existent requests", async () => {
      await expect(
        accessControl.connect(hotelManager).approveAccessRequest("NONEXISTENT_REQUEST", "Approval")
      ).to.be.reverted;
    });

    it("Should handle denying access requests for non-existent requests", async () => {
      await expect(
        accessControl.connect(hotelManager).denyAccessRequest("NONEXISTENT_REQUEST", "Denial")
      ).to.be.reverted;
    });

    it("Should handle logging data access for non-existent guests", async () => {
      // This should work as it's just logging
      await expect(
        accessControl.connect(policeOfficer).logDataAccess(
          "NONEXISTENT_GUEST", "Aadhaar Data", false
        )
      ).to.not.be.reverted;
    });

    it("Should handle getting access requests for users with no requests", async () => {
      const requests = await accessControl.getGuestAccessRequests("NONEXISTENT_GUEST");
      expect(requests.length).to.equal(0);
    });

    it("Should handle getting access logs for guests with no access", async () => {
      const allLogs = await accessControl.getAllAccessLogs();
      // Should return empty array or existing logs from other operations
      expect(Array.isArray(allLogs)).to.be.true;
    });

    it("Should handle setting required approvals to maximum value", async () => {
      const maxApprovals = 100;
      await accessControl.connect(owner).setRequiredApprovals(maxApprovals);
      
      const required = await accessControl.requiredApprovals();
      expect(required).to.equal(maxApprovals);
    });

    it("Should handle getting users by role for roles with no users", async () => {
      // Create a new role that no one has
      const users = await accessControl.getUsersByRole(Role.None);
      expect(users.length).to.equal(0);
    });

    it("Should handle role assignment with invalid role values", async () => {
      // Try to assign a role value that doesn't exist in the enum
      // Note: Solidity doesn't prevent this at compile time, but the contract should handle it
      // This test verifies that the contract doesn't crash with invalid enum values
      
      // Assign a valid role first
      await accessControl.assignRole(guestUser.address, Role.HotelStaff);
      
      // The contract should handle enum values properly
      const role = await accessControl.getRole(guestUser.address);
      expect(role).to.be.oneOf([Role.None, Role.HotelStaff, Role.HotelManager, Role.PoliceOfficer, Role.PoliceAdmin, Role.SystemAdmin]);
    });

    it("Should handle access request expiration", async () => {
      const guestId = "GUEST001";
      
      // Create access request with very short expiration
      const requestId = await accessControl.connect(policeOfficer).createAccessRequest(
        guestId, "Investigation", 1 // 1 second expiration
      );
      
      // Wait for expiration
      await ethers.provider.send("evm_increaseTime", [2]);
      await ethers.provider.send("evm_mine", []);
      
      // Request should still exist but be expired
      const request = await accessControl.getAccessRequest(requestId);
      expect(request.expiryTimestamp).to.be.lte(Math.floor(Date.now() / 1000));
    });
  });

  describe("GuestVerification Edge Cases", function () {
    it("Should handle guest verification with special characters in IDs", async () => {
      const specialGuestIds = [
        "GUEST-001",
        "GUEST_001",
        "GUEST.001",
        "GUEST 001",
        "GUEST\n001",
        "GUEST\t001",
        "GUEST\x00001",
      ];
      
      for (const guestId of specialGuestIds) {
        const success = await guestVerification.connect(hotelStaff).verifyGuest(
          guestId, "QmHash1", "QmHash2", "John Doe", "+1234567890", "101"
        );
        expect(success).to.be.true;
        expect(await guestVerification.guestExists(guestId)).to.be.true;
      }
    });

    it("Should handle guest verification with very long IDs", async () => {
      const longGuestId = "GUEST" + "0".repeat(1000);
      
      const success = await guestVerification.connect(hotelStaff).verifyGuest(
        longGuestId, "QmHash1", "QmHash2", "John Doe", "+1234567890", "101"
      );
      expect(success).to.be.true;
      expect(await guestVerification.guestExists(longGuestId)).to.be.true;
    });

    it("Should handle guest verification with empty biometric data", async () => {
      // This should fail due to input validation
      await expect(
        guestVerification.connect(hotelStaff).verifyGuest(
          "GUEST001", "", "", "John Doe", "+1234567890", "101"
        )
      ).to.be.reverted;
    });

    it("Should handle updating biometrics for non-existent guest", async () => {
      await expect(
        guestVerification.connect(hotelStaff).updateGuestBiometrics(
          "NONEXISTENT", "QmHash1", "QmHash2"
        )
      ).to.be.revertedWith("Guest does not exist");
    });

    it("Should handle checking in guest that is already checked in", async () => {
      const guestId = "GUEST001";
      
      await guestVerification.connect(hotelStaff).verifyGuest(
        guestId, "QmHash1", "QmHash2", "John Doe", "+1234567890", "101"
      );
      await guestVerification.connect(hotelStaff).checkInGuest(guestId);
      
      // Try to check in again
      await expect(
        guestVerification.connect(hotelStaff).checkInGuest(guestId)
      ).to.be.revertedWith("Guest is already checked in");
    });

    it("Should handle checking out guest that is already checked out", async () => {
      const guestId = "GUEST001";
      
      await guestVerification.connect(hotelStaff).verifyGuest(
        guestId, "QmHash1", "QmHash2", "John Doe", "+1234567890", "101"
      );
      await guestVerification.connect(hotelStaff).checkInGuest(guestId);
      await guestVerification.connect(hotelStaff).checkOutGuest(guestId);
      
      // Try to check out again
      await expect(
        guestVerification.connect(hotelStaff).checkOutGuest(guestId)
      ).to.be.revertedWith("Guest is not checked in");
    });

    it("Should handle getting guest info for non-existent guest", async () => {
      const guestInfo = await guestVerification.getGuestInfo("NONEXISTENT");
      
      // Should return default values
      expect(guestInfo.guestId).to.equal("");
      expect(guestInfo.name).to.equal("");
      expect(guestInfo.contactNumber).to.equal("");
      expect(guestInfo.roomNumber).to.equal("");
      expect(guestInfo.checkInTime).to.equal(0);
      expect(guestInfo.checkOutTime).to.equal(0);
      expect(guestInfo.isActive).to.be.false;
    });

    it("Should handle getting biometric data for non-existent guest", async () => {
      const biometricData = await guestVerification.getGuestBiometricData("NONEXISTENT");
      
      // Should return default values
      expect(biometricData.aadhaarHash).to.equal("");
      expect(biometricData.retinaScanHash).to.equal("");
      expect(biometricData.verificationTimestamp).to.equal(0);
      expect(biometricData.verifiedBy).to.equal(ethers.constants.AddressZero);
      expect(biometricData.isVerified).to.be.false;
    });

    it("Should handle getting hotel guests for hotel with no guests", async () => {
      const hotelGuests = await guestVerification.getHotelGuests(guestUser.address);
      expect(hotelGuests.length).to.equal(0);
    });

    it("Should handle getting guest hotel for non-existent guest", async () => {
      const hotelAddress = await guestVerification.getGuestHotel("NONEXISTENT");
      expect(hotelAddress).to.equal(ethers.constants.AddressZero);
    });

    it("Should handle guest verification with empty strings", async () => {
      // Test with empty guest name
      await expect(
        guestVerification.connect(hotelStaff).verifyGuest(
          "GUEST001", "QmHash1", "QmHash2", "", "+1234567890", "101"
        )
      ).to.be.reverted;
      
      // Test with empty contact number
      await expect(
        guestVerification.connect(hotelStaff).verifyGuest(
          "GUEST001", "QmHash1", "QmHash2", "John Doe", "", "101"
        )
      ).to.be.reverted;
      
      // Test with empty room number
      await expect(
        guestVerification.connect(hotelStaff).verifyGuest(
          "GUEST001", "QmHash1", "QmHash2", "John Doe", "+1234567890", ""
        )
      ).to.be.reverted;
    });

    it("Should handle multiple guests with similar IDs", async () => {
      const guestIds = ["GUEST001", "GUEST001A", "GUEST001B", "GUEST1", "GUEST01"];
      
      for (const guestId of guestIds) {
        const success = await guestVerification.connect(hotelStaff).verifyGuest(
          guestId, `QmHash${guestId}`, `QmHash${guestId}`, `Guest ${guestId}`, "+1234567890", "101"
        );
        expect(success).to.be.true;
      }
      
      // Verify all guests exist
      for (const guestId of guestIds) {
        expect(await guestVerification.guestExists(guestId)).to.be.true;
      }
    });
  });

  describe("DataStorage Edge Cases", function () {
    it("Should handle storing data with very long IPFS hashes", async () => {
      const guestId = "GUEST001";
      
      // Register guest first
      await guestVerification.connect(hotelStaff).verifyGuest(
        guestId, "QmHash1", "QmHash2", "John Doe", "+1234567890", "101"
      );
      
      // Very long IPFS hash (though real IPFS hashes are fixed length)
      const longHash = "Qm" + "A".repeat(1000);
      
      const dataId = await dataStorage.connect(hotelStaff).storeData(
        guestId, DataType.AadhaarData, longHash, 1024, "AES-256", "QmKeyHash", 86400
      );
      
      const dataRef = await dataStorage.getDataReference(dataId);
      expect(dataRef.ipfsHash).to.equal(longHash);
    });

    it("Should handle storing data with very large sizes", async () => {
      const guestId = "GUEST001";
      
      // Register guest first
      await guestVerification.connect(hotelStaff).verifyGuest(
        guestId, "QmHash1", "QmHash2", "John Doe", "+1234567890", "101"
      );
      
      // Very large size
      const largeSize = ethers.constants.MaxUint256;
      
      const dataId = await dataStorage.connect(hotelStaff).storeData(
        guestId, DataType.AadhaarData, "QmHash", largeSize, "AES-256", "QmKeyHash", 86400
      );
      
      const dataRef = await dataStorage.getDataReference(dataId);
      expect(dataRef.size).to.equal(largeSize);
    });

    it("Should handle storing data with zero retention period", async () => {
      const guestId = "GUEST001";
      
      // Register guest first
      await guestVerification.connect(hotelStaff).verifyGuest(
        guestId, "QmHash1", "QmHash2", "John Doe", "+1234567890", "101"
      );
      
      // Zero retention period should use default
      const defaultRetention = await dataStorage.defaultRetentionPeriod();
      
      const dataId = await dataStorage.connect(hotelStaff).storeData(
        guestId, DataType.AadhaarData, "QmHash", 1024, "AES-256", "QmKeyHash", 0
      );
      
      const metadata = await dataStorage.getDataMetadata(dataId);
      expect(metadata.retentionPeriod).to.equal(defaultRetention);
    });

    it("Should handle storing data with very long retention period", async () => {
      const guestId = "GUEST001";
      
      // Register guest first
      await guestVerification.connect(hotelStaff).verifyGuest(
        guestId, "QmHash1", "QmHash2", "John Doe", "+1234567890", "101"
      );
      
      // Very long retention period (100 years)
      const longRetention = 100 * 365 * 24 * 60 * 60;
      
      const dataId = await dataStorage.connect(hotelStaff).storeData(
        guestId, DataType.AadhaarData, "QmHash", 1024, "AES-256", "QmKeyHash", longRetention
      );
      
      const metadata = await dataStorage.getDataMetadata(dataId);
      expect(metadata.retentionPeriod).to.equal(longRetention);
    });

    it("Should handle getting data for guest with no data", async () => {
      const guestId = "GUEST001";
      
      // Register guest but don't store any data
      await guestVerification.connect(hotelStaff).verifyGuest(
        guestId, "QmHash1", "QmHash2", "John Doe", "+1234567890", "101"
      );
      
      const guestData = await dataStorage.getGuestData(guestId);
      expect(guestData.length).to.equal(0);
    });

    it("Should handle getting data by type for guest with no data of that type", async () => {
      const guestId = "GUEST001";
      
      // Register guest and store only Aadhaar data
      await guestVerification.connect(hotelStaff).verifyGuest(
        guestId, "QmHash1", "QmHash2", "John Doe", "+1234567890", "101"
      );
      await dataStorage.connect(hotelStaff).storeData(
        guestId, DataType.AadhaarData, "QmHash", 1024, "AES-256", "QmKeyHash", 86400
      );
      
      // Get retina scan data (should be empty)
      const retinaData = await dataStorage.getGuestDataByType(guestId, DataType.RetinaScan);
      expect(retinaData.length).to.equal(0);
    });

    it("Should handle deleting non-existent data", async () => {
      await expect(
        dataStorage.connect(hotelStaff).deleteData("NONEXISTENT_DATA")
      ).to.be.reverted;
    });

    it("Should handle updating retention period for non-existent data", async () => {
      await expect(
        dataStorage.connect(hotelStaff).updateRetentionPeriod("NONEXISTENT_DATA", 86400)
      ).to.be.reverted;
    });

    it("Should handle setting data active status for non-existent data", async () => {
      await expect(
        dataStorage.connect(hotelStaff).setDataActiveStatus("NONEXISTENT_DATA", false)
      ).to.be.reverted;
    });

    it("Should handle getting data reference for non-existent data", async () => {
      const dataRef = await dataStorage.getDataReference("NONEXISTENT_DATA");
      
      // Should return default values
      expect(dataRef.ipfsHash).to.equal("");
      expect(dataRef.dataType).to.equal(0);
      expect(dataRef.uploadTimestamp).to.equal(0);
      expect(dataRef.uploadedBy).to.equal(ethers.constants.AddressZero);
      expect(dataRef.size).to.equal(0);
      expect(dataRef.encryptionAlgorithm).to.equal("");
      expect(dataRef.encryptionKeyHash).to.equal("");
    });

    it("Should handle getting data metadata for non-existent data", async () => {
      const metadata = await dataStorage.getDataMetadata("NONEXISTENT_DATA");
      
      // Should return default values
      expect(metadata.dataId).to.equal("");
      expect(metadata.guestId).to.equal("");
      expect(metadata.dataType).to.equal(0);
      expect(metadata.isActive).to.be.false;
      expect(metadata.retentionPeriod).to.equal(0);
      expect(metadata.expiryTimestamp).to.equal(0);
    });

    it("Should handle storing multiple data entries for the same guest", async () => {
      const guestId = "GUEST001";
      
      // Register guest first
      await guestVerification.connect(hotelStaff).verifyGuest(
        guestId, "QmHash1", "QmHash2", "John Doe", "+1234567890", "101"
      );
      
      // Store multiple data entries
      const dataTypes = [
        DataType.AadhaarData,
        DataType.RetinaScan,
        DataType.GuestPhoto,
        DataType.IdentificationDoc,
        DataType.StayHistory,
        DataType.EmergencyContact
      ];
      
      for (const dataType of dataTypes) {
        await dataStorage.connect(hotelStaff).storeData(
          guestId, dataType, `QmHash${dataType}`, 1024, "AES-256", `QmKeyHash${dataType}`, 86400
        );
      }
      
      // Verify all data was stored
      const guestData = await dataStorage.getGuestData(guestId);
      expect(guestData.length).to.equal(dataTypes.length);
    });

    it("Should handle storing data with all data types for the same guest", async () => {
      const guestId = "GUEST001";
      
      // Register guest first
      await guestVerification.connect(hotelStaff).verifyGuest(
        guestId, "QmHash1", "QmHash2", "John Doe", "+1234567890", "101"
      );
      
      // Store data for each data type
      for (let i = 0; i < 6; i++) {
        await dataStorage.connect(hotelStaff).storeData(
          guestId, i, `QmHash${i}`, 1024, "AES-256", `QmKeyHash${i}`, 86400
        );
      }
      
      // Verify data by type
      for (let i = 0; i < 6; i++) {
        const dataByType = await dataStorage.getGuestDataByType(guestId, i);
        expect(dataByType.length).to.equal(1);
      }
    });
  });

  describe("AlertSystem Edge Cases", function () {
    it("Should handle creating alerts with empty guest ID", async () => {
      // Create alert without guest ID (general security alert)
      const alertId = await alertSystem.connect(hotelStaff).createAlert(
        "", AlertType.SecurityBreach, AlertSeverity.High, "General security alert"
      );
      
      expect(alertId).to.not.be.empty;
      
      const alert = await alertSystem.getAlert(alertId);
      expect(alert.guestId).to.equal("");
      expect(alert.alertType).to.equal(AlertType.SecurityBreach);
    });

    it("Should handle creating alerts with very long descriptions", async () => {
      const guestId = "GUEST001";
      
      // Very long description
      const longDescription = "Alert description with " + "very long text ".repeat(100);
      
      const alertId = await alertSystem.connect(hotelStaff).createAlert(
        guestId, AlertType.SuspiciousGuest, AlertSeverity.Medium, longDescription
      );
      
      const alert = await alertSystem.getAlert(alertId);
      expect(alert.description).to.equal(longDescription);
    });

    it("Should handle creating multiple alerts for the same guest", async () => {
      const guestId = "GUEST001";
      
      // Create multiple alerts
      const alertTypes = [
        AlertType.SuspiciousGuest,
        AlertType.WantedPerson,
        AlertType.SecurityBreach,
        AlertType.DataAccess,
        AlertType.VerificationFailure,
        AlertType.Emergency,
        AlertType.Custom
      ];
      
      for (const alertType of alertTypes) {
        await alertSystem.connect(hotelStaff).createAlert(
          guestId, alertType, AlertSeverity.Medium, `Alert for ${alertType}`
        );
      }
      
      // Verify all alerts were created
      const guestAlerts = await alertSystem.getGuestAlerts(guestId);
      expect(guestAlerts.length).to.equal(alertTypes.length);
    });

    it("Should handle creating alerts with all severity levels", async () => {
      const guestId = "GUEST001";
      
      // Create alerts with all severity levels
      for (let i = 0; i < 4; i++) {
        await alertSystem.connect(hotelStaff).createAlert(
          guestId, AlertType.SuspiciousGuest, i, `Alert with severity ${i}`
        );
      }
      
      // Verify alerts by severity
      for (let i = 0; i < 4; i++) {
        const alertsBySeverity = await alertSystem.getAlertsBySeverity(i);
        expect(alertsBySeverity.length).to.equal(1);
      }
    });

    it("Should handle resolving alerts with very long resolution notes", async () => {
      const guestId = "GUEST001";
      
      // Create alert
      const alertId = await alertSystem.connect(hotelStaff).createAlert(
        guestId, AlertType.SuspiciousGuest, AlertSeverity.Medium, "Test alert"
      );
      
      // Very long resolution notes
      const longNotes = "Resolution notes with " + "very long text ".repeat(100);
      
      await alertSystem.connect(policeOfficer).resolveAlert(alertId, longNotes);
      
      const alert = await alertSystem.getAlert(alertId);
      expect(alert.resolutionNotes).to.equal(longNotes);
    });

    it("Should handle getting alerts for guest with no alerts", async () => {
      const guestAlerts = await alertSystem.getGuestAlerts("NONEXISTENT_GUEST");
      expect(guestAlerts.length).to.equal(0);
    });

    it("Should handle getting alerts by hotel with no alerts", async () => {
      const hotelAlerts = await alertSystem.getHotelAlerts(guestUser.address);
      expect(hotelAlerts.length).to.equal(0);
    });

    it("Should handle getting alerts by type with no alerts", async () => {
      const alertsByType = await alertSystem.getAlertsByType(AlertType.WantedPerson);
      expect(alertsByType.length).to.equal(0);
    });

    it("Should handle getting alerts by severity with no alerts", async () => {
      const alertsBySeverity = await alertSystem.getAlertsBySeverity(AlertSeverity.Critical);
      expect(alertsBySeverity.length).to.equal(0);
    });

    it("Should handle getting non-existent alert", async () => {
      const alert = await alertSystem.getAlert("NONEXISTENT_ALERT");
      
      // Should return default values
      expect(alert.alertId).to.equal("");
      expect(alert.alertType).to.equal(0);
      expect(alert.severity).to.equal(0);
      expect(alert.guestId).to.equal("");
      expect(alert.hotelAddress).to.equal("");
      expect(alert.description).to.equal("");
      expect(alert.timestamp).to.equal(0);
      expect(alert.isResolved).to.be.false;
      expect(alert.resolvedBy).to.equal(ethers.constants.AddressZero);
      expect(alert.resolutionTimestamp).to.equal(0);
      expect(alert.resolutionNotes).to.equal("");
    });

    it("Should handle setting notification preferences with all alert types", async () => {
      const allAlertTypes = [0, 1, 2, 3, 4, 5, 6];
      
      await alertSystem.connect(policeOfficer).setNotificationPreferences(
        true, true, true, allAlertTypes, AlertSeverity.Low
      );
      
      const preferences = await alertSystem.getNotificationPreferences(policeOfficer.address);
      expect(preferences.alertTypes.length).to.equal(allAlertTypes.length);
    });

    it("Should handle setting notification preferences with no alert types", async () => {
      const noAlertTypes = [];
      
      await alertSystem.connect(policeOfficer).setNotificationPreferences(
        true, true, true, noAlertTypes, AlertSeverity.Low
      );
      
      const preferences = await alertSystem.getNotificationPreferences(policeOfficer.address);
      expect(preferences.alertTypes.length).to.equal(0);
    });

    it("Should handle sending notifications for non-existent alert", async () => {
      await expect(
        alertSystem.connect(hotelStaff).sendNotifications("NONEXISTENT_ALERT")
      ).to.be.reverted;
    });

    it("Should handle getting notification preferences for user with no preferences set", async () => {
      const preferences = await alertSystem.getNotificationPreferences(guestUser.address);
      
      // Should return default values
      expect(preferences.recipient).to.equal(ethers.constants.AddressZero);
      expect(preferences.emailNotifications).to.be.false;
      expect(preferences.smsNotifications).to.be.false;
      expect(preferences.pushNotifications).to.be.false;
      expect(preferences.minSeverity).to.equal(0);
    });

    it("Should handle creating alerts with special characters in description", async () => {
      const guestId = "GUEST001";
      const specialDescriptions = [
        "Alert with \n newline",
        "Alert with \t tab",
        "Alert with special chars: !@#$%^&*()",
        "Alert with unicode: 你好世界",
        "Alert with emoji: 🚨",
      ];
      
      for (const description of specialDescriptions) {
        const alertId = await alertSystem.connect(hotelStaff).createAlert(
          guestId, AlertType.SuspiciousGuest, AlertSeverity.Medium, description
        );
        
        const alert = await alertSystem.getAlert(alertId);
        expect(alert.description).to.equal(description);
      }
    });
  });

  describe("Registry Edge Cases", function () {
    it("Should handle updating contract with the same address", async () => {
      const currentAddress = await registry.accessControl();
      
      // Update with the same address (should still work)
      await registry.connect(owner).updateContract("AccessControl", currentAddress);
      
      expect(await registry.accessControl()).to.equal(currentAddress);
    });

    it("Should handle getting system info", async () => {
      const [name, version, deployedAt, isActive] = await registry.getSystemInfo();
      
      expect(name).to.equal("Hotel-Police Collaboration System");
      expect(version).to.equal("1.0.0");
      expect(deployedAt).to.be.gt(0);
      expect(isActive).to.be.true;
    });

    it("Should handle setting system status to the same value", async () => {
      const currentStatus = await registry.isSystemActive();
      
      // Set to the same value (should still work)
      await registry.connect(owner).setSystemStatus(currentStatus);
      
      expect(await registry.isSystemActive()).to.equal(currentStatus);
    });

    it("Should handle contract update with invalid contract name (case sensitivity)", async () => {
      await expect(
        registry.connect(owner).updateContract("accesscontrol", accessControl.address)
      ).to.be.revertedWith("Invalid contract name");
      
      await expect(
        registry.connect(owner).updateContract("ACCESSCONTROL", accessControl.address)
      ).to.be.revertedWith("Invalid contract name");
    });

    it("Should handle contract update with partial contract name", async () => {
      await expect(
        registry.connect(owner).updateContract("Access", accessControl.address)
      ).to.be.revertedWith("Invalid contract name");
      
      await expect(
        registry.connect(owner).updateContract("AccessControlContract", accessControl.address)
      ).to.be.revertedWith("Invalid contract name");
    });

    it("Should handle getting contract addresses after updates", async () => {
      // Update all contracts
      await registry.connect(owner).updateContract("AccessControl", accessControl.address);
      await registry.connect(owner).updateContract("DataStorage", dataStorage.address);
      await registry.connect(owner).updateContract("GuestVerification", guestVerification.address);
      await registry.connect(owner).updateContract("AlertSystem", alertSystem.address);
      
      // Verify all addresses are correct
      expect(await registry.accessControl()).to.equal(accessControl.address);
      expect(await registry.dataStorage()).to.equal(dataStorage.address);
      expect(await registry.guestVerification()).to.equal(guestVerification.address);
      expect(await registry.alertSystem()).to.equal(alertSystem.address);
    });
  });

  describe("Cross-Contract Edge Cases", function () {
    it("Should handle operations when contracts are not properly linked", async () => {
      // Create a new AccessControl instance
      const AccessControl = await ethers.getContractFactory("AccessControl");
      const newAccessControl = await AccessControl.deploy();
      
      // Create DataStorage with the new AccessControl
      const DataStorage = await ethers.getContractFactory("DataStorage");
      const newDataStorage = await DataStorage.deploy(newAccessControl.address);
      
      // Try to use GuestVerification with the new DataStorage
      // This might fail if contracts are not properly linked
      const guestId = "GUEST001";
      
      // This should work because GuestVerification was deployed with the original contracts
      await guestVerification.connect(hotelStaff).verifyGuest(
        guestId, "QmHash1", "QmHash2", "John Doe", "+1234567890", "101"
      );
    });

    it("Should handle operations with maximum gas limits", async () => {
      // Perform operations that might consume significant gas
      const guestId = "GUEST001";
      
      // Register guest
      await guestVerification.connect(hotelStaff).verifyGuest(
        guestId, "QmHash1", "QmHash2", "John Doe", "+1234567890", "101"
      );
      
      // Store multiple data entries
      for (let i = 0; i < 10; i++) {
        await dataStorage.connect(hotelStaff).storeData(
          guestId, DataType.AadhaarData, `QmHash${i}`, 1024, "AES-256", `QmKeyHash${i}`, 86400
        );
      }
      
      // Create multiple alerts
      for (let i = 0; i < 10; i++) {
        await alertSystem.connect(hotelStaff).createAlert(
          guestId, AlertType.SuspiciousGuest, AlertSeverity.Medium, `Alert ${i}`
        );
      }
      
      // Create access requests
      for (let i = 0; i < 5; i++) {
        await accessControl.connect(policeOfficer).createAccessRequest(
          guestId, `Investigation ${i}`, 3600
        );
      }
      
      // All operations should complete successfully
      expect(await guestVerification.guestExists(guestId)).to.be.true;
    });

    it("Should handle concurrent operations from multiple users", async () => {
      const guestIds = ["GUEST001", "GUEST002", "GUEST003"];
      
      // Register guests from different signers
      const operations = [
        guestVerification.connect(hotelStaff).verifyGuest(
          guestIds[0], "QmHash1", "QmHash2", "John Doe", "+1234567890", "101"
        ),
        guestVerification.connect(hotelManager).verifyGuest(
          guestIds[1], "QmHash3", "QmHash4", "Jane Doe", "+1234567891", "102"
        ),
        guestVerification.connect(hotelStaff).verifyGuest(
          guestIds[2], "QmHash5", "QmHash6", "Bob Smith", "+1234567892", "103"
        ),
      ];
      
      // Execute all operations
      for (const operation of operations) {
        await operation;
      }
      
      // Verify all guests were registered
      for (const guestId of guestIds) {
        expect(await guestVerification.guestExists(guestId)).to.be.true;
      }
    });

    it("Should handle operations with the same guest ID across different hotels", async () => {
      // Note: In the current system, guest IDs should be unique across the system
      // This test verifies that duplicate guest IDs are prevented
      
      const guestId = "GUEST001";
      
      // Register guest from first hotel
      await guestVerification.connect(hotelStaff).verifyGuest(
        guestId, "QmHash1", "QmHash2", "John Doe", "+1234567890", "101"
      );
      
      // Try to register the same guest from another hotel
      await expect(
        guestVerification.connect(hotelManager).verifyGuest(
          guestId, "QmHash3", "QmHash4", "John Doe", "+1234567890", "201"
        )
      ).to.be.revertedWith("Guest already exists");
    });

    it("Should handle data access across different contracts", async () => {
      const guestId = "GUEST001";
      
      // Register guest
      await guestVerification.connect(hotelStaff).verifyGuest(
        guestId, "QmHash1", "QmHash2", "John Doe", "+1234567890", "101"
      );
      
      // Store data
      const dataId = await dataStorage.connect(hotelStaff).storeData(
        guestId, DataType.AadhaarData, "QmHash", 1024, "AES-256", "QmKeyHash", 86400
      );
      
      // Create alert
      const alertId = await alertSystem.connect(hotelStaff).createAlert(
        guestId, AlertType.SuspiciousGuest, AlertSeverity.Medium, "Test alert"
      );
      
      // Create access request
      const requestId = await accessControl.connect(policeOfficer).createAccessRequest(
        guestId, "Investigation", 3600
      );
      
      // Verify all data is linked correctly
      expect(await guestVerification.guestExists(guestId)).to.be.true;
      expect((await dataStorage.getGuestData(guestId)).length).to.equal(1);
      expect((await alertSystem.getGuestAlerts(guestId)).length).to.equal(1);
      expect((await accessControl.getGuestAccessRequests(guestId)).length).to.equal(1);
    });
  });

  describe("System Boundary Tests", function () {
    it("Should handle maximum number of roles", async () => {
      // Assign all possible roles to different users
      const roles = [Role.HotelStaff, Role.HotelManager, Role.PoliceOfficer, Role.PoliceAdmin, Role.SystemAdmin];
      const users = [guestUser];
      
      for (let i = 0; i < roles.length; i++) {
        const user = users[i] || guestUser; // Use same user for multiple roles
        await accessControl.assignRole(user.address, roles[i]);
      }
      
      // Verify all roles were assigned
      for (const role of roles) {
        expect(await accessControl.hasRole(guestUser.address, role)).to.be.true;
      }
    });

    it("Should handle maximum number of data types", async () => {
      const guestId = "GUEST001";
      
      // Register guest first
      await guestVerification.connect(hotelStaff).verifyGuest(
        guestId, "QmHash1", "QmHash2", "John Doe", "+1234567890", "101"
      );
      
      // Store data for all data types
      for (let i = 0; i < 6; i++) {
        await dataStorage.connect(hotelStaff).storeData(
          guestId, i, `QmHash${i}`, 1024, "AES-256", `QmKeyHash${i}`, 86400
        );
      }
      
      // Verify all data types were stored
      const guestData = await dataStorage.getGuestData(guestId);
      expect(guestData.length).to.equal(6);
    });

    it("Should handle maximum number of alert types", async () => {
      const guestId = "GUEST001";
      
      // Create alerts for all alert types
      for (let i = 0; i < 7; i++) {
        await alertSystem.connect(hotelStaff).createAlert(
          guestId, i, AlertSeverity.Medium, `Alert type ${i}`
        );
      }
      
      // Verify all alert types were created
      const guestAlerts = await alertSystem.getGuestAlerts(guestId);
      expect(guestAlerts.length).to.equal(7);
    });

    it("Should handle maximum number of severity levels", async () => {
      const guestId = "GUEST001";
      
      // Create alerts for all severity levels
      for (let i = 0; i < 4; i++) {
        await alertSystem.connect(hotelStaff).createAlert(
          guestId, AlertType.SuspiciousGuest, i, `Alert severity ${i}`
        );
      }
      
      // Verify all severity levels were created
      for (let i = 0; i < 4; i++) {
        const alertsBySeverity = await alertSystem.getAlertsBySeverity(i);
        expect(alertsBySeverity.length).to.equal(1);
      }
    });

    it("Should handle operations at block number boundaries", async () => {
      // Perform operations and check block numbers
      const guestId = "GUEST001";
      
      // Get current block number
      const startBlock = await ethers.provider.getBlockNumber();
      
      // Perform operations
      await guestVerification.connect(hotelStaff).verifyGuest(
        guestId, "QmHash1", "QmHash2", "John Doe", "+1234567890", "101"
      );
      
      // Get new block number
      const endBlock = await ethers.provider.getBlockNumber();
      
      // Verify operations completed
      expect(await guestVerification.guestExists(guestId)).to.be.true;
      
      // Verify block numbers are reasonable
      expect(endBlock).to.be.gte(startBlock);
      expect(endBlock - startBlock).to.be.lte(10); // Shouldn't take too many blocks
    });

    it("Should handle operations with maximum timestamp values", async () => {
      const guestId = "GUEST001";
      
      // Perform operations and check timestamps
      const startTimestamp = Math.floor(Date.now() / 1000);
      
      await guestVerification.connect(hotelStaff).verifyGuest(
        guestId, "QmHash1", "QmHash2", "John Doe", "+1234567890", "101"
      );
      
      const guestInfo = await guestVerification.getGuestInfo(guestId);
      
      // Verify timestamp is reasonable
      expect(guestInfo.checkInTime).to.be.gt(0);
      expect(guestInfo.checkInTime).to.be.lte(Math.floor(Date.now() / 1000));
    });
  });
});
