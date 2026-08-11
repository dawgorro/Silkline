import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronRight,
  Feather,
  Flower2,
  LogOut,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react'
import { encodeFunctionData, zeroAddress, type Address } from 'viem'
import {
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  useReadContract,
  useSendTransaction,
  useSwitchChain,
  useWaitForTransactionReceipt,
} from 'wagmi'
import { base } from 'wagmi/chains'
import {
  isContractConfigured,
  SILKLINE_ADDRESS,
  silklineAbi,
} from './config/contract'
import { DATA_SUFFIX } from './config/wagmi'

const directions = [
  { name: 'Up', icon: ArrowUp },
  { name: 'Right', icon: ArrowRight },
  { name: 'Down', icon: ArrowDown },
  { name: 'Left', icon: ArrowLeft },
] as const

const deltas = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const

type Profile = {
  totalMoves: bigint
  totalCheckIns: bigint
  lastMoveDay: bigint
  lastCheckInDay: bigint
  lastMovedAt: bigint
  streak: number
  lastDirection: number
}

type PendingAction = 'move' | 'checkin' | null

type Point = [number, number]

function shortAddress(address?: Address) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''
}

function utcDay() {
  return Math.floor(Date.now() / 86_400_000)
}

function mapLine(moves: number[], previewDirection: number) {
  const points: Point[] = [[0, 0]]

  for (const move of moves) {
    const previous = points[points.length - 1]
    const delta = deltas[move] || deltas[1]
    points.push([previous[0] + delta[0], previous[1] + delta[1]])
  }

  const current = points[points.length - 1]
  const previewDelta = deltas[previewDirection]
  const preview: Point = [
    current[0] + previewDelta[0],
    current[1] + previewDelta[1],
  ]
  const allPoints = [...points, preview]
  const xs = allPoints.map(([x]) => x)
  const ys = allPoints.map(([, y]) => y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const rangeX = Math.max(maxX - minX, 4)
  const rangeY = Math.max(maxY - minY, 3)
  const scale = Math.min(700 / rangeX, 410 / rangeY, 72)
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  const project = ([x, y]: Point): Point => [
    500 + (x - centerX) * scale,
    300 + (y - centerY) * scale,
  ]

  const projected = points.map(project)
  const projectedCurrent = projected[projected.length - 1]
  const projectedPreview = project(preview)
  const path = projected
    .map(([x, y], index) => `${index ? 'L' : 'M'} ${x} ${y}`)
    .join(' ')

  return {
    path,
    start: projected[0],
    current: projectedCurrent,
    preview: projectedPreview,
  }
}

function App() {
  const [selectedDirection, setSelectedDirection] = useState(1)
  const [walletOpen, setWalletOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [notice, setNotice] = useState('')

  const today = utcDay()
  const { address, isConnected, isReconnecting } = useAccount()
  const chainId = useChainId()
  const { connectors, connect, isPending: isConnecting } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain()
  const {
    data: hash,
    sendTransactionAsync,
    isPending: isSending,
    error: sendError,
    reset: resetTransaction,
  } = useSendTransaction()
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash, chainId: base.id })

  const readsEnabled = isConnected && isContractConfigured && Boolean(address)

  const { data: movesData, refetch: refetchMoves } = useReadContract({
    address: SILKLINE_ADDRESS,
    abi: silklineAbi,
    functionName: 'getDayMoves',
    args: [BigInt(today)],
    chainId: base.id,
    query: { enabled: isContractConfigured, refetchInterval: 10_000 },
  })

  const { data: profileData, refetch: refetchProfile } = useReadContract({
    address: SILKLINE_ADDRESS,
    abi: silklineAbi,
    functionName: 'statsOf',
    args: [address || zeroAddress],
    chainId: base.id,
    query: { enabled: readsEnabled, refetchInterval: 12_000 },
  })

  const { data: globalMoves, refetch: refetchGlobalMoves } = useReadContract({
    address: SILKLINE_ADDRESS,
    abi: silklineAbi,
    functionName: 'globalMoves',
    chainId: base.id,
    query: { enabled: isContractConfigured, refetchInterval: 15_000 },
  })

  const { data: globalCheckIns, refetch: refetchCheckIns } = useReadContract({
    address: SILKLINE_ADDRESS,
    abi: silklineAbi,
    functionName: 'globalCheckIns',
    chainId: base.id,
    query: { enabled: isContractConfigured, refetchInterval: 15_000 },
  })

  const moves = (movesData || []) as readonly number[]
  const profile = profileData as Profile | undefined
  const movedToday = Number(profile?.lastMoveDay || 0n) === today
  const checkedIn = Number(profile?.lastCheckInDay || 0n) === today
  const busy = isSending || isConfirming || isSwitching
  const line = useMemo(
    () => mapLine(moves.map(Number), selectedDirection),
    [moves, selectedDirection],
  )

  const statusText = useMemo(() => {
    if (isSwitching) return 'Switching to Base...'
    if (isSending) return 'Confirm in your wallet...'
    if (isConfirming) return 'Placing your gesture...'
    if (isConfirmed && pendingAction === 'move') return 'Your gesture is part of the ribbon'
    if (isConfirmed && pendingAction === 'checkin') return 'Daily check-in complete'
    return ''
  }, [isSwitching, isSending, isConfirming, isConfirmed, pendingAction])

  useEffect(() => {
    if (!isConfirmed) return
    void Promise.all([
      refetchMoves(),
      refetchProfile(),
      refetchGlobalMoves(),
      refetchCheckIns(),
    ])
  }, [isConfirmed, refetchMoves, refetchProfile, refetchGlobalMoves, refetchCheckIns])

  useEffect(() => {
    if (!sendError) return
    setNotice(sendError.message.split('\n')[0])
    setPendingAction(null)
  }, [sendError])

  async function ensureBase() {
    if (chainId !== base.id) await switchChainAsync({ chainId: base.id })
  }

  async function runAction(action: Exclude<PendingAction, null>) {
    setNotice('')
    resetTransaction()

    if (!isConnected) {
      setWalletOpen(true)
      return
    }

    if (!isContractConfigured) {
      setNotice('Contract address required in src/config/contract.ts.')
      return
    }

    try {
      await ensureBase()
      setPendingAction(action)

      const data = encodeFunctionData({
        abi: silklineAbi,
        functionName: action === 'move' ? 'extendLine' : 'dailyCheckIn',
        args: action === 'move' ? [selectedDirection] : [],
      })

      await sendTransactionAsync({
        to: SILKLINE_ADDRESS,
        data,
        chainId: base.id,
        ...(DATA_SUFFIX ? { dataSuffix: DATA_SUFFIX } : {}),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Transaction cancelled.'
      setNotice(message.split('\n')[0])
      setPendingAction(null)
    }
  }

  function connectWallet(index: number) {
    const connector = connectors[index]
    if (!connector) return
    connect(
      { connector, chainId: base.id },
      { onSuccess: () => setWalletOpen(false) },
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Silkline home">
          <span className="brand-mark"><Flower2 size={18} /></span>
          <span>Silkline</span>
        </a>

        {isConnected ? (
          <button className="wallet-chip" onClick={() => disconnect()} title="Disconnect wallet">
            <span className="online-dot" />
            {shortAddress(address)}
            <LogOut size={15} />
          </button>
        ) : (
          <button className="connect-button" onClick={() => setWalletOpen(true)}>
            <Wallet size={17} />
            Connect
          </button>
        )}
      </header>

      <main id="top">
        <section className="intro">
          <div className="edition-mark" aria-hidden="true">
            <span>Daily edition</span>
            <strong>{String(today).slice(-3)}</strong>
          </div>
          <div className="intro-title">
            <p className="eyebrow">A collective ribbon on Base</p>
            <h1>Silkline</h1>
          </div>
          <p>A small gesture, continued by strangers.</p>
        </section>

        <section className="line-tool" aria-label="Today's shared ribbon">
          <div className="canvas-header">
            <span>Today's ribbon</span>
            <span>{moves.length} gestures · closes 00:00 UTC</span>
          </div>

          <div className="line-canvas">
            <span className="margin-note">Base · shared · ephemeral</span>
            <span className="stage-flower"><Flower2 size={27} /></span>
            <svg viewBox="0 0 1000 600" role="img" aria-label={`Shared ribbon with ${moves.length} gestures`}>
              <path className="silk-shadow" d={line.path} />
              <path className="silk-ribbon" d={line.path} />
              <path className="silk-glint" d={line.path} />

              <line
                className="preview-path"
                x1={line.current[0]}
                y1={line.current[1]}
                x2={line.preview[0]}
                y2={line.preview[1]}
              />
              <circle className="start-point" cx={line.start[0]} cy={line.start[1]} r="8" />
              <circle className="current-point pulse-ring" cx={line.current[0]} cy={line.current[1]} r="22" />
              <circle className="current-point" cx={line.current[0]} cy={line.current[1]} r="11" />
              <circle className="pearl-light" cx={line.current[0] - 3} cy={line.current[1] - 3} r="3" />
              <circle className="preview-point" cx={line.preview[0]} cy={line.preview[1]} r="7" />
            </svg>
          </div>

          <div className="move-console">
            <div className="move-copy">
              <span>Your gesture</span>
              <strong>{directions[selectedDirection].name}</strong>
            </div>

            <div className="direction-control" aria-label="Choose direction">
              {directions.map((direction, index) => {
                const Icon = direction.icon
                return (
                  <button
                    key={direction.name}
                    className={selectedDirection === index ? 'selected' : ''}
                    onClick={() => setSelectedDirection(index)}
                    aria-label={direction.name}
                    aria-pressed={selectedDirection === index}
                    title={direction.name}
                  >
                    <Icon size={20} />
                  </button>
                )
              })}
              <span className="compass-center" aria-hidden="true"><Flower2 size={18} /></span>
            </div>

            <button
              className="extend-button"
              onClick={() => void runAction('move')}
              disabled={busy || movedToday}
            >
              <span>{movedToday ? 'Gesture placed today' : 'Continue the ribbon'}</span>
              {busy && pendingAction === 'move' ? <span className="spinner light" /> : movedToday ? <Check size={20} /> : <Feather size={20} />}
            </button>
          </div>
        </section>

        <section className="checkin-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">A private ritual</p>
              <h2>A quiet return.</h2>
            </div>
            <Sparkles size={28} />
          </div>

          <div className="checkin-row">
            <div className={checkedIn ? 'check-icon complete' : 'check-icon'}>
              {checkedIn ? <Check size={24} /> : <Flower2 size={25} />}
            </div>
            <div className="check-copy">
              <strong>{checkedIn ? 'Sealed for today.' : 'Daily check-in'}</strong>
              <span>{checkedIn ? 'The next page opens tomorrow.' : 'A record of returning, kept apart from the ribbon.'}</span>
            </div>
            <button
              className="check-button"
              onClick={() => void runAction('checkin')}
              disabled={busy || checkedIn}
            >
              {busy && pendingAction === 'checkin' ? <span className="spinner dark" /> : checkedIn ? 'Done' : 'Check in'}
              {!checkedIn && !(busy && pendingAction === 'checkin') && <ChevronRight size={20} />}
            </button>
          </div>
        </section>

        <section className="stats-section">
          <div className="stat">
            <span>Your gestures</span>
            <strong>{Number(profile?.totalMoves || 0n)}</strong>
          </div>
          <div className="stat blue">
            <span>Your streak</span>
            <strong>{Number(profile?.streak || 0)} <small>days</small></strong>
          </div>
          <div className="stat">
            <span>Ribbon length</span>
            <strong>{Number(globalMoves || 0n).toLocaleString()}</strong>
          </div>
          <div className="stat mint">
            <span>Daily returns</span>
            <strong>{Number(globalCheckIns || 0n).toLocaleString()}</strong>
          </div>
        </section>

        <section className="network-note">
          <p>One gesture per wallet. A new ribbon every UTC day.</p>
          <span>No token. No app fee. Only Base network gas.</span>
        </section>

        {(statusText || notice || !isContractConfigured) && (
          <div className={notice || !isContractConfigured ? 'toast error' : 'toast'} role="status">
            {notice || (!isContractConfigured ? 'Contract address required in src/config/contract.ts.' : statusText)}
          </div>
        )}
      </main>

      <footer>
        <span>Silkline</span>
        <span>Made gently on Base</span>
      </footer>

      {walletOpen && (
        <div className="modal-backdrop" onMouseDown={() => setWalletOpen(false)}>
          <div className="wallet-modal" role="dialog" aria-modal="true" aria-labelledby="wallet-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setWalletOpen(false)} aria-label="Close">
              <X size={20} />
            </button>
            <span className="modal-icon"><Flower2 size={23} /></span>
            <p className="eyebrow">Continue on Base</p>
            <h2 id="wallet-title">Touch the ribbon.</h2>
            <p className="modal-copy">Connect a wallet to leave today's gesture.</p>
            <div className="wallet-options">
              {connectors.map((connector, index) => (
                <button key={connector.uid} onClick={() => connectWallet(index)} disabled={isConnecting || isReconnecting}>
                  <span className={index === 0 ? 'wallet-symbol browser' : 'wallet-symbol base'}>
                    {index === 0 ? <Wallet size={19} /> : 'B'}
                  </span>
                  <span>
                    <strong>{index === 0 ? 'Browser wallet' : 'Base Account'}</strong>
                    <small>{index === 0 ? 'MetaMask, Rabby and more' : 'Coinbase smart wallet'}</small>
                  </span>
                  <ChevronRight size={20} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
