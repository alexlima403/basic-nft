import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { HardhatEthersHelpers } from "@nomiclabs/hardhat-ethers/types";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BasicNFT, SafeMintAttacker } from "../typechain";
import { MerkleTree } from 'merkletreejs';
import keccak256 from "keccak256";
import { encodeAddress } from "../utils"

let basicNFT: BasicNFT;
let safeMintAttacker: SafeMintAttacker;
let owner: SignerWithAddress;
let addr1: SignerWithAddress;
let addr2: SignerWithAddress;
let addr3: SignerWithAddress;
let addr4: SignerWithAddress;
let addrs: SignerWithAddress[];
let addr1Proof: string[];
let addr2Proof: string[];
let addr3Proof: string[];
let addr4Proof: string[];
let provider: HardhatEthersHelpers["provider"];

beforeEach(async function () {
  [owner, addr1, addr2, addr3, addr4, ...addrs] = await ethers.getSigners();
  provider = ethers.provider
  //BasicNFT deploy
  const BasicNFT = await ethers.getContractFactory("BasicNFT");
  basicNFT = await BasicNFT.deploy();
  await basicNFT.deployed();

  //SafeMintAttacker deploy
  const SafeMintAttacker = await ethers.getContractFactory("SafeMintAttacker");
  safeMintAttacker = await SafeMintAttacker.deploy();
  await safeMintAttacker.deployed();

  // Set up Merkle Tree
  let encodedAddresses = [encodeAddress(addr1.address), encodeAddress(addr3.address), encodeAddress(addr4.address)]
  let encodedAddress2 = [encodeAddress(addr2.address)]
  const merkleTree = new MerkleTree(encodedAddresses, keccak256, { hashLeaves: true, sortPairs: true });
  const newRoot = merkleTree.getHexRoot();
  await basicNFT.setWhitelistMerkleRoot(newRoot)
  const leaf = keccak256(encodedAddresses[0]);
  const leaf2 = keccak256(encodedAddress2[0]);
  const leaf3 = keccak256(encodedAddresses[1]);
  const leaf4 = keccak256(encodedAddresses[2]);
  addr2Proof = merkleTree.getHexProof(leaf2);
  addr1Proof = merkleTree.getHexProof(leaf);
  addr3Proof = merkleTree.getHexProof(leaf3);
  addr4Proof = merkleTree.getHexProof(leaf4);
});

