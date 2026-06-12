// SPDX-License-Identifier: MIT
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Integration Tests - Hotel-Police Collaboration Workflows", function () {
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
    
    // Update registry with deployed contracts
    await registry.updateContract("AccessControl", accessControl.address);
    await registry.updateContract("DataStorage", dataStorage.address);
    await registry.updateContract("GuestVerification", guestVerification.address);
    await registry.updateContract("AlertSystem", alertSystem.address);
    
    // Assign roles
    await accessControl.assignRole(hotelManager.address, Role.HotelManager);
    await accessControl.assignRole(hotelStaff.address, Role.HotelStaff);
    await accessControl.assignRole(policeAdmin.address, Role.PoliceAdmin);
    await accessControl.assignRole(policeOfficer.address, Role.PoliceOfficer);
  });

  describe("Guest Registration Workflow", function () {
    it("Should complete the entire guest registration workflow", async () => {
      // Step 1: Guest arrives at hotel
      const guestId = "GUEST001";
      const guestName = "John Doe";
      const contactNumber = "+1234567890";
      const roomNumber = "101";
      const aadhaarHash = "QmAadhaarHash";
      const retinaScanHash = "QmRetinaHash";
      
      // Step 2: Hotel staff verifies guest using Aadhaar and retina scan
      const verificationSuccess = await guestVerification.connect(hotelStaff).verifyGuest(
        guestId, aadhaarHash, retinaScanHash, guestName, contactNumber, roomNumber
      );
      expect(verificationSuccess).to.be.true;
      
      // Step 3: Verify guest data was stored
      const guestInfo = await guestVerification.getGuestInfo(guestId);
      expect(guestInfo.guestId).to.equal(guestId);
      expect(guestInfo.name).to.equal(guestName);
      expect(guestInfo.contactNumber).to.equal(contactNumber);
      expect(guestInfo.roomNumber).to.equal(roomNumber);
      expect(guestInfo.isActive).to.be.false;
      
      const biometricData = await guestVerification.getGuestBiometricData(guestId);
      expect(biometricData.aadhaarHash).to.equal(aadhaarHash);
      expect(biometricData.retinaScanHash).to.equal(retinaScanHash);
      expect(biometricData.isVerified).to.be.true;
      expect(biometricData.verifiedBy).to.equal(hotelStaff.address);
      
      // Step 4: Store additional guest data
      const dataId1 = await dataStorage.connect(hotelStaff).storeData(
        guestId, DataType.AadhaarData, aadhaarHash, 1024, "AES-256-CBC", "QmKeyHash1", 86400
      );
      const dataId2 = await dataStorage.connect(hotelStaff).storeData(
        guestId, DataType.RetinaScan, retinaScanHash, 2048, "AES-256-CBC", "QmKeyHash2", 86400
      );
      
      // Step 5: Check in guest
      await guestVerification.connect(hotelStaff).checkInGuest(guestId);
      
      const updatedGuestInfo = await guestVerification.getGuestInfo(guestId);
      expect(updatedGuestInfo.isActive).to.be.true;
      expect(updatedGuestInfo.checkInTime).to.be.gt(0);
      
      // Step 6: Verify all data is properly linked
      const guestData = await dataStorage.getGuestData(guestId);
      expect(guestData.length).to.equal(2);
      expect(guestData).to.include(dataId1);
      expect(guestData).to.include(dataId2);
      
      const hotelGuests = await guestVerification.getHotelGuests(hotelStaff.address);
      expect(hotelGuests).to.include(guestId);
    });

    it("Should handle guest registration with data validation", async () => {
      // Test with empty guest ID
      await expect(
        guestVerification.connect(hotelStaff).verifyGuest(
          "", "QmHash1", "QmHash2", "John Doe", "+1234567890", "101"
        )
      ).to.be.reverted;
      
      // Test with empty hashes
      await expect(
        guestVerification.connect(hotelStaff).verifyGuest(
          "GUEST001", "", "QmHash2", "John Doe", "+1234567890", "101"
        )
      ).to.be.reverted;
      
      // Test with valid data
      const guestId = "GUEST001";
      const success = await guestVerification.connect(hotelStaff).verifyGuest(
        guestId, "QmHash1", "QmHash2", "John Doe", "+1234567890", "101"
      );
      expect(success).to.be.true;
    });

    it("Should handle guest check-out workflow", async () => {
      const guestId = "GUEST001";
      
      // Register guest
      await guestVerification.connect(hotelStaff).verifyGuest(
        guestId, "QmHash1", "QmHash2", "John Doe", "+1234567890", "101"
      );
      
      // Check in guest
      await guestVerification.connect(hotelStaff).checkInGuest(guestId);
      
      // Verify guest is checked in
      const guestInfo = await guestVerification.getGuestInfo(guestId);
      expect(guestInfo.isActive).to.be.true;
      
      // Check out guest
      await guestVerification.connect(hotelStaff).checkOutGuest(guestId);
      
      // Verify guest is checked out
      const updatedGuestInfo = await guestVerification.getGuestInfo(guestId);
      expect(updatedGuestInfo.isActive).to.be.false;
      expect(updatedGuestInfo.checkOutTime).to.be.gt(0);
    });
  });

  describe("Police Access Request Workflow", function () {
    it("Should complete the police access request workflow", async () => {
      // Step 1: Register a guest
      const guestId = "GUEST001";
      await guestVerification.connect(hotelStaff).verifyGuest(
        guestId, "QmHash1", "QmHash2", "John Doe", "+1234567890", "101"
      );
      
      // Step 2: Store guest data
      await dataStorage.connect(hotelStaff).storeData(
        guestId, DataType.AadhaarData, "QmAadhaarHash", 1024, "AES-256", "QmKeyHash", 86400
      );
      
      // Step 3: Police officer creates access request
      const purpose = "Investigation related to criminal activity";
      const requestId = await accessControl.connect(policeOfficer).createAccessRequest(
        guestId, purpose, 3600
      );
      
      expect(requestId).to.not.be.empty;
      
      // Step 4: Verify request was created
      const request = await accessControl.getAccessRequest(requestId);
      expect(request.requester).to.equal(policeOfficer.address);
      expect(request.guestId).to.equal(guestId);
      expect(request.purpose).to.equal(purpose);
      expect(request.isApproved).to.be.false;
      
      // Step 5: Hotel manager approves the request
      await accessControl.connect(hotelManager).approveAccessRequest(requestId, "Approved for investigation");
      
      // Step 6: Verify approval
      const updatedRequest = await accessControl.getAccessRequest(requestId);
      expect(updatedRequest.isApproved).to.be.true;
      expect(updatedRequest.approvers).to.include(hotelManager.address);
      
      // Step 7: Police officer accesses the data
      await dataStorage.connect(policeOfficer).retrieveDataReference("QmAadhaarHash");
      
      // Step 8: Log the data access
      await accessControl.connect(policeOfficer).logDataAccess(
        guestId, "Aadhaar Data", true
      );
      
      // Step 9: Verify access log
      const logs = await accessControl.getAllAccessLogs();
      const policeAccessLog = logs.find(log => log.accessor === policeOfficer.address);
      expect(policeAccessLog).to.exist;
      expect(policeAccessLog.guestId).to.equal(guestId);
      expect(policeAccessLog.isAuthorized).to.be.true;
    });

    it("Should handle access request denial workflow", async () => {
      const guestId = "GUEST001";
      
      // Register guest
      await guestVerification.connect(hotelStaff).verifyGuest(
        guestId, "QmHash1", "QmHash2", "John Doe", "+1234567890", "101"
      );
      
      // Create access request
      const requestId = await accessControl.connect(policeOfficer).createAccessRequest(
        guestId, "Insufficient evidence", 3600
      );
      
      // Deny the request
      await accessControl.connect(hotelManager).denyAccessRequest(
        requestId, "Denied - insufficient evidence"
      );
      
      // Verify denial
      const request = await accessControl.getAccessRequest(requestId);
      expect(request.isApproved).to.be.false;
      expect(await accessControl.isRequestDenied(requestId)).to.be.true;
    });

    it("Should handle multi-approval access request workflow", async () => {
      // Set required approvals to 2
      await accessControl.connect(owner).setRequiredApprovals(2);
      
      const guestId = "GUEST001";
      
      // Register guest
      await guestVerification.connect(hotelStaff).verifyGuest(
        guestId, "QmHash1", "QmHash2", "John Doe", "+1234567890", "101"
      );
      
      // Create access request
      const requestId = await accessControl.connect(policeOfficer).createAccessRequest(
        guestId, "High priority investigation", 3600
      );
      
      // First approval
      await accessControl.connect(hotelManager).approveAccessRequest(requestId, "First approval");
      
      // Check that request is not yet approved (needs 2 approvals)
      const requestAfterFirstApproval = await accessControl.getAccessRequest(requestId);
      expect(requestAfterFirstApproval.isApproved).to.be.false;
      
      // Second approval (need to use a different approver)
      // Assign another hotel manager for testing
      await accessControl.assignRole(policeAdmin.address, Role.HotelManager);
      await accessControl.connect(policeAdmin).approveAccessRequest(requestId, "Second approval");
      
      // Now request should be approved
      const finalRequest = await accessControl.getAccessRequest(requestId);
      expect(finalRequest.isApproved).to.be.true;
      expect(finalRequest.approvers.length).to.equal(2);
    });
  });

  describe("Alert Creation and Resolution Workflow", function () {
    it("Should complete the alert creation and resolution workflow", async () => {
      // Step 1: Register a guest
      const guestId = "GUEST001";
      await guestVerification.connect(hotelStaff).verifyGuest(
        guestId, "QmHash1", "QmHash2", "John Doe", "+1234567890", "101"
      );
      
      // Step 2: Hotel staff detects suspicious activity and creates alert
      const alertId = await alertSystem.connect(hotelStaff).createAlert(
        guestId, AlertType.SuspiciousGuest, AlertSeverity.High, "Guest acting suspiciously"
      );
      
      expect(alertId).to.not.be.empty;
      
      // Step 3: Verify alert was created
      const alert = await alertSystem.getAlert(alertId);
      expect(alert.guestId).to.equal(guestId);
      expect(alert.alertType).to.equal(AlertType.SuspiciousGuest);
      expect(alert.severity).to.equal(AlertSeverity.High);
      expect(alert.hotelAddress).to.equal(hotelStaff.address);
      expect(alert.isResolved).to.be.false;
      
      // Step 4: Send notifications
      await alertSystem.connect(hotelStaff).sendNotifications(alertId);
      
      // Step 5: Police officer investigates and resolves alert
      await alertSystem.connect(policeOfficer).resolveAlert(
        alertId, "Investigation complete - no threat found"
      );
      
      // Step 6: Verify alert resolution
      const resolvedAlert = await alertSystem.getAlert(alertId);
      expect(resolvedAlert.isResolved).to.be.true;
      expect(resolvedAlert.resolvedBy).to.equal(policeOfficer.address);
      expect(resolvedAlert.resolutionNotes).to.equal("Investigation complete - no threat found");
      expect(resolvedAlert.resolutionTimestamp).to.be.gt(0);
    });

    it("Should handle alert creation with different severities", async () => {
      const guestId = "GUEST001";
      
      // Register guest
      await guestVerification.connect(hotelStaff).verifyGuest(
        guestId, "QmHash1", "QmHash2", "John Doe", "+1234567890", "101"
      );
      
      // Create alerts with different severities
      await alertSystem.connect(hotelStaff).createAlert(
        guestId, AlertType.SuspiciousGuest, AlertSeverity.Low, "Low severity alert"
      );
      await alertSystem.connect(hotelStaff).createAlert(
        guestId, AlertType.SecurityBreach, AlertSeverity.Critical, "Critical alert"
      );
      
      // Verify alerts by severity
      const lowAlerts = await alertSystem.getAlertsBySeverity(AlertSeverity.Low);
      expect(lowAlerts.length).to.equal(1);
      
      const criticalAlerts = await alertSystem.getAlertsBySeverity(AlertSeverity.Critical);
      expect(criticalAlerts.length).to.equal(1);
    });

    it("Should handle alert creation without guest ID", async () => {
      // Create alert without guest ID (general security alert)
      const alertId = await alertSystem.connect(hotelStaff).createAlert(
        "", AlertType.SecurityBreach, AlertSeverity.High, "General security alert"
      );
      
      const alert = await alertSystem.getAlert(alertId);
      expect(alert.guestId).to.equal("");
      expect(alert.alertType).to.equal(AlertType.SecurityBreach);
    });
  });

  describe("Cross-Contract Integration Tests", function () {
    it("Should integrate all contracts in a real-world scenario", async () => {
      // Scenario: A guest checks in, police request access, hotel approves, and alert is created
      
      // Step 1: Guest registration
      const guestId = "GUEST001";
      await guestVerification.connect(hotelStaff).verifyGuest(
        guestId, "QmAadhaarHash", "QmRetinaHash", "John Doe", "+1234567890", "101"
      );
      await guestVerification.connect(hotelStaff).checkInGuest(guestId);
      
      // Step 2: Store biometric data
      await dataStorage.connect(hotelStaff).storeData(
        guestId, DataType.AadhaarData, "QmAadhaarHash", 1024, "AES-256", "QmKeyHash1", 86400
      );
      await dataStorage.connect(hotelStaff).storeData(
        guestId, DataType.RetinaScan, "QmRetinaHash", 2048, "AES-256", "QmKeyHash2", 86400
      );
      
      // Step 3: Police creates access request
      const requestId = await accessControl.connect(policeOfficer).createAccessRequest(
        guestId, "Criminal investigation", 7200
      );
      
      // Step 4: Hotel manager approves request
      await accessControl.connect(hotelManager).approveAccessRequest(requestId, "Approved");
      
      // Step 5: Police accesses data
      await accessControl.connect(policeOfficer).logDataAccess(
        guestId, "Biometric Data", true
      );
      
      // Step 6: Hotel creates alert for suspicious activity
      const alertId = await alertSystem.connect(hotelStaff).createAlert(
        guestId, AlertType.SuspiciousGuest, AlertSeverity.High, "Guest matches wanted person description"
      );
      
      // Step 7: Police resolves alert
      await alertSystem.connect(policeOfficer).resolveAlert(
        alertId, "Confirmed match - arrest made"
      );
      
      // Step 8: Guest checks out
      await guestVerification.connect(hotelStaff).checkOutGuest(guestId);
      
      // Verify all operations completed successfully
      const guestInfo = await guestVerification.getGuestInfo(guestId);
      expect(guestInfo.isActive).to.be.false;
      expect(guestInfo.checkOutTime).to.be.gt(0);
      
      const request = await accessControl.getAccessRequest(requestId);
      expect(request.isApproved).to.be.true;
      
      const alert = await alertSystem.getAlert(alertId);
      expect(alert.isResolved).to.be.true;
      
      const accessLogs = await accessControl.getAllAccessLogs();
      const policeAccessLogs = accessLogs.filter(log => log.accessor === policeOfficer.address);
      expect(policeAccessLogs.length).to.equal(1);
    });

    it("Should handle data access through the registry", async () => {
      // Use registry to access contracts
      const registryAccessControl = await ethers.getContractAt("AccessControl", await registry.accessControl());
      const registryGuestVerification = await ethers.getContractAt("GuestVerification", await registry.guestVerification());
      const registryDataStorage = await ethers.getContractAt("DataStorage", await registry.dataStorage());
      const registryAlertSystem = await ethers.getContractAt("AlertSystem", await registry.alertSystem());
      
      // Register guest using registry
      const guestId = "GUEST001";
      await registryGuestVerification.connect(hotelStaff).verifyGuest(
        guestId, "QmHash1", "QmHash2", "John Doe", "+1234567890", "101"
      );
      
      // Store data using registry
      await registryDataStorage.connect(hotelStaff).storeData(
        guestId, DataType.AadhaarData, "QmHash", 1024, "AES-256", "QmKeyHash", 86400
      );
      
      // Create alert using registry
      await registryAlertSystem.connect(hotelStaff).createAlert(
        guestId, AlertType.SuspiciousGuest, AlertSeverity.Medium, "Test alert"
      );
      
      // Verify all operations worked
      const guestInfo = await registryGuestVerification.getGuestInfo(guestId);
      expect(guestInfo.guestId).to.equal(guestId);
      
      const guestData = await registryDataStorage.getGuestData(guestId);
      expect(guestData.length).to.equal(1);
      
      const hotelAlerts = await registryAlertSystem.getHotelAlerts(hotelStaff.address);
      expect(hotelAlerts.length).to.equal(1);
    });

    it("Should handle system status changes through registry", async () => {
      // Initially system should be active
      expect(await registry.isSystemActive()).to.be.true;
      
      // Deactivate system
      await registry.connect(owner).setSystemStatus(false);
      expect(await registry.isSystemActive()).to.be.false;
      
      // Reactivate system
      await registry.connect(owner).setSystemStatus(true);
      expect(await registry.isSystemActive()).to.be.true;
    });
  });

  describe("Data Integrity and Consistency Tests", function () {
    it("Should maintain data consistency across contracts", async () => {
      const guestId = "GUEST001";
      
      // Register guest in GuestVerification
      await guestVerification.connect(hotelStaff).verifyGuest(
        guestId, "QmHash1", "QmHash2", "John Doe", "+1234567890", "101"
      );
      
      // Store data in DataStorage
      await dataStorage.connect(hotelStaff).storeData(
        guestId, DataType.AadhaarData, "QmHash", 1024, "AES-256", "QmKeyHash", 86400
      );
      
      // Create alert in AlertSystem
      await alertSystem.connect(hotelStaff).createAlert(
        guestId, AlertType.SuspiciousGuest, AlertSeverity.Medium, "Test alert"
      );
      
      // Verify data consistency
      // Guest should exist in GuestVerification
      expect(await guestVerification.guestExists(guestId)).to.be.true;
      
      // Guest should have data in DataStorage
      const guestData = await dataStorage.getGuestData(guestId);
      expect(guestData.length).to.equal(1);
      
      // Guest should have alerts in AlertSystem
      const guestAlerts = await alertSystem.getGuestAlerts(guestId);
      expect(guestAlerts.length).to.equal(1);
      
      // Guest should be associated with hotel staff
      const hotelAddress = await guestVerification.getGuestHotel(guestId);
      expect(hotelAddress).to.equal(hotelStaff.address);
      
      // Hotel should have the guest in its guest list
      const hotelGuests = await guestVerification.getHotelGuests(hotelStaff.address);
      expect(hotelGuests).to.include(guestId);
    });

    it("Should maintain access control consistency", async () => {
      // Assign roles
      await accessControl.assignRole(unauthorizedUser.address, Role.HotelStaff);
      
      // Verify role consistency
      expect(await accessControl.getRole(unauthorizedUser.address)).to.equal(Role.HotelStaff);
      expect(await accessControl.hasRole(unauthorizedUser.address, Role.HotelStaff)).to.be.true;
      expect(await accessControl.hasAnyRole(unauthorizedUser.address)).to.be.true;
      
      // Get users by role
      const hotelStaffUsers = await accessControl.getUsersByRole(Role.HotelStaff);
      expect(hotelStaffUsers).to.include(unauthorizedUser.address);
      expect(hotelStaffUsers).to.include(hotelStaff.address);
    });
  });
});
