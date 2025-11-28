import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { Network } from '@capacitor/network'

export const isNative = () => Capacitor.isNativePlatform()

// Storage wrapper cho Supabase
export const capacitorStorage = {
  async setItem(key, value) {
    if (isNative()) {
      await Preferences.set({ key, value })
    } else {
      localStorage.setItem(key, value)
    }
  },

  async getItem(key) {
    if (isNative()) {
      const { value } = await Preferences.get({ key })
      return value
    }
    return localStorage.getItem(key)
  },

  async removeItem(key) {
    if (isNative()) {
      await Preferences.remove({ key })
    } else {
      localStorage.removeItem(key)
    }
  },

  async clear() {
    if (isNative()) {
      await Preferences.clear()
    } else {
      localStorage.clear()
    }
  },
}

// Network status
export const checkNetworkStatus = async () => {
  if (isNative()) {
    return await Network.getStatus()
  }
  return {
    connected: navigator.onLine,
    connectionType: 'wifi',
  }
}

// Listen to network changes
export const addNetworkListener = (callback) => {
  if (isNative()) {
    return Network.addListener('networkStatusChange', callback)
  } else {
    window.addEventListener('online', () => callback({ connected: true }))
    window.addEventListener('offline', () => callback({ connected: false }))
  }
}
