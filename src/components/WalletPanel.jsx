import { useState, useRef, useCallback } from 'react'
import { SparkWallet, SparkWalletEvent } from '@buildonspark/spark-sdk'
import InvoiceGenerator from './InvoiceGenerator'
import InvoicePayer from './InvoicePayer'
import { copyToClipboard, formatSats } from '../utils'

export default function WalletPanel({ index, wallet, onWalletReady }) {
  const [status, setStatus] = useState('idle') // idle | loading | ready | error
  const [mnemonic, setMnemonic] = useState('')
  const [mnemonicInput, setMnemonicInput] = useState('')
  const [sparkAddress, setSparkAddress] = useState('')
  const [balance, setBalance] = useState(null)
  const [logs, setLogs] = useState([])
  const [copied, setCopied] = useState('')
  const walletRef = useRef(null)

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

  const initWallet = useCallback(async (useExisting) => {
    setStatus('loading')
    addLog('Initializing wallet…', 'info')
    try {
      const opts = { options: { network: 'REGTEST' } }
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

      // Subscribe to events
      w.on(SparkWalletEvent.BalanceUpdate, ({ available }) => {
        setBalance(available)
        addLog(`Balance updated: ${formatSats(available)}`, 'success')
      })

      w.on(SparkWalletEvent.TransferClaimed, (transferId, newBalance) => {
        setBalance(newBalance)
        addLog(`Transfer claimed: ${transferId.slice(0, 12)}… | ${formatSats(newBalance)}`, 'success')
      })

      w.on(SparkWalletEvent.DepositConfirmed, (depositId, newBalance) => {
        setBalance(newBalance)
        addLog(`Deposit confirmed: ${depositId.slice(0, 12)}… | ${formatSats(newBalance)}`, 'success')
      })

      w.on(SparkWalletEvent.StreamConnected, () => {
        addLog('Event stream connected', 'success')
      })

      w.on(SparkWalletEvent.StreamDisconnected, (reason) => {
        addLog(`Stream disconnected: ${reason}`, 'error')
      })

      setStatus('ready')
      addLog('Wallet ready', 'success')
      onWalletReady(index, w)
    } catch (e) {
      setStatus('error')
      addLog(`Init failed: ${e.message}`, 'error')
    }
  }, [mnemonicInput, addLog, refreshBalance, onWalletReady, index])

  const handleCopy = useCallback(async (text, key) => {
    await copyToClipboard(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 1500)
  }, [])

  const handleRefreshBalance = useCallback(() => {
    if (walletRef.current) refreshBalance(walletRef.current)
  }, [refreshBalance])

  return (
    <div className="wallet-panel">
      <div className="wallet-header">
        <div className="wallet-header-top">
          <div className="wallet-num">{index + 1}</div>
          <div className="wallet-title">Wallet {index + 1}</div>
          <span className={`badge badge-${status === 'ready' ? 'connected' : status === 'loading' ? 'loading' : 'disconnected'}`}>
            {status === 'ready' ? 'Connected' : status === 'loading' ? 'Connecting…' : 'Not Connected'}
          </span>
          {status === 'ready' && (
            <button
              className="copy-btn"
              onClick={handleRefreshBalance}
              title="Refresh balance"
              style={{ marginLeft: 'auto' }}
            >
              ↻ Refresh
            </button>
          )}
        </div>

        {status === 'ready' && (
          <>
            <div className="wallet-balance">
              {balance !== null ? formatSats(balance) : '…'}<span>sats</span>
            </div>
            <div className="wallet-address-row">
              <span className="wallet-address-label">Spark</span>
              <span className="mono" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {sparkAddress}
              </span>
              <button className="copy-btn" onClick={() => handleCopy(sparkAddress, 'addr')}>
                {copied === 'addr' ? '✓' : 'Copy'}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="wallet-content">
        {/* Init section */}
        {status !== 'ready' && (
          <div className="section-card">
            <div className="section-title"><span className="icon">🔑</span> Initialize Wallet</div>
            <div className="init-form">
              <div className="field">
                <label>Mnemonic (leave blank to generate new)</label>
                <textarea
                  rows={2}
                  placeholder="word1 word2 word3 … (12 or 24 words)"
                  value={mnemonicInput}
                  onChange={e => setMnemonicInput(e.target.value)}
                  disabled={status === 'loading'}
                  className="mono"
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn-primary"
                  onClick={() => initWallet(false)}
                  disabled={status === 'loading'}
                  style={{ flex: 1 }}
                >
                  {status === 'loading' ? <><span className="spinner" />Connecting…</> : '+ New Wallet'}
                </button>
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

        {/* Show mnemonic after init */}
        {status === 'ready' && mnemonic && (
          <div className="section-card">
            <div className="section-title"><span className="icon">🔑</span> Mnemonic</div>
            <div className="invoice-box">
              <div className="invoice-box-header">
                <span className="invoice-box-label">Recovery Phrase</span>
                <button className="copy-btn" onClick={() => handleCopy(mnemonic, 'mnemonic')}>
                  {copied === 'mnemonic' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <div className="mono" style={{ color: 'var(--warn)', fontSize: '0.72rem' }}>{mnemonic}</div>
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
