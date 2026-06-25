import { useState, useCallback } from 'react'
import './App.css'
import WalletPanel from './components/WalletPanel'
import PaymentFlow from './components/PaymentFlow'

export default function App() {
  const [wallets, setWallets] = useState([null, null])

  const setWallet = useCallback((index, wallet) => {
    setWallets(prev => {
      const next = [...prev]
      next[index] = wallet
      return next
    })
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header className="app-header">
        <div>
          <h1>⚡ Spark Wallet Demo</h1>
          <div className="subtitle">Two-wallet Lightning payment demo using the Spark SDK</div>
        </div>
        <div className="network-badge">REGTEST</div>
      </header>

      <div className="app-body">
        <WalletPanel index={0} wallet={wallets[0]} onWalletReady={setWallet} />
        <WalletPanel index={1} wallet={wallets[1]} onWalletReady={setWallet} />
      </div>

      <PaymentFlow wallets={wallets} />
    </div>
  )
}
