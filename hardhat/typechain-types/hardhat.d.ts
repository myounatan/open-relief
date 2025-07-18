/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { ethers } from "ethers";
import {
  DeployContractOptions,
  FactoryOptions,
  HardhatEthersHelpers as HardhatEthersHelpersBase,
} from "@nomicfoundation/hardhat-ethers/types";

import * as Contracts from ".";

declare module "hardhat/types/runtime" {
  interface HardhatEthersHelpers extends HardhatEthersHelpersBase {
    getContractFactory(
      name: "Ownable",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.Ownable__factory>;
    getContractFactory(
      name: "IERC20",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.IERC20__factory>;
    getContractFactory(
      name: "Ownable",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.Ownable__factory>;
    getContractFactory(
      name: "IERC1155Errors",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.IERC1155Errors__factory>;
    getContractFactory(
      name: "IERC20Errors",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.IERC20Errors__factory>;
    getContractFactory(
      name: "IERC721Errors",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.IERC721Errors__factory>;
    getContractFactory(
      name: "ERC20",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.ERC20__factory>;
    getContractFactory(
      name: "IERC20Metadata",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.IERC20Metadata__factory>;
    getContractFactory(
      name: "IERC20",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.IERC20__factory>;
    getContractFactory(
      name: "ECDSA",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.ECDSA__factory>;
    getContractFactory(
      name: "SelfVerificationRoot",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.SelfVerificationRoot__factory>;
    getContractFactory(
      name: "IDscCircuitVerifier",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.IDscCircuitVerifier__factory>;
    getContractFactory(
      name: "IIdentityVerificationHubV2",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.IIdentityVerificationHubV2__factory>;
    getContractFactory(
      name: "IRegisterCircuitVerifier",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.IRegisterCircuitVerifier__factory>;
    getContractFactory(
      name: "ISelfVerificationRoot",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.ISelfVerificationRoot__factory>;
    getContractFactory(
      name: "IdentityVerifier",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.IdentityVerifier__factory>;
    getContractFactory(
      name: "Lock",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.Lock__factory>;
    getContractFactory(
      name: "MockCCTPTransmitter",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.MockCCTPTransmitter__factory>;
    getContractFactory(
      name: "MockIdentityVerificationHub",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.MockIdentityVerificationHub__factory>;
    getContractFactory(
      name: "MockUSDC",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.MockUSDC__factory>;
    getContractFactory(
      name: "IMessageHandlerV2",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.IMessageHandlerV2__factory>;
    getContractFactory(
      name: "ReliefPools",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.ReliefPools__factory>;
    getContractFactory(
      name: "TypedMemView",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.TypedMemView__factory>;

    getContractAt(
      name: "Ownable",
      address: string | ethers.Addressable,
      signer?: ethers.Signer
    ): Promise<Contracts.Ownable>;
    getContractAt(
      name: "IERC20",
      address: string | ethers.Addressable,
      signer?: ethers.Signer
    ): Promise<Contracts.IERC20>;
    getContractAt(
      name: "Ownable",
      address: string | ethers.Addressable,
      signer?: ethers.Signer
    ): Promise<Contracts.Ownable>;
    getContractAt(
      name: "IERC1155Errors",
      address: string | ethers.Addressable,
      signer?: ethers.Signer
    ): Promise<Contracts.IERC1155Errors>;
    getContractAt(
      name: "IERC20Errors",
      address: string | ethers.Addressable,
      signer?: ethers.Signer
    ): Promise<Contracts.IERC20Errors>;
    getContractAt(
      name: "IERC721Errors",
      address: string | ethers.Addressable,
      signer?: ethers.Signer
    ): Promise<Contracts.IERC721Errors>;
    getContractAt(
      name: "ERC20",
      address: string | ethers.Addressable,
      signer?: ethers.Signer
    ): Promise<Contracts.ERC20>;
    getContractAt(
      name: "IERC20Metadata",
      address: string | ethers.Addressable,
      signer?: ethers.Signer
    ): Promise<Contracts.IERC20Metadata>;
    getContractAt(
      name: "IERC20",
      address: string | ethers.Addressable,
      signer?: ethers.Signer
    ): Promise<Contracts.IERC20>;
    getContractAt(
      name: "ECDSA",
      address: string | ethers.Addressable,
      signer?: ethers.Signer
    ): Promise<Contracts.ECDSA>;
    getContractAt(
      name: "SelfVerificationRoot",
      address: string | ethers.Addressable,
      signer?: ethers.Signer
    ): Promise<Contracts.SelfVerificationRoot>;
    getContractAt(
      name: "IDscCircuitVerifier",
      address: string | ethers.Addressable,
      signer?: ethers.Signer
    ): Promise<Contracts.IDscCircuitVerifier>;
    getContractAt(
      name: "IIdentityVerificationHubV2",
      address: string | ethers.Addressable,
      signer?: ethers.Signer
    ): Promise<Contracts.IIdentityVerificationHubV2>;
    getContractAt(
      name: "IRegisterCircuitVerifier",
      address: string | ethers.Addressable,
      signer?: ethers.Signer
    ): Promise<Contracts.IRegisterCircuitVerifier>;
    getContractAt(
      name: "ISelfVerificationRoot",
      address: string | ethers.Addressable,
      signer?: ethers.Signer
    ): Promise<Contracts.ISelfVerificationRoot>;
    getContractAt(
      name: "IdentityVerifier",
      address: string | ethers.Addressable,
      signer?: ethers.Signer
    ): Promise<Contracts.IdentityVerifier>;
    getContractAt(
      name: "Lock",
      address: string | ethers.Addressable,
      signer?: ethers.Signer
    ): Promise<Contracts.Lock>;
    getContractAt(
      name: "MockCCTPTransmitter",
      address: string | ethers.Addressable,
      signer?: ethers.Signer
    ): Promise<Contracts.MockCCTPTransmitter>;
    getContractAt(
      name: "MockIdentityVerificationHub",
      address: string | ethers.Addressable,
      signer?: ethers.Signer
    ): Promise<Contracts.MockIdentityVerificationHub>;
    getContractAt(
      name: "MockUSDC",
      address: string | ethers.Addressable,
      signer?: ethers.Signer
    ): Promise<Contracts.MockUSDC>;
    getContractAt(
      name: "IMessageHandlerV2",
      address: string | ethers.Addressable,
      signer?: ethers.Signer
    ): Promise<Contracts.IMessageHandlerV2>;
    getContractAt(
      name: "ReliefPools",
      address: string | ethers.Addressable,
      signer?: ethers.Signer
    ): Promise<Contracts.ReliefPools>;
    getContractAt(
      name: "TypedMemView",
      address: string | ethers.Addressable,
      signer?: ethers.Signer
    ): Promise<Contracts.TypedMemView>;

    deployContract(
      name: "Ownable",
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.Ownable>;
    deployContract(
      name: "IERC20",
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.IERC20>;
    deployContract(
      name: "Ownable",
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.Ownable>;
    deployContract(
      name: "IERC1155Errors",
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.IERC1155Errors>;
    deployContract(
      name: "IERC20Errors",
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.IERC20Errors>;
    deployContract(
      name: "IERC721Errors",
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.IERC721Errors>;
    deployContract(
      name: "ERC20",
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.ERC20>;
    deployContract(
      name: "IERC20Metadata",
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.IERC20Metadata>;
    deployContract(
      name: "IERC20",
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.IERC20>;
    deployContract(
      name: "ECDSA",
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.ECDSA>;
    deployContract(
      name: "SelfVerificationRoot",
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.SelfVerificationRoot>;
    deployContract(
      name: "IDscCircuitVerifier",
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.IDscCircuitVerifier>;
    deployContract(
      name: "IIdentityVerificationHubV2",
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.IIdentityVerificationHubV2>;
    deployContract(
      name: "IRegisterCircuitVerifier",
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.IRegisterCircuitVerifier>;
    deployContract(
      name: "ISelfVerificationRoot",
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.ISelfVerificationRoot>;
    deployContract(
      name: "IdentityVerifier",
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.IdentityVerifier>;
    deployContract(
      name: "Lock",
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.Lock>;
    deployContract(
      name: "MockCCTPTransmitter",
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.MockCCTPTransmitter>;
    deployContract(
      name: "MockIdentityVerificationHub",
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.MockIdentityVerificationHub>;
    deployContract(
      name: "MockUSDC",
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.MockUSDC>;
    deployContract(
      name: "IMessageHandlerV2",
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.IMessageHandlerV2>;
    deployContract(
      name: "ReliefPools",
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.ReliefPools>;
    deployContract(
      name: "TypedMemView",
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.TypedMemView>;

    deployContract(
      name: "Ownable",
      args: any[],
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.Ownable>;
    deployContract(
      name: "IERC20",
      args: any[],
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.IERC20>;
    deployContract(
      name: "Ownable",
      args: any[],
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.Ownable>;
    deployContract(
      name: "IERC1155Errors",
      args: any[],
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.IERC1155Errors>;
    deployContract(
      name: "IERC20Errors",
      args: any[],
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.IERC20Errors>;
    deployContract(
      name: "IERC721Errors",
      args: any[],
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.IERC721Errors>;
    deployContract(
      name: "ERC20",
      args: any[],
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.ERC20>;
    deployContract(
      name: "IERC20Metadata",
      args: any[],
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.IERC20Metadata>;
    deployContract(
      name: "IERC20",
      args: any[],
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.IERC20>;
    deployContract(
      name: "ECDSA",
      args: any[],
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.ECDSA>;
    deployContract(
      name: "SelfVerificationRoot",
      args: any[],
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.SelfVerificationRoot>;
    deployContract(
      name: "IDscCircuitVerifier",
      args: any[],
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.IDscCircuitVerifier>;
    deployContract(
      name: "IIdentityVerificationHubV2",
      args: any[],
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.IIdentityVerificationHubV2>;
    deployContract(
      name: "IRegisterCircuitVerifier",
      args: any[],
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.IRegisterCircuitVerifier>;
    deployContract(
      name: "ISelfVerificationRoot",
      args: any[],
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.ISelfVerificationRoot>;
    deployContract(
      name: "IdentityVerifier",
      args: any[],
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.IdentityVerifier>;
    deployContract(
      name: "Lock",
      args: any[],
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.Lock>;
    deployContract(
      name: "MockCCTPTransmitter",
      args: any[],
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.MockCCTPTransmitter>;
    deployContract(
      name: "MockIdentityVerificationHub",
      args: any[],
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.MockIdentityVerificationHub>;
    deployContract(
      name: "MockUSDC",
      args: any[],
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.MockUSDC>;
    deployContract(
      name: "IMessageHandlerV2",
      args: any[],
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.IMessageHandlerV2>;
    deployContract(
      name: "ReliefPools",
      args: any[],
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.ReliefPools>;
    deployContract(
      name: "TypedMemView",
      args: any[],
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<Contracts.TypedMemView>;

    // default types
    getContractFactory(
      name: string,
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<ethers.ContractFactory>;
    getContractFactory(
      abi: any[],
      bytecode: ethers.BytesLike,
      signer?: ethers.Signer
    ): Promise<ethers.ContractFactory>;
    getContractAt(
      nameOrAbi: string | any[],
      address: string | ethers.Addressable,
      signer?: ethers.Signer
    ): Promise<ethers.Contract>;
    deployContract(
      name: string,
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<ethers.Contract>;
    deployContract(
      name: string,
      args: any[],
      signerOrOptions?: ethers.Signer | DeployContractOptions
    ): Promise<ethers.Contract>;
  }
}
