import { zeroAddress, type Address } from 'viem'

const deployedAddress = '0x63DcF3a6050Cf80D785Fc4105c13B38ac60C0F0b'
const configuredAddress = import.meta.env.VITE_SILKLINE_CONTRACT_ADDRESS
const activeAddress = configuredAddress || deployedAddress

export const isContractConfigured =
  /^0x[a-fA-F0-9]{40}$/.test(activeAddress) &&
  activeAddress.toLowerCase() !== zeroAddress

export const SILKLINE_ADDRESS = (
  isContractConfigured ? activeAddress : zeroAddress
) as Address

export const silklineAbi = [
  {
    type: 'function',
    name: 'extendLine',
    inputs: [{ name: 'direction', type: 'uint8' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'dailyCheckIn',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getDayMoves',
    inputs: [{ name: 'day', type: 'uint64' }],
    outputs: [{ name: '', type: 'uint8[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'statsOf',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      {
        name: 'profile',
        type: 'tuple',
        components: [
          { name: 'totalMoves', type: 'uint64' },
          { name: 'totalCheckIns', type: 'uint64' },
          { name: 'lastMoveDay', type: 'uint64' },
          { name: 'lastCheckInDay', type: 'uint64' },
          { name: 'lastMovedAt', type: 'uint64' },
          { name: 'streak', type: 'uint8' },
          { name: 'lastDirection', type: 'uint8' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'globalMoves',
    inputs: [],
    outputs: [{ name: '', type: 'uint64' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'globalCheckIns',
    inputs: [],
    outputs: [{ name: '', type: 'uint64' }],
    stateMutability: 'view',
  },
] as const
