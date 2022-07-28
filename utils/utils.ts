import { ethers } from "ethers";
import keccak256 from "keccak256";
import MerkleTree from "merkletreejs";

// Encode Address for Merkle Root functionality
export const encodeAddress = (address: string): string => {
    return ethers.utils.solidityPack(
        ["address"],
        [address]
    );
}

// Generate Merkle Tree based on whitelist file
export const generateMerkleTree = (whitelistPath: string): MerkleTree => {
    const fs = require('fs')
    const whiteListAddresses: string[] = fs.readFileSync(whitelistPath)
        .toString()
        .split("\r\n");
    const encodedAddresses = whiteListAddresses.map((addr: string) => encodeAddress(addr));
    return new MerkleTree(
        encodedAddresses,
        keccak256,
        { hashLeaves: true, sortPairs: true }
    );
}