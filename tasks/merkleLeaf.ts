import { task } from "hardhat/config";
import keccak256 from "keccak256";
import { encodeAddress, generateMerkleTree } from "../utils";

interface TaskArgs {
    address: string
    whitelistPath: string
}

task("merkleleaf", "Generate Merkle Leaf for Address")
    .addPositionalParam("address")
    .addPositionalParam("whitelistPath")
    .setAction(async (taskArgs: TaskArgs) => {
        let encodedAddress = encodeAddress(taskArgs.address);
        const merkleTree = generateMerkleTree(taskArgs.whitelistPath);
        const leaf = keccak256(encodedAddress);
        const addrProof = merkleTree.getHexProof(leaf);
        console.log("Merkle leaf proof generated:", addrProof[0]);
    });
