package main

import (
	"encoding/json"
	"fmt"
	"log"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// GuestContract defines the smart contract structure
type GuestContract struct {
	contractapi.Contract
}

// Guest represents a guest in the hotel system
type Guest struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	Phone     string `json:"phone"`
	RoomNumber string `json:"roomNumber"`
	CheckIn   string `json:"checkIn"`
	CheckOut  string `json:"checkOut"`
	Status    string `json:"status"`
}

// InitLedger initializes the chaincode
func (c *GuestContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	log.Println("GuestContract initialized")
	return nil
}

// CreateGuest creates a new guest record
func (c *GuestContract) CreateGuest(ctx contractapi.TransactionContextInterface, id string, name string, email string, phone string, roomNumber string, checkIn string, checkOut string, status string) error {
	guest := Guest{
		ID:        id,
		Name:      name,
		Email:     email,
		Phone:     phone,
		RoomNumber: roomNumber,
		CheckIn:   checkIn,
		CheckOut:  checkOut,
		Status:    status,
	}

	guestJSON, err := json.Marshal(guest)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(id, guestJSON)
}

// ReadGuest retrieves a guest by ID
func (c *GuestContract) ReadGuest(ctx contractapi.TransactionContextInterface, id string) (*Guest, error) {
	guestJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if guestJSON == nil {
		return nil, fmt.Errorf("guest %s does not exist", id)
	}

	var guest Guest
	err = json.Unmarshal(guestJSON, &guest)
	if err != nil {
		return nil, err
	}

	return &guest, nil
}

// UpdateGuest updates an existing guest
func (c *GuestContract) UpdateGuest(ctx contractapi.TransactionContextInterface, id string, name string, email string, phone string, roomNumber string, checkIn string, checkOut string, status string) error {
	guest := Guest{
		ID:        id,
		Name:      name,
		Email:     email,
		Phone:     phone,
		RoomNumber: roomNumber,
		CheckIn:   checkIn,
		CheckOut:  checkOut,
		Status:    status,
	}

	guestJSON, err := json.Marshal(guest)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(id, guestJSON)
}

// DeleteGuest removes a guest from the ledger
func (c *GuestContract) DeleteGuest(ctx contractapi.TransactionContextInterface, id string) error {
	return ctx.GetStub().DelState(id)
}

// GetAllGuests returns all guests in the ledger
func (c *GuestContract) GetAllGuests(ctx contractapi.TransactionContextInterface) ([]*Guest, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var guests []*Guest
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var guest Guest
		err = json.Unmarshal(queryResponse.Value, &guest)
		if err != nil {
			return nil, err
		}
		guests = append(guests, &guest)
	}

	return guests, nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(&GuestContract{})
	if err != nil {
		log.Fatalf("Error creating guest chaincode: %v", err)
	}

	if err := chaincode.Start(); err != nil {
		log.Fatalf("Error starting guest chaincode: %v", err)
	}
}