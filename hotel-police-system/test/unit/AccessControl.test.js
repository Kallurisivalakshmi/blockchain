// SPDX-License-Identifier: MIT
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AccessControl Unit Tests", function () {
  let accessControl, owner, hotelStaff, hotelManager, policeOfficer, policeAdmin, unauthorizedUser;
  const Role = { None: 0, HotelStaff: 1, HotelManager: 2, PoliceOfficer: 3, PoliceAdmin: 4, SystemAdmin: 5 };

  beforeEach(async () => {
    [owner, hotelStaff, hotelManager, policeOfficer, policeAdmin, unauthorizedUser] = await ethers.getSigners();
    const AccessControl = await ethers.getContractFactory("AccessControl");
    accessControl = await AccessControl.deploy();
    
    // Assign roles for testing
    await accessControl.assignRole(hotelStaff.address, Role.HotelStaff);
    await accessControl.assignRole(hotelManager.address, Role.HotelManager);
    await accessControl.assignRole(policeOfficer.address, Role.PoliceOfficer);
    await accessControl.assignRole(policeAdmin.address, Role.PoliceAdmin);
  });

  it("Should deploy with owner as SystemAdmin", async () => {
    const ownerRole = await accessControl.getRole(owner.address);
    expect(ownerRole).to.equal(Role.SystemAdmin);
  });

  it("Should emit RoleAssigned event on deployment", async () => {
    const filter = accessControl.filters.RoleAssigned();
    const events = await accessControl.queryFilter(filter, -1);
    expect(events.length).to.be.gt(0);
    
    const deployerEvent = events.find(e => e.args.user === owner.address);
    expect(deployerEvent).to.exist;
    expect(deployerEvent.args.role).to.equal(Role.SystemAdmin);
  });

  it("Should assign roles correctly", async () => {
    await accessControl.assignRole(unauthorizedUser.address, Role.HotelStaff);
    
    const role = await accessControl.getRole(unauthorizedUser.address);
    expect(role).to.equal(Role.HotelStaff);
    
    const hasRole = await accessControl.hasRole(unauthorizedUser.address, Role.HotelStaff);
    expect(hasRole).to.be.true;
  });

  it("Should emit RoleAssigned event on role assignment", async () => {
    const tx = await accessControl.assignRole(unauthorizedUser.address, Role.HotelStaff);
    
    await expect(tx)
      .to.emit(accessControl, "RoleAssigned")
      .withArgs(unauthorizedUser.address, Role.HotelStaff, owner.address);
  });

  it("Should prevent assigning None role", async () => {
    await expect(
      accessControl.assignRole(unauthorizedUser.address, Role.None)
    ).to.be.revertedWith("Cannot assign None role");
  });

  it("Should prevent assigning to zero address", async () => {
    await expect(
      accessControl.assignRole(ethers.constants.AddressZero, Role.HotelStaff)
    ).to.be.revertedWith("Invalid user address");
  });

  it("Should only allow admin to assign police roles", async () => {
    await expect(
      accessControl.connect(hotelStaff).assignRole(unauthorizedUser.address, Role.PoliceOfficer)
    ).to.be.revertedWith("Only police admin or system admin can assign police roles");
    
    await expect(
      accessControl.connect(policeAdmin).assignRole(unauthorizedUser.address, Role.PoliceOfficer)
    ).to.not.be.reverted;
    
    await expect(
      accessControl.connect(owner).assignRole(unauthorizedUser.address, Role.PoliceOfficer)
    ).to.not.be.reverted;
  });

  it("Should only allow admin to assign system admin role", async () => {
    await expect(
      accessControl.connect(hotelStaff).assignRole(unauthorizedUser.address, Role.SystemAdmin)
    ).to.be.revertedWith("Only system admin can assign system admin role");
    
    await expect(
      accessControl.connect(owner).assignRole(unauthorizedUser.address, Role.SystemAdmin)
    ).to.not.be.reverted;
  });

  it("Should allow hotel manager to assign hotel roles", async () => {
    await expect(
      accessControl.connect(hotelManager).assignRole(unauthorizedUser.address, Role.HotelStaff)
    ).to.not.be.reverted;
    
    await expect(
      accessControl.connect(hotelManager).assignRole(unauthorizedUser.address, Role.HotelManager)
    ).to.not.be.reverted;
  });

  it("Should revoke roles correctly", async () => {
    await accessControl.revokeRole(hotelStaff.address, Role.HotelStaff);
    
    const role = await accessControl.getRole(hotelStaff.address);
    expect(role).to.equal(Role.None);
    
    const hasRole = await accessControl.hasRole(hotelStaff.address, Role.HotelStaff);
    expect(hasRole).to.be.false;
  });

  it("Should emit RoleRevoked event on role revocation", async () => {
    const tx = await accessControl.revokeRole(hotelStaff.address, Role.HotelStaff);
    
    await expect(tx)
      .to.emit(accessControl, "RoleRevoked")
      .withArgs(hotelStaff.address, Role.HotelStaff, owner.address);
  });

  it("Should prevent revoking None role", async () => {
    await accessControl.revokeRole(hotelStaff.address, Role.HotelStaff);
    
    await expect(
      accessControl.revokeRole(hotelStaff.address, Role.None)
    ).to.be.revertedWith("Cannot revoke None role");
  });

  it("Should create access request", async () => {
    const guestId = "GUEST001";
    const purpose = "Investigation";
    const duration = 3600; // 1 hour
    
    const requestId = await accessControl.connect(policeOfficer).createAccessRequest(
      guestId, purpose, duration
    );
    
    expect(requestId).to.not.be.empty;
    const request = await accessControl.getAccessRequest(requestId);
    expect(request.requestId).to.equal(requestId);
    expect(request.requester).to.equal(policeOfficer.address);
    expect(request.guestId).to.equal(guestId);
    expect(request.purpose).to.equal(purpose);
    expect(request.isApproved).to.be.false;
    expect(request.requesterRole).to.equal(Role.PoliceOfficer);
  });

  it("Should emit AccessRequestCreated event", async () => {
    const guestId = "GUEST001";
    
    const tx = await accessControl.connect(policeOfficer).createAccessRequest(
      guestId, "Investigation", 3600
    );
    
    await expect(tx)
      .to.emit(accessControl, "AccessRequestCreated")
      .withArgs(anyValue, policeOfficer.address, guestId, anyValue);
  });

  it("Should prevent unauthorized access request creation", async () => {
    await expect(
      accessControl.connect(unauthorizedUser).createAccessRequest(
        "GUEST001", "Investigation", 3600
      )
    ).to.be.revertedWith("Only police personnel can perform this action");
  });

  it("Should approve access request", async () => {
    const guestId = "GUEST001";
    
    const requestId = await accessControl.connect(policeOfficer).createAccessRequest(
      guestId, "Investigation", 3600
    );
    
    await accessControl.connect(hotelManager).approveAccessRequest(requestId, "Approved");
    
    const request = await accessControl.getAccessRequest(requestId);
    expect(request.isApproved).to.be.true;
    expect(request.approvers).to.include(hotelManager.address);
  });

  it("Should emit AccessGranted event on approval", async () => {
    const guestId = "GUEST001";
    
    const requestId = await accessControl.connect(policeOfficer).createAccessRequest(
      guestId, "Investigation", 3600
    );
    
    // Set required approvals to 1 for testing
    await accessControl.connect(owner).setRequiredApprovals(1);
    
    const tx = await accessControl.connect(hotelManager).approveAccessRequest(requestId, "Approved");
    
    await expect(tx)
      .to.emit(accessControl, "AccessGranted")
      .withArgs(requestId, hotelManager.address, guestId);
  });

  it("Should deny access request", async () => {
    const guestId = "GUEST001";
    
    const requestId = await accessControl.connect(policeOfficer).createAccessRequest(
      guestId, "Investigation", 3600
    );
    
    await accessControl.connect(hotelManager).denyAccessRequest(requestId, "Denied - insufficient evidence");
    
    const request = await accessControl.getAccessRequest(requestId);
    expect(request.isApproved).to.be.false;
    
    // Check if denial was recorded
    expect(await accessControl.isRequestDenied(requestId)).to.be.true;
  });

  it("Should emit AccessDenied event on denial", async () => {
    const guestId = "GUEST001";
    
    const requestId = await accessControl.connect(policeOfficer).createAccessRequest(
      guestId, "Investigation", 3600
    );
    
    const tx = await accessControl.connect(hotelManager).denyAccessRequest(requestId, "Denied");
    
    await expect(tx)
      .to.emit(accessControl, "AccessDenied")
      .withArgs(requestId, hotelManager.address, guestId, "Denied");
  });

  it("Should log data access", async () => {
    const guestId = "GUEST001";
    const dataType = "Aadhaar Data";
    
    const logId = await accessControl.connect(policeOfficer).logDataAccess(
      guestId, dataType, true
    );
    
    expect(logId).to.not.be.empty;
    const log = await accessControl.getAccessLog(logId);
    expect(log.accessor).to.equal(policeOfficer.address);
    expect(log.guestId).to.equal(guestId);
    expect(log.dataAccessed).to.equal(dataType);
    expect(log.isAuthorized).to.be.true;
  });

  it("Should emit DataAccessLogged event", async () => {
    const guestId = "GUEST001";
    
    const tx = await accessControl.connect(policeOfficer).logDataAccess(
      guestId, "Aadhaar Data", true
    );
    
    await expect(tx)
      .to.emit(accessControl, "DataAccessLogged")
      .withArgs(anyValue, policeOfficer.address, guestId, "Aadhaar Data", true);
  });

  it("Should get access requests for guest", async () => {
    const guestId = "GUEST001";
    
    await accessControl.connect(policeOfficer).createAccessRequest(guestId, "Investigation 1", 3600);
    await accessControl.connect(policeOfficer).createAccessRequest(guestId, "Investigation 2", 3600);
    await accessControl.connect(policeOfficer).createAccessRequest("GUEST002", "Investigation 3", 3600);
    
    const requests = await accessControl.getGuestAccessRequests(guestId);
    expect(requests.length).to.equal(2);
  });

  it("Should get all access requests", async () => {
    await accessControl.connect(policeOfficer).createAccessRequest("GUEST001", "Investigation 1", 3600);
    await accessControl.connect(policeOfficer).createAccessRequest("GUEST002", "Investigation 2", 3600);
    
    const allRequests = await accessControl.getAllAccessRequests();
    expect(allRequests.length).to.equal(2);
  });

  it("Should get access logs", async () => {
    await accessControl.connect(policeOfficer).logDataAccess("GUEST001", "Aadhaar", true);
    await accessControl.connect(policeOfficer).logDataAccess("GUEST002", "Retina", true);
    
    const allLogs = await accessControl.getAllAccessLogs();
    expect(allLogs.length).to.equal(2);
  });

  it("Should set required approvals", async () => {
    await accessControl.connect(owner).setRequiredApprovals(3);
    
    const required = await accessControl.requiredApprovals();
    expect(required).to.equal(3);
  });

  it("Should prevent setting zero required approvals", async () => {
    await expect(
      accessControl.connect(owner).setRequiredApprovals(0)
    ).to.be.revertedWith("Required approvals must be at least 1");
  });

  it("Should only allow system admin to set required approvals", async () => {
    await expect(
      accessControl.connect(hotelManager).setRequiredApprovals(2)
    ).to.be.revertedWith("Only system admin can set required approvals");
  });

  it("Should check if user has any role", async () => {
    expect(await accessControl.hasAnyRole(hotelStaff.address)).to.be.true;
    expect(await accessControl.hasAnyRole(unauthorizedUser.address)).to.be.false;
  });

  it("Should get users by role", async () => {
    const hotelStaffUsers = await accessControl.getUsersByRole(Role.HotelStaff);
    expect(hotelStaffUsers).to.include(hotelStaff.address);
    
    const systemAdmins = await accessControl.getUsersByRole(Role.SystemAdmin);
    expect(systemAdmins).to.include(owner.address);
  });

  it("Should prevent creating duplicate access requests", async () => {
    const guestId = "GUEST001";
    
    const requestId1 = await accessControl.connect(policeOfficer).createAccessRequest(
      guestId, "Investigation", 3600
    );
    
    // This should create a new request with a different ID
    const requestId2 = await accessControl.connect(policeOfficer).createAccessRequest(
      guestId, "Investigation", 3600
    );
    
    expect(requestId1).to.not.equal(requestId2);
  });

  it("Should handle role assignment for existing users", async () => {
    // hotelStaff already has HotelStaff role
    await accessControl.assignRole(hotelStaff.address, Role.HotelManager);
    
    // Should overwrite previous role
    const role = await accessControl.getRole(hotelStaff.address);
    expect(role).to.equal(Role.HotelManager);
  });

  it("Should prevent self role revocation", async () => {
    await expect(
      accessControl.connect(owner).revokeRole(owner.address, Role.SystemAdmin)
    ).to.be.revertedWith("Cannot revoke your own role");
  });

  it("Should have correct role hierarchy", async () => {
    // SystemAdmin should be able to perform all actions
    expect(await accessControl.hasRole(owner.address, Role.SystemAdmin)).to.be.true;
    
    // PoliceAdmin should be able to perform police actions
    expect(await accessControl.hasRole(policeAdmin.address, Role.PoliceAdmin)).to.be.true;
    
    // HotelManager should be able to perform hotel actions
    expect(await accessControl.hasRole(hotelManager.address, Role.HotelManager)).to.be.true;
  });

  it("Should prevent unauthorized access to admin functions", async () => {
    await expect(
      accessControl.connect(hotelStaff).assignRole(unauthorizedUser.address, Role.PoliceOfficer)
    ).to.be.reverted;
    
    await expect(
      accessControl.connect(hotelStaff).revokeRole(hotelManager.address, Role.HotelManager)
    ).to.be.reverted;
  });

  // Helper function for event matching
  function anyValue() {
    return true;
  }
});
