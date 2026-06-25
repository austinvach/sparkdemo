import { useState, useCallback, useRef, useEffect } from 'react'

export default function InvoicePayer({ wallet, addLog, onPaid }) {
  const [invoiceInput, setInvoiceInput] = useState('')
  const [maxFeeSats, setMaxFeeSats] = useState('10')
  const [preferSpark, setPreferSpark] = useState(true)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const invoiceRef = useRef(null)

  useEffect(() => {
    if (!invoiceRef.current) return
    invoiceRef.current.style.height = 'auto'
    invoiceRef.current.style.height = `${invoiceRef.current.scrollHeight}px`
  }, [invoiceInput])

  const handlePay = useCallback(async () => {
    const inv = invoiceInput.trim()
    if (!inv) {
      addLog('Paste a Bolt11 invoice to pay', 'error')
      return
    }
    const fee = parseInt(maxFeeSats, 10)
    if (isNaN(fee) || fee < 0) {
      addLog('Enter a valid max fee', 'error')
      return
    }
    setLoading(true)
    setResult(null)
    addLog(`Paying invoice${preferSpark ? ' (preferring Spark route)' : ''}…`, 'info')
    try {
      const payment = await wallet.payLightningInvoice({
        invoice: inv,
        maxFeeSats: fee,
        preferSpark,
      })
      setResult(payment)
      addLog(`Payment sent successfully`, 'success')
      onPaid?.()
    } catch (e) {
      addLog(`Payment failed: ${e.message}`, 'error')
      setResult({ error: e.message })
    } finally {
      setLoading(false)
    }
  }, [wallet, invoiceInput, maxFeeSats, preferSpark, addLog, onPaid])

  return (
    <div className="section-card">
      <div className="section-title">
        <span className="icon">💸</span>
        Pay Lightning Invoice
        <a
          className="sdk-link"
          href="https://docs.spark.money/api-reference/wallet/pay-lightning-invoice"
          target="_blank"
          rel="noreferrer"
        >
          wallet.payLightningInvoice()
        </a>
      </div>

      <div className="field">
        <label>Invoice</label>
        <textarea
          ref={invoiceRef}
          rows={6}
          placeholder="lnbcrt1… (paste invoice from receiver)"
          value={invoiceInput}
          onChange={e => setInvoiceInput(e.target.value)}
          disabled={loading}
          className="mono"
          style={{ resize: 'none', overflow: 'hidden' }}
        />
      </div>

      <div className="row">
        <div className="field" style={{ flex: '1 1 0' }}>
          <label>Max Fee (₿)</label>
          <input
            type="number"
            min="0"
            value={maxFeeSats}
            onChange={e => setMaxFeeSats(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="field" style={{ flex: '0 0 auto', marginBottom: 0 }}>
          <label style={{ visibility: 'hidden' }}>preferSpark</label>
          <label className="checkbox-row" style={{ textTransform: 'none', letterSpacing: 'normal', cursor: 'pointer', whiteSpace: 'nowrap', marginBottom: 0, minHeight: 40, display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={preferSpark}
              onChange={e => setPreferSpark(e.target.checked)}
              disabled={loading}
              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent)' }}
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <a
                href="https://docs.spark.money/wallets/withdraw-to-lightning#spark-transfer-preference"
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--accent-light)', textDecoration: 'none' }}
              >
                preferSpark
              </a>
            </span>
          </label>
        </div>
      </div>

      <button
        className="btn-success"
        onClick={handlePay}
        disabled={loading || !invoiceInput.trim()}
        style={{ width: '100%', marginTop: '0.6rem' }}
      >
        {loading ? <><span className="spinner" />Sending…</> : 'Pay Invoice'}
      </button>

      {result && !result.error && (
        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(16,185,129,0.08)', border: '1px solid var(--success)', borderRadius: 8 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--success)', marginBottom: '0.25rem' }}>
            ✓ Payment Successful
          </div>
          {result.id && (
            <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              ID: {result.id}
            </div>
          )}
        </div>
      )}

      {result?.error && (
        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(239,68,68,0.08)', border: '1px solid var(--error)', borderRadius: 8 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--error)' }}>
            ✗ Payment Failed
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--error)', marginTop: '0.25rem' }}>{result.error}</div>
        </div>
      )}
    </div>
  )
}
