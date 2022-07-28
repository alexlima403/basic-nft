# Basic NFT Hardhat Project
```shell
/////////////////////////////////////////////////////
//  ____            _        _   _ ______ _______  //
// |  _ \          (_)      | \ | |  ____|__   __| //
// | |_) | __ _ ___ _  ___  |  \| | |__     | |    //
// |  _ < / _` / __| |/ __| | . ` |  __|    | |    //
// | |_) | (_| \__ \ | (__  | |\  | |       | |    //
// |____/ \__,_|___/_|\___| |_| \_|_|       |_|    //
/////////////////////////////////////////////////////
```
This project contains a basic NFT contract, built with saving gas costs and security in mind.
Built on the advanced Hardhat Typescript template, it contains tests and utilities for code safety
and extra functionalities.

# How to use:

## Customizing NFT collection values

The default values for **minting cost, whitelist minting cost, minting limit per wallet and collection size**
can be changed by changing the value of the following variables under the `contracts/BasicNFT.sol` contract: 

```shell
uint256 private constant MINT_COST = <NFT mint cost> ether; 
uint256 private constant WHITELIST_MINT_COST = <Whitelist mint cost> ether;
uint256 private constant MINT_LIMIT_PER_WALLET = <Mint limit per wallet>; 
uint256 private constant COLLECTION_SIZE = <Collection size>;
```

For the **collection name** and **symbol**, the have to be changed in the constructor function:

```shell
constructor() ERC721A(<Collection name>, <Collection symbol>) {}
```

If needed for convenience, all declared private variables can be changed to public to have their values callable. 

## Running Tests

The tests covering the functionality of the contract code under `test/index.ts` can be run with the command:

```shell
npx hardhat test
```

## Deploying contract

The contract can be deployed in the configured networks on the `hardhat.config.ts` file.
The `<network name>` can be replaced in the command below with the correspondent network entry in the configuration:

```shell
npx hardhat run --network <network name> scripts/deploy.ts
```

## Verifying contract on Etherscan

As soon as the contract is deployed, it can be verified with the following command:

```shell
npx hardhat verify --network <network name> <deployed contract address> 
```


On top of the default tasks provided by the Hardhat Template, following tasks are included:

## Generating Merkle Root for Whitelist

A **Merkle Root** for the whitelisting function can be generated based on a whitelist text (.txt) file.
The text file must be formatted so each line contains an address.

For example:

```shell
0x0000000000000000000000000000000000000001
0x0000000000000000000000000000000000000002
0x0000000000000000000000000000000000000003
...and so on
```

The Merkle Root can be generated on the console with the following command:

```shell
npx hardhat merkleroot <path to whitelist file>
```

## Generate Merkle Leaf whitelisted address Proof

The **Merkle Leaf Proof** for minting with a whitelisted address can be generated on the console with the following command:

```shell
npx hardhat merkleleaf <wallet address> <path to whitelist file>
```

## Configuration

The variables under `hardhat.config.ts` are environment variables. For local testing please create an `.env` file in the root directory with the following fields:

```shell
ETHERSCAN_API_KEY=<your Etherscan API key>
MAINNET_URL=<Main Network Ether Node Provider URL>
GOERLI_URL=<Goerli Network Ether Node Provider URL>
RINKEBY_URL=<Rinkeby Network Ether Node Provider URL>
PRIVATE_KEY=<Deployer Wallet Private Key>
REPORT_GAS=<boolean>
```
