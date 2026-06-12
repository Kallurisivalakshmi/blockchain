// SPDX-License-Identifier: MIT
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AlertSystem Unit Tests", function () {
  let alertSystem, accessControl, guestVerification, owner, hotelManager, hotelStaff, policeAdmin, policeOfficer, unauthorizedUser;
  const Role = { None: 0, HotelStaff: 1, HotelManager: 2, PoliceOfficer: 3, PoliceAdmin: 4, SystemAdmin: 5 };
  const AlertType = { SuspiciousGuest: 0, WantedPerson: 1, SecurityBreach: 2, DataAccess: 3, VerificationFailure: 4, Emergency: 5, Custom: 6 };
  const AlertSeverity = { Low: 0, Medium: 1, High: 2, Critical: 3 };

  beforeEach(async () => {
    [owner, hotelManager, hotelStaff, policeAdmin, policeOfficer, unauthorizedUser] = await ethers.getSigners();
    
    const AccessControl = await ethers.getContractFactory("AccessControl");
    accessControl = await AccessControl.deploy();
    
    const DataStorage = await ethers.getContractFactory("DataStorage");
    const dataStorage = await DataStorage.deploy(accessControl.address);
    
    const GuestVerification = await ethers.getContractFactory("GuestVerification");
    guestVerification = await GuestVerification.deploy(accessControl.address, dataStorage.address);
    
    const AlertSystem = await ethers.getContractFactory("AlertSystem");
    alertSystem = await AlertSystem.deploy(accessControl.address, guestVerification.address);
    
    await accessControl.assignRole(hotelManager.address, Role.HotelManager);
    await accessControl.assignRole(hotelStaff.address, Role.HotelStaff);
    await accessControl.assignRole(policeAdmin.address, Role.PoliceAdmin);
    await accessControl.assignRole(policeOfficer.address, Role.PoliceOfficer);
  });

  it("Should deploy with correct contract references", async () => {
    expect(await alertSystem.accessControl()).to.equal(accessControl.address);
    expect(await alertSystem.guestVerification()).to.equal(guestVerification.address);
  });

  it("Should create alert successfully", async () => {
    const guestId = "GUEST001";
    const description = "Suspicious behavior detected";
    
    const alertId = await alertSystem.connect(hotelStaff).createAlert(
      guestId, AlertType.SuspiciousGuest, AlertSeverity.Medium, description
    );
    
    expect(alertId).to.not.be.empty;
    const alert = await alertSystem.getAlert(alertId);
    expect(alert.guestId).to.equal(guestId);
    expect(alert.alertType).to.equal(AlertType.SuspiciousGuest);
    expect(alert.severity).to.equal(AlertSeverity.Medium);
    expect(alert.description).to.equal(description);
    expect(alert.hotelAddress).to.equal(hotelStaff.address);
    expect(alert.isResolved).to.be.false;
  });

  it("Should emit AlertCreated event", async () => {
    const guestId = "GUEST001";
    const description = "Emergency situation";
    
    const tx = await alertSystem.connect(hotelStaff).createAlert(
      guestId, AlertType.Emergency, AlertSeverity.Critical, description
    );
    
    await expect(tx)
      .to.emit(alertSystem, "AlertCreated")
      .withArgs(anyValue, AlertType.Emergency, AlertSeverity.Critical, guestId, hotelStaff.address);
  });

  it("Should resolve alert", async () => {
    const guestId = "GUEST001";
    const description = "Suspicious behavior";
    
    const alertId = await alertSystem.connect(hotelStaff).createAlert(
      guestId, AlertType.SuspiciousGuest, AlertSeverity.Medium, description
    );
    
    await alertSystem.connect(policeOfficer).resolveAlert(alertId, "Investigation complete");
    
    const alert = await alertSystem.getAlert(alertId);
    expect(alert.isResolved).to.be.true;
    expect(alert.resolvedBy).to.equal(policeOfficer.address);
    expect(alert.resolutionNotes).to.equal("Investigation complete");
    expect(alert.resolutionTimestamp).to.be.gt(0);
  });

  it("Should emit AlertResolved event", async () => {
    const guestId = "GUEST001";
    
    const alertId = await alertSystem.connect(hotelStaff).createAlert(
      guestId, AlertType.SuspiciousGuest, AlertSeverity.Medium, "Test alert"
    );
    
    const tx = await alertSystem.connect(policeOfficer).resolveAlert(alertId, "Resolved");
    
    await expect(tx)
      .to.emit(alertSystem, "AlertResolved")
      .withArgs(alertId, policeOfficer.address, anyValue);
  });

  it("Should prevent resolving non-existent alert", async () => {
    await expect(
      alertSystem.connect(policeOfficer).resolveAlert("NONEXISTENT", "Notes")
    ).to.be.revertedWith("Alert does not exist");
  });

  it("Should prevent resolving already resolved alert", async () => {
    const guestId = "GUEST001";
    
    const alertId = await alertSystem.connect(hotelStaff).createAlert(
      guestId, AlertType.SuspiciousGuest, AlertSeverity.Medium, "Test alert"
    );
    
    await alertSystem.connect(policeOfficer).resolveAlert(alertId, "First resolution");
    
    await expect(
      alertSystem.connect(policeOfficer).resolveAlert(alertId, "Second resolution")
    ).to.be.revertedWith("Alert is already resolved");
  });

  it("Should get alerts by guest", async () => {
    const guestId = "GUEST001";
    
    await alertSystem.connect(hotelStaff).createAlert(
      guestId, AlertType.SuspiciousGuest, AlertSeverity.Low, "Alert 1"
    );
    await alertSystem.connect(hotelStaff).createAlert(
      guestId, AlertType.SecurityBreach, AlertSeverity.High, "Alert 2"
    );
    await alertSystem.connect(hotelStaff).createAlert(
      "GUEST002", AlertType.WantedPerson, AlertSeverity.Critical, "Alert 3"
    );
    
    const guestAlerts = await alertSystem.getGuestAlerts(guestId);
    expect(guestAlerts.length).to.equal(2);
  });

  it("Should get alerts by hotel", async () => {
    const guestId = "GUEST001";
    
    await alertSystem.connect(hotelStaff).createAlert(
      guestId, AlertType.SuspiciousGuest, AlertSeverity.Low, "Alert 1"
    );
    await alertSystem.connect(hotelStaff).createAlert(
      guestId, AlertType.SecurityBreach, AlertSeverity.High, "Alert 2"
    );
    
    const hotelAlerts = await alertSystem.getHotelAlerts(hotelStaff.address);
    expect(hotelAlerts.length).to.equal(2);
  });

  it("Should get alerts by type", async () => {
    const guestId = "GUEST001";
    
    await alertSystem.connect(hotelStaff).createAlert(
      guestId, AlertType.SuspiciousGuest, AlertSeverity.Medium, "Suspicious alert"
    );
    await alertSystem.connect(hotelStaff).createAlert(
      guestId, AlertType.Emergency, AlertSeverity.Critical, "Emergency alert"
    );
    await alertSystem.connect(hotelStaff).createAlert(
      guestId, AlertType.SuspiciousGuest, AlertSeverity.High, "Another suspicious alert"
    );
    
    const suspiciousAlerts = await alertSystem.getAlertsByType(AlertType.SuspiciousGuest);
    expect(suspiciousAlerts.length).to.equal(2);
    
    const emergencyAlerts = await alertSystem.getAlertsByType(AlertType.Emergency);
    expect(emergencyAlerts.length).to.equal(1);
  });

  it("Should get alerts by severity", async () => {
    const guestId = "GUEST001";
    
    await alertSystem.connect(hotelStaff).createAlert(
      guestId, AlertType.SuspiciousGuest, AlertSeverity.Low, "Low alert"
    );
    await alertSystem.connect(hotelStaff).createAlert(
      guestId, AlertType.Emergency, AlertSeverity.Critical, "Critical alert"
    );
    await alertSystem.connect(hotelStaff).createAlert(
      guestId, AlertType.SecurityBreach, AlertSeverity.Medium, "Medium alert"
    );
    
    const criticalAlerts = await alertSystem.getAlertsBySeverity(AlertSeverity.Critical);
    expect(criticalAlerts.length).to.equal(1);
    
    const mediumOrLower = await alertSystem.getAlertsBySeverity(AlertSeverity.Medium);
    expect(mediumOrLower.length).to.be.gte(2); // Medium and Low
  });

  it("Should set notification preferences", async () => {
    const preferences = {
      emailNotifications: true,
      smsNotifications: true,
      pushNotifications: false,
      alertTypes: [AlertType.SuspiciousGuest, AlertType.Emergency],
      minSeverity: AlertSeverity.Medium,
    };
    
    await alertSystem.connect(policeOfficer).setNotificationPreferences(
      preferences.emailNotifications,
      preferences.smsNotifications,
      preferences.pushNotifications,
      preferences.alertTypes,
      preferences.minSeverity
    );
    
    const savedPreferences = await alertSystem.getNotificationPreferences(policeOfficer.address);
    expect(savedPreferences.emailNotifications).to.equal(preferences.emailNotifications);
    expect(savedPreferences.smsNotifications).to.equal(preferences.smsNotifications);
    expect(savedPreferences.pushNotifications).to.equal(preferences.pushNotifications);
    expect(savedPreferences.minSeverity).to.equal(preferences.minSeverity);
  });

  it("Should send notifications", async () => {
    const guestId = "GUEST001";
    
    await alertSystem.connect(policeOfficer).setNotificationPreferences(
      true, true, true, [AlertType.SuspiciousGuest], AlertSeverity.Low
    );
    
    const alertId = await alertSystem.connect(hotelStaff).createAlert(
      guestId, AlertType.SuspiciousGuest, AlertSeverity.Medium, "Test alert"
    );
    
    const tx = await alertSystem.connect(hotelStaff).sendNotifications(alertId);
    
    await expect(tx)
      .to.emit(alertSystem, "AlertNotificationsSent")
      .withArgs(alertId, anyValue, anyValue);
  });

  it("Should prevent unauthorized alert creation", async () => {
    await expect(
      alertSystem.connect(unauthorizedUser).createAlert(
        "GUEST001", AlertType.SuspiciousGuest, AlertSeverity.Medium, "Test alert"
      )
    ).to.be.revertedWith("Only authorized personnel can perform this action");
  });

  it("Should prevent unauthorized alert resolution", async () => {
    const guestId = "GUEST001";
    
    const alertId = await alertSystem.connect(hotelStaff).createAlert(
      guestId, AlertType.SuspiciousGuest, AlertSeverity.Medium, "Test alert"
    );
    
    await expect(
      alertSystem.connect(unauthorizedUser).resolveAlert(alertId, "Notes")
    ).to.be.revertedWith("Only authorized personnel can perform this action");
  });

  it("Should prevent unauthorized notification preference changes", async () => {
    await expect(
      alertSystem.connect(unauthorizedUser).setNotificationPreferences(
        true, true, true, [AlertType.SuspiciousGuest], AlertSeverity.Low
      )
    ).to.be.revertedWith("Only authorized personnel can perform this action");
  });

  it("Should set access control contract", async () => {
    const newAccessControl = accessControl.address;
    
    await alertSystem.connect(owner).setAccessControl(newAccessControl);
    expect(await alertSystem.accessControl()).to.equal(newAccessControl);
  });

  it("Should set guest verification contract", async () => {
    const newGuestVerification = guestVerification.address;
    
    await alertSystem.connect(owner).setGuestVerification(newGuestVerification);
    expect(await alertSystem.guestVerification()).to.equal(newGuestVerification);
  });

  it("Should prevent unauthorized access control changes", async () => {
    await expect(
      alertSystem.connect(hotelStaff).setAccessControl(accessControl.address)
    ).to.be.revertedWith("Only system admin can set access control");
  });

  it("Should prevent unauthorized guest verification changes", async () => {
    await expect(
      alertSystem.connect(hotelStaff).setGuestVerification(guestVerification.address)
    ).to.be.revertedWith("Only system admin can set guest verification");
  });

  it("Should create alert without guest ID", async () => {
    const description = "General security alert";
    
    const alertId = await alertSystem.connect(hotelStaff).createAlert(
      "", AlertType.SecurityBreach, AlertSeverity.High, description
    );
    
    expect(alertId).to.not.be.empty;
    const alert = await alertSystem.getAlert(alertId);
    expect(alert.guestId).to.equal("");
    expect(alert.description).to.equal(description);
  });

  it("Should create alert with all severity levels", async () => {
    const guestId = "GUEST001";
    const descriptions = ["Low", "Medium", "High", "Critical"];
    
    for (const [index, desc] of descriptions.entries()) {
      const alertId = await alertSystem.connect(hotelStaff).createAlert(
        guestId, AlertType.Custom, index, desc
      );
      const alert = await alertSystem.getAlert(alertId);
      expect(alert.severity).to.equal(index);
    }
  });

  it("Should create alert with all alert types", async () => {
    const guestId = "GUEST001";
    const descriptions = ["Suspicious", "Wanted", "Breach", "Access", "Failure", "Emergency", "Custom"];
    
    for (const [index, desc] of descriptions.entries()) {
      const alertId = await alertSystem.connect(hotelStaff).createAlert(
        guestId, index, AlertSeverity.Medium, desc
      );
      const alert = await alertSystem.getAlert(alertId);
      expect(alert.alertType).to.equal(index);
    }
  });

  // Helper function for event matching
  function anyValue() {
    return true;
  }
});
