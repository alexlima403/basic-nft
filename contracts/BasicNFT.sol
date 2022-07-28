// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "erc721a/contracts/ERC721A.sol";

/////////////////////////////////////////////////////
//  ____            _        _   _ ______ _______  //
// |  _ \          (_)      | \ | |  ____|__   __| //
// | |_) | __ _ ___ _  ___  |  \| | |__     | |    //
// |  _ < / _` / __| |/ __| | . ` |  __|    | |    //
// | |_) | (_| \__ \ | (__  | |\  | |       | |    //
// |____/ \__,_|___/_|\___| |_| \_|_|       |_|    //
/////////////////////////////////////////////////////

contract BasicNFT is ERC721A, Ownable, ReentrancyGuard {
    using Strings for uint256;
    enum SaleStatus {
        OFF,
        WHITELIST,
        PUBLIC
    }
    // "Private" Variables
    SaleStatus private saleStatus;
    uint256 private constant MINT_COST = 0.1 ether; // 0.05-0.1 sweet spot
    uint256 private constant WHITELIST_MINT_COST = 0.08 ether;
    uint256 private constant MINT_LIMIT_PER_WALLET = 3; // 5-10 sweet spot
    uint256 private constant COLLECTION_SIZE = 6;
    bool private revealed;
    string private baseURI;
    string private notRevealedURI;
    bytes32 private whitelistMerkleRoot;

    constructor() ERC721A("Basic Collection", "BASIC") {}

    /// @notice Mint a NFT through public mint
    /// @param qty - number of NFTs to be minted
    function publicMint(uint256 qty) external payable nonReentrant {
        if (saleStatus != SaleStatus.PUBLIC) revert PublicSaleIsOff();
        if (totalSupply() + qty > COLLECTION_SIZE) revert NotEnoughNFTsLeft();
        if (_numberMinted(msg.sender) + qty > MINT_LIMIT_PER_WALLET)
            revert MintLimitPerWalletReached();
        if (msg.value < MINT_COST * qty) revert NotEnoughFundsForMinting();
        _safeMint(msg.sender, qty);
    }

    /// @notice Mint a NFT through whitelist mint
    /// @param qty - number of NFTs to be minted
    /// @param proof - proof that minting wallet is on whitelist
    function whitelistMint(uint256 qty, bytes32[] calldata proof)
        external
        payable
        nonReentrant
    {
        if (saleStatus != SaleStatus.WHITELIST) revert WhitelistSaleIsOff();
        if (!verifyWhitelist(msg.sender, proof)) revert WalletNotOnWhitelist();
        if (totalSupply() + qty > COLLECTION_SIZE) revert NotEnoughNFTsLeft();
        if (_numberMinted(msg.sender) + qty > MINT_LIMIT_PER_WALLET)
            revert MintLimitPerWalletReached();
        if (msg.value < WHITELIST_MINT_COST * qty) revert NotEnoughFundsForMinting();
        _safeMint(msg.sender, qty);
    }

    /// @notice Set sale status
    /// @param status - new sale status can be 0(Off), 1(Whitelist), or 2(Public)
    function setSaleStatus(uint256 status) external onlyOwner {
        if (status > uint256(SaleStatus.PUBLIC)) revert InvalidSaleStatus();
        saleStatus = SaleStatus(status);
    }

    /// @notice Set whitelist merkle root
    /// @param _whitelistMerkleRoot - new whitelist merkle root
    function setWhitelistMerkleRoot(bytes32 _whitelistMerkleRoot)
        external
        onlyOwner
    {
        whitelistMerkleRoot = _whitelistMerkleRoot;
    }

    /// @notice Set revealed
    /// @param _revealed - if set to true metadata is formatted for reveal otherwise metadata is formatted for a preview
    function setRevealed(bool _revealed) external onlyOwner {
        revealed = _revealed;
    }

    /// @notice Set NFT base url
    /// @param _baseURI new NFT base url
    function setBaseURI(string calldata _baseURI) external onlyOwner {
        baseURI = _baseURI;
    }

    /// @notice Set NFT "not revealed" url
    /// @param _notRevealedURI - new NFT base url
    function setNotRevealedURI(string calldata _notRevealedURI)
        external
        onlyOwner
    {
        notRevealedURI = _notRevealedURI;
    }
 
    /// @notice Withdraw funds to owner wallet
    function withdraw() external onlyOwner nonReentrant {
        (bool success, ) = payable(msg.sender).call{
            value: address(this).balance
        }("");
        if (!success) revert WithdrawFailed();
    }

    /// @notice Gift specified number of NFTs to a wallet
    /// @param wallet - wallet address to reserve for
    /// @param qty - total number of NFTs to gift
    function giftNFT(address wallet, uint256 qty)
        external
        onlyOwner
        nonReentrant
    {
        if (totalSupply() + qty > COLLECTION_SIZE) revert NotEnoughNFTsLeft();
        if (qty > MINT_LIMIT_PER_WALLET) revert GiftingTooManyAtOnce();
        _safeMint(wallet, qty);
    }

    /// @notice Check if wallet is on whitelist
    /// @param proof - proof that wallet is on whitelist
    function isOnWhitelist(address wallet, bytes32[] calldata proof)
        external
        view
        returns (bool)
    {
        return verifyWhitelist(wallet, proof);
    }

    /// @notice Token URI
    /// @param tokenId - token Id of NFT to retrieve metadata for
    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override
        returns (string memory)
    {
        if (!_exists(tokenId)) revert URIQueryForNonexistentToken();
        if (!revealed) return string(abi.encodePacked(notRevealedURI));
        if (bytes(baseURI).length <= 0) return "";
        return string(abi.encodePacked(baseURI, tokenId.toString()));
    }

    /// @dev Internal function to verify whitelist wallets
    function verifyWhitelist(address walletAddress, bytes32[] memory proof)
        internal
        view
        returns (bool)
    {
        bytes32 leaf = keccak256(abi.encodePacked(walletAddress));
        return MerkleProof.verify(proof, whitelistMerkleRoot, leaf);
    }
}

// Custom errors
error PublicSaleIsOff();
error WhitelistSaleIsOff();
error NotEnoughNFTsLeft();
error WalletNotOnWhitelist();
error MintLimitPerWalletReached();
error NotEnoughFundsForMinting();
error InvalidSaleStatus();
error GiftingTooManyAtOnce();
error WithdrawFailed();
