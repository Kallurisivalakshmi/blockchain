pragma solidity ^0.8.0;

contract theifDetails {
    struct Theif {
        string name;
        string aadhar;
        uint256 accountaddress;
    }

    Theif[] public theif;
    mapping (string => uint256) public accountaddress;
    uint256[] theifsAccts;

   

    function insertDetails(uint256 _accountaddress, string memory _name, string memory _aadhar) public {
       theif.push(Theif( _name, _aadhar, _accountaddress));
    } 

    function  updateDetails(uint256 _accountaddress, string memory _name, string memory _aadhar) public {
       theif.push(Theif(_name, _aadhar, _accountaddress));
    }
    
    function getupdateDetails(uint256 _accountaddress, string memory _name, string memory _aadhar)  public {
      theif.push(Theif(_name, _aadhar, _accountaddress));
    }

    function gettheifs(uint256 _accountaddress, string memory _name, string memory _aadhar) public  {
                theif.push(Theif(_name, _aadhar, _accountaddress));
    }

    function counttheifs(uint256 _accountaddress, string memory _name, string memory _aadhar) public {
        theif.push(Theif(_name, _aadhar, _accountaddress));
    }  

    function validatetheif(uint256 _accountaddress) public returns (bool) {
        (validatetheif(_accountaddress));
     }
}

