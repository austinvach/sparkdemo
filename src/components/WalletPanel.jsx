import { useState, useRef, useCallback } from 'react'
import { SparkWallet, SparkWalletEvent } from '@buildonspark/spark-sdk'
import InvoiceGenerator from './InvoiceGenerator'
import InvoicePayer from './InvoicePayer'
import { copyToClipboard, formatSats } from '../utils'

export default function WalletPanel({ index, wallet, onWalletReady, network }) {
  const [status, setStatus] = useState('idle') // idle | loading | ready | error
  const [mnemonic, setMnemonic] = useState('')
  const [mnemonicInput, setMnemonicInput] = useState('')
  const [sparkAddress, setSparkAddress] = useState('')
  const [balance, setBalance] = useState(null)
  const [logs, setLogs] = useState([])
  const [copied, setCopied] = useState('')
  const walletRef = useRef(null)
  const listenersRef = useRef(null)
  const lastBalanceUpdateRef = useRef(null)

  const addLog = useCallback((msg, type = 'info') => {
    setLogs(prev => [...prev.slice(-19), { msg, type, id: Date.now() + Math.random() }])
  }, [])

  const refreshBalance = useCallback(async (w) => {
    try {
      const bal = await (w || walletRef.current).getBalance()
      setBalance(bal.balance)
    } catch (e) {
      addLog(`Balance error: ${e.message}`, 'error')
    }
  }, [addLog])

  const detachWalletListeners = useCallback((w) => {
    if (!w || !listenersRef.current) return

    const { handlers } = listenersRef.current
    const remove = typeof w.off === 'function'
      ? w.off.bind(w)
      : typeof w.removeListener === 'function'
        ? w.removeListener.bind(w)
        : null

    if (!remove) {
      listenersRef.current = null
      return
    }

    remove(SparkWalletEvent.BalanceUpdate, handlers.onBalanceUpdate)
    remove(SparkWalletEvent.TransferClaimed, handlers.onTransferClaimed)
    remove(SparkWalletEvent.DepositConfirmed, handlers.onDepositConfirmed)
    remove(SparkWalletEvent.StreamConnected, handlers.onStreamConnected)
    remove(SparkWalletEvent.StreamDisconnected, handlers.onStreamDisconnected)
    listenersRef.current = null
  }, [])

  const initWallet = useCallback(async (useExisting) => {
    setStatus('loading')
    addLog(`Initializing wallet on ${network}…`, 'info')
    try {
      if (walletRef.current) {
        detachWalletListeners(walletRef.current)
      }

      const opts = { options: { network } }
      if (useExisting && mnemonicInput.trim()) {
        opts.mnemonicOrSeed = mnemonicInput.trim()
      }

      const result = await SparkWallet.initialize(opts)
      const w = result.wallet
      walletRef.current = w

      const generatedMnemonic = result.mnemonic || mnemonicInput.trim()
      setMnemonic(generatedMnemonic)

      const addr = await w.getSparkAddress()
      setSparkAddress(addr)

      await refreshBalance(w)
      lastBalanceUpdateRef.current = null

      // Subscribe to events
      const onBalanceUpdate = ({ available }) => {
        setBalance(available)
        if (lastBalanceUpdateRef.current === available) return
        lastBalanceUpdateRef.current = available
        addLog(`Balance updated: ${formatSats(available)}`, 'success')
      }

      const onTransferClaimed = (transferId, newBalance) => {
        setBalance(newBalance)
        addLog(`Transfer claimed: ${transferId.slice(0, 12)}… | ${formatSats(newBalance)}`, 'success')
      }

      const onDepositConfirmed = (depositId, newBalance) => {
        setBalance(newBalance)
        addLog(`Deposit confirmed: ${depositId.slice(0, 12)}… | ${formatSats(newBalance)}`, 'success')
      }

      const onStreamConnected = () => {
        addLog('Event stream connected', 'success')
      }

      const onStreamDisconnected = (reason) => {
        addLog(`Stream disconnected: ${reason}`, 'error')
      }

      w.on(SparkWalletEvent.BalanceUpdate, onBalanceUpdate)
      w.on(SparkWalletEvent.TransferClaimed, onTransferClaimed)
      w.on(SparkWalletEvent.DepositConfirmed, onDepositConfirmed)
      w.on(SparkWalletEvent.StreamConnected, onStreamConnected)
      w.on(SparkWalletEvent.StreamDisconnected, onStreamDisconnected)

      listenersRef.current = {
        wallet: w,
        handlers: {
          onBalanceUpdate,
          onTransferClaimed,
          onDepositConfirmed,
          onStreamConnected,
          onStreamDisconnected,
        },
      }

      setStatus('ready')
      addLog('Wallet ready', 'success')
      onWalletReady(index, w)
    } catch (e) {
      setStatus('error')
      addLog(`Init failed: ${e.message}`, 'error')
    }
  }, [mnemonicInput, addLog, refreshBalance, onWalletReady, index, network, detachWalletListeners])

  const handleCopy = useCallback(async (text, key) => {
    await copyToClipboard(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 1500)
  }, [])

  const handleRefreshBalance = useCallback(() => {
    if (walletRef.current) refreshBalance(walletRef.current)
  }, [refreshBalance])

  const handleMnemonicKeyDown = useCallback((e) => {
    if (e.key !== 'Enter' || e.shiftKey) return
    e.preventDefault()
    if (status === 'loading' || !mnemonicInput.trim()) return
    initWallet(true)
  }, [status, mnemonicInput, initWallet])

  return (
    <div className="wallet-panel">
      <div className="wallet-header">
        <div className="wallet-header-top">
          <div className="wallet-num">{index + 1}</div>
          <div className="wallet-title">
            {`Wallet ${index + 1}`}
            {status === 'ready' && balance !== null && (
              <>
                {': '}
                <span className="wallet-title-symbol">₿</span>
                <span className="wallet-title-amount">{formatSats(balance)}</span>
              </>
            )}
          </div>
          <span className={`badge badge-${status === 'ready' ? 'connected' : status === 'loading' ? 'loading' : 'disconnected'}`}>
            {status === 'ready' ? 'Connected' : status === 'loading' ? 'Connecting…' : 'Not Connected'}
          </span>
          {status === 'ready' && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.35rem' }}>
              <button
                className="copy-btn header-icon-btn"
                onClick={handleRefreshBalance}
                title="Refresh balance"
                aria-label="Refresh balance"
              >
                <i className="fa-solid fa-rotate-right" aria-hidden="true" />
              </button>
              <button
                className="copy-btn header-icon-btn"
                onClick={() => handleCopy(mnemonic, 'mnemonic')}
                title="Copy wallet mnemonic"
                aria-label="Copy wallet mnemonic"
                disabled={!mnemonic}
              >
                <i className={`fa-solid ${copied === 'mnemonic' ? 'fa-check' : 'fa-key'}`} aria-hidden="true" />
              </button>
              <button
                className="copy-btn header-icon-btn"
                onClick={() => handleCopy(sparkAddress, 'addr')}
                title="Copy Spark address"
                aria-label="Copy Spark address"
                disabled={!sparkAddress}
              >
                <i className={`fa-solid ${copied === 'addr' ? 'fa-check' : 'fa-bolt'}`} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>

      </div>

      <div className="wallet-content">
        {/* Init section */}
        {status !== 'ready' && (
          <div className="section-card">
            <div className="section-title">
              <span className="icon">🔑</span>
              Initialize Wallet
              <a
                className="sdk-link"
                href="https://docs.spark.money/api-reference/wallet/initialize"
                target="_blank"
                rel="noreferrer"
              >
                SparkWallet.initialize()
              </a>
            </div>
            <div className="init-form">
              <div className="field">
                <label>Provide mnemonic or leave blank to generate new wallet</label>
                <textarea
                  rows={2}
                  placeholder="word1 word2 word3 … (12 or 24 words)"
                  value={mnemonicInput}
                  onChange={e => setMnemonicInput(e.target.value)}
                  onKeyDown={handleMnemonicKeyDown}
                  disabled={status === 'loading'}
                  className="mono"
                  style={{ resize: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {!mnemonicInput.trim() && (
                  <button
                    className="btn-primary"
                    onClick={() => initWallet(false)}
                    disabled={status === 'loading'}
                    style={{ flex: 1 }}
                  >
                    {status === 'loading' ? <><span className="spinner" />Connecting…</> : 'Generate New Wallet'}
                  </button>
                )}
                {mnemonicInput.trim() && (
                  <button
                    className="btn-secondary"
                    onClick={() => initWallet(true)}
                    disabled={status === 'loading'}
                    style={{ flex: 1 }}
                  >
                    Load Mnemonic
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Invoice generator */}
        {status === 'ready' && wallet && (
          <InvoiceGenerator wallet={wallet} addLog={addLog} />
        )}

        {/* Invoice payer */}
        {status === 'ready' && wallet && (
          <InvoicePayer wallet={wallet} addLog={addLog} onPaid={handleRefreshBalance} />
        )}

        {/* Activity log */}
        {logs.length > 0 && (
          <div className="section-card">
            <div className="section-title"><span className="icon">📋</span> Activity</div>
            <div className="log-list">
              {[...logs].reverse().map(l => (
                <div key={l.id} className={`log-item ${l.type}`}>{l.msg}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
