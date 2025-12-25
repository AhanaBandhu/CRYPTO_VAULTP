// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract CryptoVault is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    
    Counters.Counter private _tokenIdCounter;
    
    struct Receipt {
        uint256 tokenId;
        string title;
        string receiptHash;
        uint256 timestamp;
        address uploader;
        string ipfsHash;
        bool isVerified;
    }
    
    mapping(uint256 => Receipt) public receipts;
    mapping(string => bool) public hashExists;
    mapping(address => uint256[]) public userReceipts;
    
    event ReceiptUploaded(
        uint256 indexed tokenId,
        string title,
        string receiptHash,
        address uploader,
        uint256 timestamp
    );
    
    event ReceiptVerified(uint256 indexed tokenId, address verifier);
    
    constructor() ERC721("CryptoVault Receipt", "CVR") {}
    
    function uploadReceipt(
        string memory _title,
        string memory _receiptHash,
        string memory _ipfsHash
    ) public returns (uint256) {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_receiptHash).length > 0, "Receipt hash cannot be empty");
        require(!hashExists[_receiptHash], "Receipt with this hash already exists");
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, _ipfsHash);
        
        receipts[tokenId] = Receipt({
            tokenId: tokenId,
            title: _title,
            receiptHash: _receiptHash,
            timestamp: block.timestamp,
            uploader: msg.sender,
            ipfsHash: _ipfsHash,
            isVerified: false
        });
        
        hashExists[_receiptHash] = true;
        userReceipts[msg.sender].push(tokenId);
        
        emit ReceiptUploaded(tokenId, _title, _receiptHash, msg.sender, block.timestamp);
        
        return tokenId;
    }
    
    function verifyReceipt(uint256 _tokenId) public {
        require(_exists(_tokenId), "Receipt does not exist");
        require(ownerOf(_tokenId) == msg.sender, "Only owner can verify");
        
        receipts[_tokenId].isVerified = true;
        emit ReceiptVerified(_tokenId, msg.sender);
    }
    
    function getReceipt(uint256 _tokenId) public view returns (Receipt memory) {
        require(_exists(_tokenId), "Receipt does not exist");
        return receipts[_tokenId];
    }
    
    function getUserReceipts(address _user) public view returns (uint256[] memory) {
        return userReceipts[_user];
    }
    
    function getTotalReceipts() public view returns (uint256) {
        return _tokenIdCounter.current();
    }
    
    function validateReceiptHash(string memory _hash) public view returns (bool) {
        return hashExists[_hash];
    }
    
    // Override required functions
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }
    
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}