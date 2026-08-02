import Capacitor
import Vision
import UIKit

@objc(VisionAnalyzerPlugin)
public class VisionAnalyzerPlugin: CAPPlugin {

    /// Accepts a base64-encoded image and returns:
    ///   labels — VNClassifyImageRequest identifiers with confidence ≥ 0.3
    ///   text   — strings from VNRecognizeTextRequest (accurate mode)
    /// Falls back silently to empty arrays on any error.
    @objc func analyze(_ call: CAPPluginCall) {
        guard
            let base64   = call.getString("base64"),
            let imageData = Data(base64Encoded: base64),
            let uiImage  = UIImage(data: imageData),
            let cgImage  = uiImage.cgImage
        else {
            call.resolve(["labels": [], "text": []])
            return
        }

        DispatchQueue(label: "com.mydigitalbar.vision", qos: .userInitiated).async {
            var resultLabels: [String] = []
            var resultText:   [String] = []

            let group   = DispatchGroup()
            let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])

            // ── Classification ───────────────────────────────────────────────
            let classifyReq = VNClassifyImageRequest { req, _ in
                guard let obs = req.results as? [VNClassificationObservation] else { return }
                resultLabels = obs
                    .filter { $0.confidence >= 0.3 }
                    .map    { $0.identifier }
            }
            group.enter()
            DispatchQueue.global().async {
                try? handler.perform([classifyReq])
                group.leave()
            }

            // ── Text recognition ─────────────────────────────────────────────
            let textReq = VNRecognizeTextRequest { req, _ in
                guard let obs = req.results as? [VNRecognizedTextObservation] else { return }
                resultText = obs.compactMap { $0.topCandidates(1).first?.string }
            }
            textReq.recognitionLevel = .accurate

            group.enter()
            DispatchQueue.global().async {
                let h2 = VNImageRequestHandler(cgImage: cgImage, options: [:])
                try? h2.perform([textReq])
                group.leave()
            }

            group.wait()
            call.resolve(["labels": resultLabels, "text": resultText])
        }
    }
}