describe("BasicNFT", function () {
  it("deployment - Should set the right owner", async function () {
    expect(await basicNFT.owner()).to.equal(owner.address);
  });
  it("deployment - Should have the correct name and symbol ", async function () {
    expect(await basicNFT.name()).to.equal("Basic Collection");
    expect(await basicNFT.symbol()).to.equal("BASIC");
  });
  it("deployment - Should have the correct initial variables", async function () {
    expect(await basicNFT.name()).to.equal("Basic Collection");
    expect(await basicNFT.symbol()).to.equal("BASIC");
    await expect(basicNFT.publicMint(1)).to.be.revertedWith("PublicSaleIsOff");
    await expect(basicNFT.connect(addr1).whitelistMint(1, addr1Proof))
      .to.be.revertedWith("WhitelistSaleIsOff");
  });
  it("publicMint - Should not mint if public sale is off", async function () {
    await expect(basicNFT.publicMint(1)).to.be.revertedWith("PublicSaleIsOff");
  });
  it("publicMint - Should not mint if sold out", async function () {
    await basicNFT.setSaleStatus(2);
    await basicNFT.publicMint(3, {
      value: ethers.utils.parseEther("0.3")
    })
    await basicNFT.connect(addr1).publicMint(3, {
      value: ethers.utils.parseEther("0.3")
    })
    await expect(basicNFT.connect(addr2).publicMint(1, {
      value: ethers.utils.parseEther("0.1")
    })).to.be.revertedWith("NotEnoughNFTsLeft");
  });
  it("publicMint - Should not mint if mint limit per wallet reached", async function () {
    await basicNFT.setSaleStatus(2);
    await basicNFT.publicMint(3, {
      value: ethers.utils.parseEther("0.3")
    })
    await expect(basicNFT.publicMint(1, {
      value: ethers.utils.parseEther("0.1")
    })).to.be.revertedWith("MintLimitPerWalletReached");
  });
  it("publicMint - Should not mint if transaction has not enough funds for minting", async function () {
    await basicNFT.setSaleStatus(2);
    await expect(basicNFT.publicMint(2, {
      value: ethers.utils.parseEther("0.1")
    })).to.be.revertedWith("NotEnoughFundsForMinting");
  });
  it("publicMint - Should not mint if request quantity is zero", async function () {
    await basicNFT.setSaleStatus(2);
    await expect(basicNFT.publicMint(0)).to.be.revertedWith("MintZeroQuantity");
  });
  it("publicMint - Should not mint more than paid for through reentrancy", async function () {
    await basicNFT.setSaleStatus(2);
    await expect(safeMintAttacker.initiateAttack(basicNFT.address, {
      value: ethers.utils.parseEther("0.1")
    })).to.be.revertedWith('ReentrancyGuard: reentrant call');
    expect(await basicNFT.balanceOf(safeMintAttacker.address)).to.be.equal(0)
  });
  it("publicMint - Should mint - wallet should be ownerof NFT", async function () {
    await basicNFT.setSaleStatus(2);
    await basicNFT.publicMint(1, {
      value: ethers.utils.parseEther("0.1")
    })
    await basicNFT.connect(addr1).publicMint(2, {
      value: ethers.utils.parseEther("0.2")
    })
    expect(await basicNFT.ownerOf(0)).to.be.equal(owner.address)
    expect(await basicNFT.ownerOf(1)).to.be.equal(addr1.address)
    expect(await basicNFT.ownerOf(2)).to.be.equal(addr1.address)
    expect(await basicNFT.balanceOf(owner.address)).to.be.equal(1)
    expect(await basicNFT.balanceOf(addr1.address)).to.be.equal(2)
  });
  it("publicMint - Should mint - totalSupply should be right", async function () {
    await basicNFT.setSaleStatus(2);
    await basicNFT.publicMint(1, {
      value: ethers.utils.parseEther("0.1")
    })
    await basicNFT.connect(addr1).publicMint(2, {
      value: ethers.utils.parseEther("0.2")
    })
    expect(await basicNFT.totalSupply()).to.be.equal(3)
  });
  it("publicMint - Should mint - emits the Transfer event", async () => {
    await basicNFT.setSaleStatus(2);
    await expect(basicNFT.publicMint(1, {
      value: ethers.utils.parseEther("0.1")
    }))
      .to.emit(basicNFT, "Transfer")
      .withArgs(ethers.constants.AddressZero, owner.address, "0");
    await expect(basicNFT.publicMint(1, {
      value: ethers.utils.parseEther("0.1")
    }))
      .to.emit(basicNFT, "Transfer")
      .withArgs(ethers.constants.AddressZero, owner.address, "1");
  });
  it("whitelistMint - Should not mint if whitelist sale is off", async function () {
    await expect(basicNFT.connect(addr1).whitelistMint(1, addr1Proof, {
      value: ethers.utils.parseEther("0.1")
    })).to.be.revertedWith("WhitelistSaleIsOff");
  });
  it("whitelistMint - Should only mint if wallet is on whitelist", async function () {
    await basicNFT.setSaleStatus(1);
    // Good Case - addr1 and addr3
    await basicNFT.connect(addr1).whitelistMint(2, addr1Proof, {
      value: ethers.utils.parseEther("0.16")
    })
    await basicNFT.connect(addr3).whitelistMint(1, addr3Proof, {
      value: ethers.utils.parseEther("0.08")
    })
    expect(await basicNFT.ownerOf(0)).to.be.equal(addr1.address)
    expect(await basicNFT.ownerOf(1)).to.be.equal(addr1.address)
    expect(await basicNFT.ownerOf(2)).to.be.equal(addr3.address)
    expect(await basicNFT.balanceOf(addr1.address)).to.be.equal(2)
    expect(await basicNFT.balanceOf(addr3.address)).to.be.equal(1)
    expect(await basicNFT.totalSupply()).to.be.equal(3)
    // Bad Case - addr2
    await expect(basicNFT.connect(addr2).whitelistMint(1, addr2Proof, {
      value: ethers.utils.parseEther("0.08")
    })).to.be.revertedWith("WalletNotOnWhitelist");
  });
  it("whitelistMint - Should not mint if sold out", async function () {
    await basicNFT.setSaleStatus(1);
    await basicNFT.connect(addr1).whitelistMint(3, addr1Proof, {
      value: ethers.utils.parseEther("0.24")
    })
    await basicNFT.connect(addr3).whitelistMint(3, addr3Proof, {
      value: ethers.utils.parseEther("0.24")
    })
    await expect(basicNFT.connect(addr4).whitelistMint(1, addr4Proof, {
      value: ethers.utils.parseEther("0.08")
    })).to.be.revertedWith("NotEnoughNFTsLeft");
  });
  it("whitelistMint - Should not mint if mint limit per wallet reached", async function () {
    await basicNFT.setSaleStatus(1);
    await basicNFT.connect(addr1).whitelistMint(3, addr1Proof, {
      value: ethers.utils.parseEther("0.24")
    })
    await expect(basicNFT.connect(addr1).whitelistMint(1, addr1Proof, {
      value: ethers.utils.parseEther("0.08")
    })).to.be.revertedWith("MintLimitPerWalletReached");
  });
  it("whitelistMint - Should not mint if transaction has not enough funds for minting", async function () {
    await basicNFT.setSaleStatus(1);
    await expect(basicNFT.connect(addr1).whitelistMint(2, addr1Proof, {
      value: ethers.utils.parseEther("0.08")
    })).to.be.revertedWith("NotEnoughFundsForMinting");
  });
  it("whitelistMint - Should not mint if request quantity is zero", async function () {
    await basicNFT.setSaleStatus(1);
    await expect(basicNFT.connect(addr1).whitelistMint(0, addr1Proof)).to.be.revertedWith("MintZeroQuantity");
  });
  it("setSaleStatus - Should not set new sale status if not owner", async function () {
    await expect(basicNFT.connect(addr1).setSaleStatus(1)).to.be.revertedWith('Ownable: caller is not the owner');
    await expect(basicNFT.publicMint(1)).to.be.revertedWith("PublicSaleIsOff");
    await expect(basicNFT.connect(addr1).whitelistMint(1, addr1Proof))
      .to.be.revertedWith("WhitelistSaleIsOff");
  });
  it("setSaleStatus - Should not set new sale status if new status is out of bounds", async function () {
    await expect(basicNFT.setSaleStatus(3)).to.be.revertedWith('InvalidSaleStatus');
  });
  it("setSaleStatus - Should set new sale status if owner", async function () {
    await basicNFT.setSaleStatus(2);
    await expect(basicNFT.publicMint(1, {
      value: ethers.utils.parseEther("0.1")
    })).to.emit(basicNFT, "Transfer")
      .withArgs(ethers.constants.AddressZero, owner.address, "0");
  });
  it("setWhitelistMerkleRoot - Should not set new merkle root if not owner", async function () {
    await expect(basicNFT.connect(addr1).setWhitelistMerkleRoot(ethers.utils.formatBytes32String('test')))
      .to.be.revertedWith('Ownable: caller is not the owner');
  });
  it("setRevealed - Should not set new revelead status if not owner", async function () {
    await expect(basicNFT.connect(addr1).setRevealed(true))
      .to.be.revertedWith('Ownable: caller is not the owner');
  });
  it("setBaseURI - Should not set new base URI if not owner", async function () {
    await expect(basicNFT.connect(addr1).setBaseURI('test.com'))
      .to.be.revertedWith('Ownable: caller is not the owner');
    await basicNFT.setSaleStatus(2);
    await basicNFT.setRevealed(true);
    await basicNFT.publicMint(1, {
      value: ethers.utils.parseEther("0.1")
    })
    await expect(await basicNFT.tokenURI(0)).to.be.equal('')
  });
  it("setBaseURI - Should set new base URI if owner", async function () {
    await basicNFT.setBaseURI('test.com/');
    await basicNFT.setSaleStatus(2);
    await basicNFT.setRevealed(true);
    await basicNFT.publicMint(1, {
      value: ethers.utils.parseEther("0.1")
    })
    await expect(await basicNFT.tokenURI(0)).to.be.equal('test.com/0')
  });
  it("setNotRevealedURI - Should not set new 'not revealed' URI if not owner", async function () {
    await expect(basicNFT.connect(addr1).setBaseURI('test.com')).to.be.revertedWith('Ownable: caller is not the owner');
    await basicNFT.setSaleStatus(2);
    await basicNFT.publicMint(1, {
      value: ethers.utils.parseEther("0.1")
    })
    await expect(await basicNFT.tokenURI(0)).to.be.equal('')
  });
  it("setNotRevealedURI - Should set new 'not revealed' URI if owner", async function () {
    await basicNFT.setNotRevealedURI('test.com/hidden');
    await basicNFT.setSaleStatus(2);
    await basicNFT.publicMint(1, {
      value: ethers.utils.parseEther("0.1")
    })
    await expect(await basicNFT.tokenURI(0)).to.be.equal('test.com/hidden')
  });
  it("isOnWhitelist - Should set return if wallet is in the whitelist", async function () {
    await expect(await basicNFT.isOnWhitelist(addr1.address, addr1Proof)).to.be.true;
    await expect(await basicNFT.isOnWhitelist(addr2.address, addr2Proof)).to.be.false;
    await expect(await basicNFT.isOnWhitelist(addr3.address, addr3Proof)).to.be.true;
    await expect(await basicNFT.isOnWhitelist(addr4.address, addr4Proof)).to.be.true;
  });
  it("withdraw - Should not withdraw balance if not owner", async function () {
    await basicNFT.setSaleStatus(2);
    await basicNFT.connect(addr1).publicMint(1, {
      value: ethers.utils.parseEther("0.1")
    })
    await basicNFT.connect(addr2).publicMint(2, {
      value: ethers.utils.parseEther("0.2")
    })
    await expect(basicNFT.connect(addr3).withdraw()).to.be.revertedWith('Ownable: caller is not the owner')
  });
  it("withdraw - Should withdraw balance to owner wallet", async function () {
    await basicNFT.setSaleStatus(2);
    await basicNFT.connect(addr1).publicMint(1, {
      value: ethers.utils.parseEther("0.1")
    })
    await basicNFT.connect(addr2).publicMint(2, {
      value: ethers.utils.parseEther("0.2")
    })
    expect((await basicNFT.withdraw())).to.changeEtherBalances([basicNFT, owner], [-0.3, 0.3]);
  });
  it("giftNFT - Should not gift if not owner", async function () {
    await expect(basicNFT.connect(addr1).giftNFT(addr1.address, 1))
      .to.be.revertedWith('Ownable: caller is not the owner')
    expect((await basicNFT.balanceOf(addr1.address))).to.be.equal(0);
  });
  it("giftNFT - Should gift if owner", async function () {
    await basicNFT.giftNFT(addr1.address, 1)
    expect((await basicNFT.balanceOf(addr1.address))).to.be.equal(1);
  });
  it("giftNFT - Should not gift too many", async function () {
    await expect((basicNFT.giftNFT(addr1.address, 5)))
      .to.be.revertedWith("GiftingTooManyAtOnce")
  });
});
