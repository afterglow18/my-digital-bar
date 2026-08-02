#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(VisionAnalyzerPlugin, "VisionAnalyzer",
    CAP_PLUGIN_METHOD(analyze, CAPPluginReturnPromise);
)
