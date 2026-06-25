import { useState, useCallback } from 'react'
import { copyToClipboard, formatSats } from '../utils'

/**
 * A guided payment flow panel that walks users through the end-to-end steps:
 * 1. Pick receiver wallet → generate invoice (with optional Spark address)
 * 2. Pick sender wallet → pay invoice
 */
export default function PaymentFlow({ wallets }) {
  const connected = wallets.filter(Boolean).length
  const [step, setStep] = useState(1)

  // Step 1: Generate
  const [receiverIdx, setReceiverIdx] = useState(0)
  const [amountSats, setAmountSats] = useState('')
  const [memo, setMemo] = useState('')
  const [includeSparkAddress, setIncludeSparkAddress] = useState(false)
  const [invoiceLoading, setInvoiceLoading] = useState(false)
  const [invoice, setInvoice] = useState(null)
  const [genLog, setGenLog] = useState('')

  // Step 2: Pay
  const [senderIdx, setSenderIdx] = useState(1)
  const [maxFeeSats, setMaxFeeSats] = useState('10')
  const [preferSpark, setPreferSpark] = useState(false)
  const [payLoading, setPayLoading] = useState(false)
  const [payResult, setPayResult] = useState(null)
  const [payLog, setPayLog] = useState('')

  const [copied, setCopied] = useState(false)

  const handleGenerateInvoice = useCallback(async () => {
    const sats = parseInt(amountSats, 10)
    if (!sats || sats <= 0) { setGenLog('Enter a valid amount'); return }
    const receiver = wallets[receiverIdx]
    if (!receiver) { setGenLog('Receiver wallet not connected'); return }
    setInvoiceLoading(true)
    setInvoice(null)
    setGenLog('')
    try {
      const result = await receiver.createLightningInvoice({
        amountSats: sats,
        memo: memo || undefined,
        includeSparkAddress,
      })
      setInvoice(result)
      setGenLog('')
      setStep(2)
      // auto-select other wallet as sender
      setSenderIdx(receiverIdx === 0 ? 1 : 0)
    } catch (e) {
      setGenLog(`Error: ${e.message}`)
    } finally {
      setInvoiceLoading(false)
    }
  }, [wallets, receiverIdx, amountSats, memo, includeSparkAddress])

  const handlePayInvoice = useCallback(async () => {
    const sender = wallets[senderIdx]
    if (!sender) { setPayLog('Sender wallet not connected'); return }
    if (!invoice) { setPayLog('No invoice to pay'); return }
    const fee = parseInt(maxFeeSats, 10)
    if (isNaN(fee) || fee < 0) { setPayLog('Enter a valid max fee'); return }
    setPayLoading(true)
    setPayResult(null)
    setPayLog('')
    try {
      const payment = await sender.payLightningInvoice({
        invoice: invoice.invoice.encodedInvoice,
        maxFeeSats: fee,
        preferSpark,
      })
      setPayResult({ ok: true, payment })
      setStep(3)
    } catch (e) {
      setPayResult({ ok: false, error: e.message })
      setPayLog(`Error: ${e.message}`)
    } finally {
      setPayLoading(false)
    }
  }, [wallets, senderIdx, invoice, maxFeeSats, preferSpark])

  const handleCopyInvoice = useCallback(async () => {
    if (!invoice) return
    await copyToClipboard(invoice.invoice.encodedInvoice)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [invoice])

  const handleReset = useCallback(() => {
    setStep(1)
    setInvoice(null)
    setPayResult(null)
    setAmountSats('')
    setMemo('')
    setIncludeSparkAddress(false)
    setGenLog('')
    setPayLog('')
  }, [])

  if (connected < 2) {
    return (
      <div style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '1.25rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          ⚡ <strong>Guided Payment Flow</strong> — Connect both wallets above to use the step-by-step payment guide.
          {connected === 1 && ' (1/2 wallets connected)'}
          {connected === 0 && ' (0/2 wallets connected)'}
        </span>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '1.25rem 2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-light)' }}>
          ⚡ Guided Payment Flow
        </span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {[1, 2, 3].map(s => (
            <div
              key={s}
              style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.72rem', fontWeight: 700,
                background: step >= s ? 'var(--accent)' : 'var(--surface2)',
                color: step >= s ? '#fff' : 'var(--text-muted)',
                border: `1px solid ${step >= s ? 'var(--accent)' : 'var(--border)'}`,
              }}
            >
              {s === 3 && step === 3 ? '✓' : s}
            </div>
          ))}
        </div>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          {step === 1 ? 'Step 1: Generate Invoice' : step === 2 ? 'Step 2: Pay Invoice' : 'Payment Complete'}
        </span>
        {step > 1 && (
          <button className="copy-btn" onClick={handleReset} style={{ marginLeft: 'auto' }}>
            ↺ Start Over
          </button>
        )}
      </div>

      {/* Step 1: Generate Invoice */}
      {step === 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Receiver Wallet</label>
            <select
              value={receiverIdx}
              onChange={e => setReceiverIdx(Number(e.target.value))}
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: '0.875rem', padding: '0.5rem 0.75rem', width: '100%', fontFamily: 'inherit' }}
            >
              {wallets.map((w, i) => (
                <option key={i} value={i}>Wallet {i + 1}{!w ? ' (not connected)' : ''}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Amount (sats)</label>
            <input type="number" min="1" placeholder="e.g. 1000" value={amountSats} onChange={e => setAmountSats(e.target.value)} disabled={invoiceLoading} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Memo (optional)</label>
            <input type="text" placeholder="Payment for…" value={memo} onChange={e => setMemo(e.target.value)} disabled={invoiceLoading} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label className="checkbox-row" style={{ textTransform: 'none', letterSpacing: 'normal', cursor: 'pointer', marginBottom: '0.5rem' }}>
              <input
                type="checkbox"
                checked={includeSparkAddress}
                onChange={e => setIncludeSparkAddress(e.target.checked)}
                disabled={invoiceLoading}
                style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--accent)' }}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Include Spark address</span>
            </label>
            <button className="btn-primary" onClick={handleGenerateInvoice} disabled={invoiceLoading || !amountSats}>
              {invoiceLoading ? <><span className="spinner" />Generating…</> : '⚡ Generate Invoice'}
            </button>
          </div>
          {genLog && <div style={{ gridColumn: '1/-1', fontSize: '0.78rem', color: 'var(--error)' }}>{genLog}</div>}
        </div>
      )}

      {/* Step 2: Pay Invoice */}
      {step === 2 && invoice && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Bolt11 Invoice — Wallet {receiverIdx + 1} receiving {formatSats(parseInt(amountSats, 10))} sats
              </span>
              <button className="copy-btn" onClick={handleCopyInvoice}>{copied ? '✓ Copied' : 'Copy'}</button>
            </div>
            <div className="mono" style={{ color: 'var(--accent-light)', fontSize: '0.7rem', lineHeight: 1.4 }}>
              {invoice.invoice.encodedInvoice}
            </div>
            {includeSparkAddress && (
              <div style={{ fontSize: '0.7rem', color: 'var(--success)', marginTop: '0.4rem' }}>
                ✓ Spark address embedded
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Sender Wallet</label>
              <select
                value={senderIdx}
                onChange={e => setSenderIdx(Number(e.target.value))}
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: '0.875rem', padding: '0.5rem 0.75rem', width: '100%', fontFamily: 'inherit' }}
              >
                {wallets.map((w, i) => (
                  <option key={i} value={i}>Wallet {i + 1}{!w ? ' (not connected)' : ''}</option>
                ))}
              </select>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Max Fee (sats)</label>
              <input type="number" min="0" value={maxFeeSats} onChange={e => setMaxFeeSats(e.target.value)} disabled={payLoading} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label className="checkbox-row" style={{ textTransform: 'none', letterSpacing: 'normal', cursor: 'pointer', marginBottom: '0.4rem' }}>
                <input
                  type="checkbox"
                  checked={preferSpark}
                  onChange={e => setPreferSpark(e.target.checked)}
                  disabled={payLoading}
                  style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--accent)' }}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Prefer Spark route</span>
              </label>
              <button className="btn-success" onClick={handlePayInvoice} disabled={payLoading || senderIdx === receiverIdx}>
                {payLoading ? <><span className="spinner" />Sending…</> : '💸 Pay Invoice'}
              </button>
              {senderIdx === receiverIdx && (
                <div style={{ fontSize: '0.72rem', color: 'var(--warn)' }}>Sender and receiver must be different wallets</div>
              )}
            </div>
          </div>

          {payLog && <div style={{ fontSize: '0.78rem', color: 'var(--error)' }}>{payLog}</div>}
        </div>
      )}

      {/* Step 3: Success */}
      {step === 3 && payResult?.ok && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ padding: '0.75rem 1.25rem', background: 'rgba(16,185,129,0.1)', border: '1px solid var(--success)', borderRadius: 10 }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--success)' }}>✓ Payment Complete!</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Wallet {senderIdx + 1} → Wallet {receiverIdx + 1}: {formatSats(parseInt(amountSats, 10))} sats
            </div>
          </div>
          <button className="btn-secondary" onClick={handleReset}>⚡ New Payment</button>
        </div>
      )}
    </div>
  )
}
