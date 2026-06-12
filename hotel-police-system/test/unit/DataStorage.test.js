// SPDX-License-Identifier: MIT
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DataStorage Unit Tests", function () {
  let dataStorage, accessControl, owner, hotelStaff, policeOfficer, unauthorizedUser;
  const Role = { None: 0, HotelStaff: 1, HotelManager: 2, PoliceOfficer: 3, PoliceAdmin: 4, SystemAdmin: 5 };
  const DataType = { AadhaarData: 0, RetinaScan: 1, GuestPhoto: 2, IdentificationDoc: 3, StayHistory: 4, EmergencyContact: 5 };

  beforeEach(async () => {
    [owner, hotelStaff, policeOfficer, unauthorizedUser] = await ethers.getSigners();
    const AccessControl = await ethers.getContractFactory("AccessControl");
    accessControl = await AccessControl.deploy();
    
    const DataStorage = await ethers.getContractFactory("DataStorage");
    dataStorage = await DataStorage.deploy(accessControl.address);
    
    await accessControl.assignRole(hotelStaff.address, Role.HotelStaff);
    await accessControl.assignRole(policeOfficer.address, Role.PoliceOfficer);
  });

  it("Should deploy with correct access control reference", async () => {
    expect(await dataStorage.accessControl()).to.equal(accessControl.address);
  });

  it("Should store data successfully", async () => {
    const guestId = "GUEST001";
    const ipfsHash = "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco";
    
    const dataId = await dataStorage.connect(hotelStaff).storeData(
      guestId,
      DataType.AadhaarData,
      ipfsHash,
      1024,
      "AES-256-CBC",
      "QmEncryptionKeyHash",
      86400
    );
    
    expect(dataId).to.not.be.empty;
    const dataRef = await dataStorage.getDataReference(dataId);
    expect(dataRef.ipfsHash).to.equal(ipfsHash);
    expect(dataRef.dataType).to.equal(DataType.AadhaarData);
    expect(dataRef.size).to.equal(1024);
    expect(dataRef.encryptionAlgorithm).to.equal("AES-256-CBC");
    expect(dataRef.uploadedBy).to.equal(hotelStaff.address);
  });

  it("Should retrieve data reference correctly", async () => {
    const guestId = "GUEST001";
    const ipfsHash = "QmTestHash";
    
    const dataId = await dataStorage.connect(hotelStaff).storeData(
      guestId, DataType.RetinaScan, ipfsHash, 2048, "AES-256", "QmKeyHash", 86400
    );
    
    const dataRef = await dataStorage.getDataReference(dataId);
    expect(dataRef.ipfsHash).to.equal(ipfsHash);
    expect(dataRef.guestId).to.equal(guestId);
    expect(dataRef.dataType).to.equal(DataType.RetinaScan);
  });

  it("Should retrieve data metadata correctly", async () => {
    const guestId = "GUEST001";
    const retentionPeriod = 86400;
    
    const dataId = await dataStorage.connect(hotelStaff).storeData(
      guestId, DataType.GuestPhoto, "QmHash", 512, "SHA-256", "QmKeyHash", retentionPeriod
    );
    
    const metadata = await dataStorage.getDataMetadata(dataId);
    expect(metadata.dataId).to.equal(dataId);
    expect(metadata.guestId).to.equal(guestId);
    expect(metadata.retentionPeriod).to.equal(retentionPeriod);
    expect(metadata.isActive).to.be.true;
  });

  it("Should get all data for a guest", async () => {
    const guestId = "GUEST001";
    
    await dataStorage.connect(hotelStaff).storeData(
      guestId, DataType.AadhaarData, "QmHash1", 1024, "AES-256", "QmKey1", 86400
    );
    await dataStorage.connect(hotelStaff).storeData(
      guestId, DataType.RetinaScan, "QmHash2", 2048, "AES-256", "QmKey2", 86400
    );
    
    const guestData = await dataStorage.getGuestData(guestId);
    expect(guestData.length).to.equal(2);
  });

  it("Should get data by type for a guest", async () => {
    const guestId = "GUEST001";
    
    await dataStorage.connect(hotelStaff).storeData(
      guestId, DataType.AadhaarData, "QmHash1", 1024, "AES-256", "QmKey1", 86400
    );
    await dataStorage.connect(hotelStaff).storeData(
      guestId, DataType.AadhaarData, "QmHash2", 1024, "AES-256", "QmKey2", 86400
    );
    await dataStorage.connect(hotelStaff).storeData(
      guestId, DataType.RetinaScan, "QmHash3", 2048, "AES-256", "QmKey3", 86400
    );
    
    const aadhaarData = await dataStorage.getGuestDataByType(guestId, DataType.AadhaarData);
    expect(aadhaarData.length).to.equal(2);
    
    const retinaData = await dataStorage.getGuestDataByType(guestId, DataType.RetinaScan);
    expect(retinaData.length).to.equal(1);
  });

  it("Should update retention period", async () => {
    const guestId = "GUEST001";
    const newRetention = 172800; // 2 days
    
    const dataId = await dataStorage.connect(hotelStaff).storeData(
      guestId, DataType.AadhaarData, "QmHash", 1024, "AES-256", "QmKeyHash", 86400
    );
    
    await dataStorage.connect(hotelStaff).updateRetentionPeriod(dataId, newRetention);
    
    const metadata = await dataStorage.getDataMetadata(dataId);
    expect(metadata.retentionPeriod).to.equal(newRetention);
  });

  it("Should deactivate data", async () => {
    const guestId = "GUEST001";
    
    const dataId = await dataStorage.connect(hotelStaff).storeData(
      guestId, DataType.AadhaarData, "QmHash", 1024, "AES-256", "QmKeyHash", 86400
    );
    
    await dataStorage.connect(hotelStaff).setDataActiveStatus(dataId, false);
    
    const metadata = await dataStorage.getDataMetadata(dataId);
    expect(metadata.isActive).to.be.false;
  });

  it("Should delete data", async () => {
    const guestId = "GUEST001";
    
    const dataId = await dataStorage.connect(hotelStaff).storeData(
      guestId, DataType.AadhaarData, "QmHash", 1024, "AES-256", "QmKeyHash", 86400
    );
    
    await dataStorage.connect(hotelStaff).deleteData(dataId);
    
    // Data should be marked as inactive
    const metadata = await dataStorage.getDataMetadata(dataId);
    expect(metadata.isActive).to.be.false;
  });

  it("Should use default retention period when zero is provided", async () => {
    const guestId = "GUEST001";
    const defaultRetention = await dataStorage.defaultRetentionPeriod();
    
    const dataId = await dataStorage.connect(hotelStaff).storeData(
      guestId, DataType.AadhaarData, "QmHash", 1024, "AES-256", "QmKeyHash", 0
    );
    
    const metadata = await dataStorage.getDataMetadata(dataId);
    expect(metadata.retentionPeriod).to.equal(defaultRetention);
  });

  it("Should emit DataStored event", async () => {
    const guestId = "GUEST001";
    const ipfsHash = "QmTestHash";
    
    const tx = await dataStorage.connect(hotelStaff).storeData(
      guestId, DataType.AadhaarData, ipfsHash, 1024, "AES-256", "QmKeyHash", 86400
    );
    
    await expect(tx)
      .to.emit(dataStorage, "DataStored")
      .withArgs(anyValue, guestId, DataType.AadhaarData, ipfsHash);
  });

  it("Should emit DataDeleted event", async () => {
    const guestId = "GUEST001";
    
    const dataId = await dataStorage.connect(hotelStaff).storeData(
      guestId, DataType.AadhaarData, "QmHash", 1024, "AES-256", "QmKeyHash", 86400
    );
    
    const tx = await dataStorage.connect(hotelStaff).deleteData(dataId);
    
    await expect(tx)
      .to.emit(dataStorage, "DataDeleted")
      .withArgs(dataId, hotelStaff.address, anyValue);
  });

  it("Should emit RetentionUpdated event", async () => {
    const guestId = "GUEST001";
    const newRetention = 172800;
    
    const dataId = await dataStorage.connect(hotelStaff).storeData(
      guestId, DataType.AadhaarData, "QmHash", 1024, "AES-256", "QmKeyHash", 86400
    );
    
    const tx = await dataStorage.connect(hotelStaff).updateRetentionPeriod(dataId, newRetention);
    
    await expect(tx)
      .to.emit(dataStorage, "RetentionUpdated")
      .withArgs(dataId, newRetention, hotelStaff.address);
  });

  // Helper function for event matching
  function anyValue() {
    return true;
  }
});
