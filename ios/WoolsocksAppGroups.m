#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(WoolsocksAppGroups, NSObject)

RCT_EXTERN_METHOD(readCheckoutData:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(readCashbackData:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(writeUserToken:(NSString *)token)
RCT_EXTERN_METHOD(writeUserPreferences:(NSDictionary *)preferences)
RCT_EXTERN_METHOD(clearCheckoutData)
RCT_EXTERN_METHOD(clearCashbackData)

@end
