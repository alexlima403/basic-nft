import { task } from "hardhat/config";
import { generateMerkleTree } from "../utils";

interface TaskArgs {
    whitelistPath: string
}

task("merkleroot", "Generate Merkle Root from Whitelist")
    .addPositionalParam("whitelistPath")
    .setAction(async (taskArgs: TaskArgs) => {
        const newRoot = generateMerkleTree(taskArgs.whitelistPath).getHexRoot();
        console.log("Merkle root generated:", newRoot)
    });
