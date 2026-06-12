// SPDX-License-Identifier: MIT
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GuestVerification Unit Tests", function () {
  let guestVerification, accessControl, dataStorage, owner, hotelManager, hotelStaff, policeAdmin, policeOfficer, unauthorizedUser;
  const Role = { None: 0, HotelStaff: 1, HotelManager: 2, PoliceOfficer: 3, PoliceAdmin: 4, SystemAdmin: 5 };

  beforeEach(async () => {
    [owner, hotelManager, hotelStaff, policeAdmin, policeOfficer, unauthorizedUser] = await ethers.getSigners();
    
    const AccessControl = await ethers.getContractFactory("AccessControl");
    accessControl = await AccessControl.deploy();
    
    const DataStorage = await ethers.getContractFactory("DataStorage");
    dataStorage = await DataStorage.deploy(accessControl.address);
    
    const GuestVerification = await ethers.getContractFactory("GuestVerification");
    guestVerification = await GuestVerification.deploy(accessControl.address, dataStorage.address);
    
    await accessControl.assignRole(hotelManager.address, Role.HotelManager);
    await accessControl.assignRole(hotelStaff.address, Role.HotelStaff);
    await accessControl.assignRole(policeAdmin.address, Role.PoliceAdmin);
    await accessControl.assignRole(policeOfficer.address, Role.PoliceOfficer);
  });

  it("Should deploy with correct contract references", async () => {
    expect(await guestVerification.accessControl()).to.equal(accessControl.address);
    expect(await guestVerification.dataStorage()).to.equal(dataStorage.address);
  });

  it("Should verify guest successfully", async () => {
    const guestId = "GUEST001";
    const aadhaarHash = "QmAadhaarHash";
    const retinaScanHash = "QmRetinaHash";
    const guestName = "John Doe";
    const contactNumber = "+1234567890";
    const roomNumber = "101";
    
    const success = await guestVerification.connect(hotelStaff).verifyGuest(
      guestId, aadhaarHash, retinaScanHash, guestName, contactNumber, roomNumber
    );
    
    expect(success).to.be.true;
    expect(await guestVerification.guestExists(guestId)).to.be.true;
    
    const guestInfo = await guestVerification.getGuestInfo(guestId);
    expect(guestInfo.guestId).to.equal(guestId);
    expect(guestInfo.name).to.equal(guestName);
    expect(guestInfo.contactNumber).to.equal(contactNumber);
    expect(guestInfo.roomNumber).to.equal(roomNumber);
    expect(guestInfo.isActive).to.be.false; // Not checked in yet
  });

  it("Should emit GuestVerified event", async () => {
    const guestId = "GUEST001";
    
    const tx = await guestVerification.connect(hotelStaff).verifyGuest(
      guestId, "QmAadhaarHash", "QmRetinaHash", "John Doe", "+1234567890", "101"
    );
    
    await expect(tx)
      .to.emit(guestVerification, "GuestVerified")
      .withArgs(guestId, hotelStaff.address, anyValue);
  });

  it("Should prevent duplicate guest verification", async () => {
    const guestId = "GUEST001";
    
    await guestVerification.connect(hotelStaff).verifyGuest(
      guestId, "QmAadhaarHash1", "QmRetinaHash1", "John Doe", "+1234567890", "101"
    );
    
    await expect(
      guestVerification.connect(hotelStaff).verifyGuest(
        guestId, "QmAadhaarHash2", "QmRetinaHash2", "John Doe Updated", "+1234567890", "101"
      )
    ).to.be.revertedWith("Guest already exists");
  });

  it("Should update guest biometrics", async () => {
    const guestId = "GUEST001";
    
    await guestVerification.connect(hotelStaff).verifyGuest(
      guestId, "QmAadhaarHash1", "QmRetinaHash1", "John Doe", "+1234567890", "101"
    );
    
    const success = await guestVerification.connect(hotelStaff).updateGuestBiometrics(
      guestId, "QmAadhaarHash2", "QmRetinaHash2"
    );
    
    expect(success).to.be.true;
    
    const biometricData = await guestVerification.getGuestBiometricData(guestId);
    expect(biometricData.aadhaarHash).to.equal("QmAadhaarHash2");
    expect(biometricData.retinaScanHash).to.equal("QmRetinaHash2");
  });

  it("Should emit GuestDataUpdated event", async () => {
    const guestId = "GUEST001";
    
    await guestVerification.connect(hotelStaff).verifyGuest(
      guestId, "QmAadhaarHash1", "QmRetinaHash1", "John Doe", "+1234567890", "101"
    );
    
    const tx = await guestVerification.connect(hotelStaff).updateGuestBiometrics(
      guestId, "QmAadhaarHash2", "QmRetinaHash2"
    );
    
    await expect(tx)
      .to.emit(guestVerification, "GuestDataUpdated")
      .withArgs(guestId, hotelStaff.address, anyValue);
  });

  it("Should check in guest", async () => {
    const guestId = "GUEST001";
    
    await guestVerification.connect(hotelStaff).verifyGuest(
      guestId, "QmAadhaarHash", "QmRetinaHash", "John Doe", "+1234567890", "101"
    );
    
    await guestVerification.connect(hotelStaff).checkInGuest(guestId);
    
    const guestInfo = await guestVerification.getGuestInfo(guestId);
    expect(guestInfo.isActive).to.be.true;
    expect(guestInfo.checkInTime).to.be.gt(0);
  });

  it("Should prevent checking in non-existent guest", async () => {
    await expect(
      guestVerification.connect(hotelStaff).checkInGuest("NONEXISTENT")
    ).to.be.revertedWith("Guest does not exist");
  });

  it("Should check out guest", async () => {
    const guestId = "GUEST001";
    
    await guestVerification.connect(hotelStaff).verifyGuest(
      guestId, "QmAadhaarHash", "QmRetinaScan", "John Doe", "+1234567890", "101"
    );
    await guestVerification.connect(hotelStaff).checkInGuest(guestId);
    
    await guestVerification.connect(hotelStaff).checkOutGuest(guestId);
    
    const guestInfo = await guestVerification.getGuestInfo(guestId);
    expect(guestInfo.isActive).to.be.false;
    expect(guestInfo.checkOutTime).to.be.gt(0);
  });

  it("Should prevent checking out non-existent guest", async () => {
    await expect(
      guestVerification.connect(hotelStaff).checkOutGuest("NONEXISTENT")
    ).to.be.revertedWith("Guest does not exist");
  });

  it("Should prevent checking out guest that is not checked in", async () => {
    const guestId = "GUEST001";
    
    await guestVerification.connect(hotelStaff).verifyGuest(
      guestId, "QmAadhaarHash", "QmRetinaScan", "John Doe", "+1234567890", "101"
    );
    
    await expect(
      guestVerification.connect(hotelStaff).checkOutGuest(guestId)
    ).to.be.revertedWith("Guest is not checked in");
  });

  it("Should get guest biometric data", async () => {
    const guestId = "GUEST001";
    const aadhaarHash = "QmAadhaarHash";
    const retinaScanHash = "QmRetinaHash";
    
    await guestVerification.connect(hotelStaff).verifyGuest(
      guestId, aadhaarHash, retinaScanHash, "John Doe", "+1234567890", "101"
    );
    
    const biometricData = await guestVerification.getGuestBiometricData(guestId);
    expect(biometricData.aadhaarHash).to.equal(aadhaarHash);
    expect(biometricData.retinaScanHash).to.equal(retinaScanHash);
    expect(biometricData.isVerified).to.be.true;
    expect(biometricData.verifiedBy).to.equal(hotelStaff.address);
  });

  it("Should get all guests for a hotel", async () => {
    const hotelAddress = hotelStaff.address;
    
    await guestVerification.connect(hotelStaff).verifyGuest(
      "GUEST001", "QmHash1", "QmHash2", "John Doe", "+1234567890", "101"
    );
    await guestVerification.connect(hotelStaff).verifyGuest(
      "GUEST002", "QmHash3", "QmHash4", "Jane Doe", "+1234567891", "102"
    );
    
    const hotelGuests = await guestVerification.getHotelGuests(hotelAddress);
    expect(hotelGuests.length).to.equal(2);
    expect(hotelGuests).to.include("GUEST001");
    expect(hotelGuests).to.include("GUEST002");
  });

  it("Should get guest hotel mapping", async () => {
    const guestId = "GUEST001";
    
    await guestVerification.connect(hotelStaff).verifyGuest(
      guestId, "QmHash1", "QmHash2", "John Doe", "+1234567890", "101"
    );
    
    const hotelAddress = await guestVerification.getGuestHotel(guestId);
    expect(hotelAddress).to.equal(hotelStaff.address);
  });

  it("Should prevent unauthorized guest verification", async () => {
    await expect(
      guestVerification.connect(unauthorizedUser).verifyGuest(
        "GUEST001", "QmHash1", "QmHash2", "John Doe", "+1234567890", "101"
      )
    ).to.be.revertedWith("Only hotel staff can perform this action");
  });

  it("Should prevent unauthorized biometric updates", async () => {
    const guestId = "GUEST001";
    
    await guestVerification.connect(hotelStaff).verifyGuest(
      guestId, "QmHash1", "QmHash2", "John Doe", "+1234567890", "101"
    );
    
    await expect(
      guestVerification.connect(unauthorizedUser).updateGuestBiometrics(
        guestId, "QmNewHash1", "QmNewHash2"
      )
    ).to.be.revertedWith("Only hotel staff can perform this action");
  });

  it("Should prevent unauthorized check-in", async () => {
    const guestId = "GUEST001";
    
    await guestVerification.connect(hotelStaff).verifyGuest(
      guestId, "QmHash1", "QmHash2", "John Doe", "+1234567890", "101"
    );
    
    await expect(
      guestVerification.connect(unauthorizedUser).checkInGuest(guestId)
    ).to.be.revertedWith("Only hotel staff can perform this action");
  });

  it("Should prevent unauthorized check-out", async () => {
    const guestId = "GUEST001";
    
    await guestVerification.connect(hotelStaff).verifyGuest(
      guestId, "QmHash1", "QmHash2", "John Doe", "+1234567890", "101"
    );
    await guestVerification.connect(hotelStaff).checkInGuest(guestId);
    
    await expect(
      guestVerification.connect(unauthorizedUser).checkOutGuest(guestId)
    ).to.be.revertedWith("Only hotel staff can perform this action");
  });

  it("Should set access control contract", async () => {
    const newAccessControl = accessControl.address;
    
    await guestVerification.connect(owner).setAccessControl(newAccessControl);
    expect(await guestVerification.accessControl()).to.equal(newAccessControl);
  });

  it("Should set data storage contract", async () => {
    const newDataStorage = dataStorage.address;
    
    await guestVerification.connect(owner).setDataStorage(newDataStorage);
    expect(await guestVerification.dataStorage()).to.equal(newDataStorage);
  });

  it("Should prevent unauthorized access control changes", async () => {
    await expect(
      guestVerification.connect(hotelStaff).setAccessControl(accessControl.address)
    ).to.be.revertedWith("Only system admin can set access control");
  });

  it("Should prevent unauthorized data storage changes", async () => {
    await expect(
      guestVerification.connect(hotelStaff).setDataStorage(dataStorage.address)
    ).to.be.revertedWith("Only system admin can set data storage");
  });

  // Helper function for event matching
  function anyValue() {
    return true;
  }
});
