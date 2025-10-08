import Foundation
import React

@objc(WoolsocksAppGroups)
class WoolsocksAppGroups: NSObject {
  
  private let appGroupId = "group.com.woolsocks.shared"
  
  @objc func readCheckoutData(_ callback: @escaping RCTResponseSenderBlock) {
    guard let defaults = UserDefaults(suiteName: appGroupId) else {
      callback([NSError(domain: "WoolsocksAppGroups", code: 1, userInfo: [NSLocalizedDescriptionKey: "App Group not configured"]), NSNull()])
      return
    }
    
    let checkoutData = defaults.dictionary(forKey: "checkout_detected")
    callback([NSNull(), checkoutData ?? [:]])
  }
  
  @objc func readCashbackData(_ callback: @escaping RCTResponseSenderBlock) {
    guard let defaults = UserDefaults(suiteName: appGroupId) else {
      callback([NSError(domain: "WoolsocksAppGroups", code: 1, userInfo: [NSLocalizedDescriptionKey: "App Group not configured"]), NSNull()])
      return
    }
    
    let cashbackData = defaults.dictionary(forKey: "cashback_event")
    callback([NSNull(), cashbackData ?? [:]])
  }
  
  @objc func writeUserToken(_ token: String) {
    guard let defaults = UserDefaults(suiteName: appGroupId) else { return }
    defaults.set(token, forKey: "user_auth_token")
  }
  
  @objc func writeUserPreferences(_ preferences: NSDictionary) {
    guard let defaults = UserDefaults(suiteName: appGroupId) else { return }
    defaults.set(preferences, forKey: "user_preferences")
  }
  
  @objc func clearCheckoutData() {
    guard let defaults = UserDefaults(suiteName: appGroupId) else { return }
    defaults.removeObject(forKey: "checkout_detected")
  }
  
  @objc func clearCashbackData() {
    guard let defaults = UserDefaults(suiteName: appGroupId) else { return }
    defaults.removeObject(forKey: "cashback_event")
  }
  
  @objc static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
