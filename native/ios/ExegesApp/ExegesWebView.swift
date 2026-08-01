import SwiftUI
import UIKit
import WebKit

struct ExegesWebView: UIViewRepresentable {
    @ObservedObject var model: ExegesWebModel

    func makeCoordinator() -> Coordinator {
        Coordinator(model: model)
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.applicationNameForUserAgent = "ExegesNative/1.0"
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.isOpaque = true
        webView.backgroundColor = UIColor(red: 0.96, green: 0.93, blue: 0.86, alpha: 1)
        webView.scrollView.backgroundColor = webView.backgroundColor

        context.coordinator.load(model.currentURL, revision: model.navigationRevision, in: webView)
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        guard !context.coordinator.hasRequested(model.currentURL, revision: model.navigationRevision) else { return }
        context.coordinator.load(model.currentURL, revision: model.navigationRevision, in: webView)
    }

    static func dismantleUIView(_ webView: WKWebView, coordinator: Coordinator) {
        webView.navigationDelegate = nil
        webView.uiDelegate = nil
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        private weak var model: ExegesWebModel?
        private var requestedURL: URL?
        private var requestedRevision: Int?

        init(model: ExegesWebModel) {
            self.model = model
        }

        func load(_ url: URL, revision: Int, in webView: WKWebView) {
            requestedURL = url
            requestedRevision = revision
            model?.startLoading()
            webView.load(URLRequest(url: url, cachePolicy: .reloadIgnoringLocalAndRemoteCacheData))
        }

        func hasRequested(_ url: URL, revision: Int) -> Bool {
            requestedRevision == revision && requestedURL == url
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            model?.finishLoading()
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            guard !isCancelledNavigation(error) else { return }
            model?.setError(error)
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            guard !isCancelledNavigation(error) else { return }
            model?.setError(error)
        }

        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            model?.recoverFromWebContentTermination()
        }

        private func isCancelledNavigation(_ error: Error) -> Bool {
            let nsError = error as NSError
            return nsError.domain == NSURLErrorDomain && nsError.code == NSURLErrorCancelled
        }
    }
}
