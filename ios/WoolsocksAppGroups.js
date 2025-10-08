import { NativeModules } from 'react-native';

const { WoolsocksAppGroups } = NativeModules;

export default {
  /**
   * Read checkout data from App Groups
   * @returns {Promise<Object>} Checkout data or empty object
   */
  async readCheckoutData() {
    return new Promise((resolve, reject) => {
      WoolsocksAppGroups.readCheckoutData((error, data) => {
        if (error) {
          reject(error);
        } else {
          resolve(data || {});
        }
      });
    });
  },

  /**
   * Read cashback data from App Groups
   * @returns {Promise<Object>} Cashback data or empty object
   */
  async readCashbackData() {
    return new Promise((resolve, reject) => {
      WoolsocksAppGroups.readCashbackData((error, data) => {
        if (error) {
          reject(error);
        } else {
          resolve(data || {});
        }
      });
    });
  },

  /**
   * Write user authentication token to App Groups
   * @param {string} token - User auth token
   */
  writeUserToken(token) {
    WoolsocksAppGroups.writeUserToken(token);
  },

  /**
   * Write user preferences to App Groups
   * @param {Object} preferences - User preferences object
   */
  writeUserPreferences(preferences) {
    WoolsocksAppGroups.writeUserPreferences(preferences);
  },

  /**
   * Clear checkout data from App Groups
   */
  clearCheckoutData() {
    WoolsocksAppGroups.clearCheckoutData();
  },

  /**
   * Clear cashback data from App Groups
   */
  clearCashbackData() {
    WoolsocksAppGroups.clearCashbackData();
  }
};
