// Handle cashback activation from content script
import { getAllPartners } from './api'
import type { AnonymousUser, ActivationRecord } from '../shared/types'

export async function handleActivateCashback(partnerName: string, tabId?: number, setIcon?: (state: string, tabId?: number) => void) {
  const { partners } = await getAllPartners()
  const partner = partners.find(p => p.name === partnerName)
  if (!partner) return
  
  // Get current user state
  const result = await chrome.storage.local.get('user')
  const user: AnonymousUser = result.user || { totalEarnings: 0, activationHistory: [], settings: { showCashbackPrompt: true, showVoucherPrompt: true } }
  
  // Check if already active
  const activeActivation = user.activationHistory.find(
    activation => activation.partner === partner.name && activation.status === 'active'
  )
  
  if (!activeActivation) {
    // Activate cashback
    const newActivation: ActivationRecord = {
      partner: partner.name,
      timestamp: Date.now(),
      cashbackRate: partner.cashbackRate,
      estimatedEarnings: 0,
      status: 'active'
    }
    
    user.activationHistory.push(newActivation)
    await chrome.storage.local.set({ user })
    
    if (tabId && setIcon) {
      setIcon('active', tabId)
    }
    
    // Show success notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon-48.png',
      title: 'Cashback Activated!',
      message: `You'll earn ${partner.cashbackRate}% cashback on ${partner.name} purchases`
    })
  }
}
