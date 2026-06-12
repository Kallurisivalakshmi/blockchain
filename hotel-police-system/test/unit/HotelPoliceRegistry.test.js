// SPDX-License-Identifier: MIT
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("HotelPoliceRegistry Unit Tests", function () {
  let registry, accessControl, dataStorage, guestVerification, alertSystem;
  let owner, hotelManager, hotelStaff, policeAdmin, policeOfficer, unauthorizedUser;
  const Role = { None: 0, HotelStaff: 1, HotelManager: 2, PoliceOfficer: 3, PoliceAdmin: 4, SystemAdmin: 5 };

  beforeEach(async () => {
    [owner, hotelManager, hotelStaff, policeAdmin, policeOfficer, unauthorizedUser] = await ethers.getSigners();
    
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
    
    await accessControl.assignRole(hotelManager.address, Role.HotelManager);
    await accessControl.assignRole(hotelStaff.address, Role.HotelStaff);
    await accessControl.assignRole(policeAdmin.address, Role.PoliceAdmin);
    await accessControl.assignRole(policeOfficer.address, Role.PoliceOfficer);
  });

  it("Should deploy with correct system information", async () => {
    expect(await registry.systemName()).to.equal("Hotel-Police Collaboration System");
    expect(await registry.systemVersion()).to.equal("1.0.0");
    expect(await registry.deploymentTimestamp()).to.be.gt(0);
    expect(await registry.isSystemActive()).to.be.true;
  });

  it("Should deploy with all system contracts", async () => {
    const accessControlAddr = await registry.accessControl();
    const dataStorageAddr = await registry.dataStorage();
    const guestVerificationAddr = await registry.guestVerification();
    const alertSystemAddr = await registry.alertSystem();
    
    expect(accessControlAddr).to.not.equal(ethers.constants.AddressZero);
    expect(dataStorageAddr).to.not.equal(ethers.constants.AddressZero);
    expect(guestVerificationAddr).to.not.equal(ethers.constants.AddressZero);
    expect(alertSystemAddr).to.not.equal(ethers.constants.AddressZero);
  });

  it("Should emit SystemInitialized event on deployment", async () => {
    // Check if the event was emitted during deployment
    const filter = registry.filters.SystemInitialized();
    const events = await registry.queryFilter(filter, -1);
    expect(events.length).to.be.gt(0);
  });

  it("Should set system status", async () => {
    await registry.connect(owner).setSystemStatus(false);
    expect(await registry.isSystemActive()).to.be.false;
    
    await registry.connect(owner).setSystemStatus(true);
    expect(await registry.isSystemActive()).to.be.true;
  });

  it("Should emit SystemStatusChanged event", async () => {
    const tx = await registry.connect(owner).setSystemStatus(false);
    
    await expect(tx)
      .to.emit(registry, "SystemStatusChanged")
      .withArgs(false);
  });

  it("Should update contract references", async () => {
    const newAccessControl = accessControl.address;
    
    await registry.connect(owner).updateContract("AccessControl", newAccessControl);
    expect(await registry.accessControl()).to.equal(newAccessControl);
  });

  it("Should emit ContractUpdated event", async () => {
    const newAccessControl = accessControl.address;
    
    const tx = await registry.connect(owner).updateContract("AccessControl", newAccessControl);
    
    await expect(tx)
      .to.emit(registry, "ContractUpdated")
      .withArgs("AccessControl", newAccessControl);
  });

  it("Should get system information", async () => {
    const [name, version, deployedAt, isActive] = await registry.getSystemInfo();
    
    expect(name).to.equal("Hotel-Police Collaboration System");
    expect(version).to.equal("1.0.0");
    expect(deployedAt).to.be.gt(0);
    expect(isActive).to.be.true;
  });

  it("Should prevent unauthorized system status changes", async () => {
    await expect(
      registry.connect(hotelStaff).setSystemStatus(false)
    ).to.be.revertedWith("Only system admin can change system status");
  });

  it("Should prevent unauthorized contract updates", async () => {
    await expect(
      registry.connect(hotelStaff).updateContract("AccessControl", accessControl.address)
    ).to.be.revertedWith("Only system admin can update contracts");
  });

  it("Should prevent updating with invalid contract name", async () => {
    await expect(
      registry.connect(owner).updateContract("InvalidContract", accessControl.address)
    ).to.be.revertedWith("Invalid contract name");
  });

  it("Should prevent updating AccessControl with invalid address", async () => {
    await expect(
      registry.connect(owner).updateContract("AccessControl", ethers.constants.AddressZero)
    ).to.be.reverted;
  });

  it("Should update all contract types", async () => {
    // Update AccessControl
    await registry.connect(owner).updateContract("AccessControl", accessControl.address);
    expect(await registry.accessControl()).to.equal(accessControl.address);
    
    // Update DataStorage
    await registry.connect(owner).updateContract("DataStorage", dataStorage.address);
    expect(await registry.dataStorage()).to.equal(dataStorage.address);
    
    // Update GuestVerification
    await registry.connect(owner).updateContract("GuestVerification", guestVerification.address);
    expect(await registry.guestVerification()).to.equal(guestVerification.address);
    
    // Update AlertSystem
    await registry.connect(owner).updateContract("AlertSystem", alertSystem.address);
    expect(await registry.alertSystem()).to.equal(alertSystem.address);
  });

  it("Should have correct system version", async () => {
    const version = await registry.systemVersion();
    expect(version).to.equal("1.0.0");
  });

  it("Should have correct system name", async () => {
    const name = await registry.systemName();
    expect(name).to.equal("Hotel-Police Collaboration System");
  });

  it("Should have valid deployment timestamp", async () => {
    const timestamp = await registry.deploymentTimestamp();
    expect(timestamp).to.be.gt(0);
    expect(timestamp).to.be.lte(Math.floor(Date.now() / 1000));
  });
});
