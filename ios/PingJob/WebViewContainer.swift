import SwiftUI
import WebKit

// MARK: - WebView Container
struct WebViewContainer: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var webViewState = WebViewState()
    
    var body: some View {
        ZStack {
            WebView(webViewState: webViewState)
                .edgesIgnoringSafeArea(.all)
            
            // Error overlay
            if let error = webViewState.error {
                ErrorView(error: error) {
                    webViewState.reload()
                }
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .oauthCallbackReceived)) { notification in
            if let url = notification.userInfo?["url"] as? URL {
                handleOAuthCallback(url: url)
            }
        }
    }
    
    private func handleOAuthCallback(url: URL) {
        // Forward the deep link URL to the web app via JavaScript
        // This matches Android Capacitor behavior where the web app handles the custom scheme
        let deepLinkURL = url.absoluteString
        let escapedURL = deepLinkURL.replacingOccurrences(of: "'", with: "\\'")
        
        // Inject the deep link into the web content
        let javascript = """
            (function() {
                // Dispatch a custom event for the web app to handle
                window.dispatchEvent(new CustomEvent('deepLink', { detail: { url: '\(escapedURL)' } }));
                
                // Also try setting window.location for direct navigation
                if (window.Capacitor && window.Capacitor.handleOpenURL) {
                    window.Capacitor.handleOpenURL('\(escapedURL)');
                } else {
                    // Parse the callback and handle it
                    var url = new URL('\(escapedURL)');
                    if (url.protocol === 'pingjob:' && url.host === 'auth-callback') {
                        // Redirect to the auth callback with the query params
                        window.location.href = '/api/auth/google/callback' + url.search;
                    }
                }
            })();
        """
        
        webViewState.webView?.evaluateJavaScript(javascript) { result, error in
            if let error = error {
                print("📱 OAuth callback JS error: \(error.localizedDescription)")
                // Fallback: navigate to the callback URL directly
                let fallbackURL = "https://www.pingjob.com/api/auth/google/callback?\(url.query ?? "")"
                if let callbackURL = URL(string: fallbackURL) {
                    self.webViewState.loadURL(callbackURL)
                }
            } else {
                print("📱 OAuth callback handled via JavaScript")
            }
        }
    }
}

// MARK: - WebView State
class WebViewState: ObservableObject {
    @Published var isLoading: Bool = true
    @Published var progress: Double = 0.0
    @Published var error: String?
    @Published var canGoBack: Bool = false
    @Published var canGoForward: Bool = false
    
    var webView: WKWebView?
    
    func reload() {
        error = nil
        webView?.reload()
    }
    
    func loadURL(_ url: URL) {
        webView?.load(URLRequest(url: url))
    }
    
    func goBack() {
        webView?.goBack()
    }
    
    func goForward() {
        webView?.goForward()
    }
}

// MARK: - WebView UIViewRepresentable
struct WebView: UIViewRepresentable {
    @ObservedObject var webViewState: WebViewState
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    func makeUIView(context: Context) -> WKWebView {
        // Configure WebView preferences
        let preferences = WKWebpagePreferences()
        preferences.allowsContentJavaScript = true
        
        let configuration = WKWebViewConfiguration()
        configuration.defaultWebpagePreferences = preferences
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        
        // Enable cookies and storage
        configuration.websiteDataStore = .default()
        
        // Create WebView
        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.bounces = true
        webView.scrollView.showsHorizontalScrollIndicator = false
        
        // Custom User Agent to identify iOS app
        webView.customUserAgent = "PingJob-iOS/1.0 (iPhone; iOS \(UIDevice.current.systemVersion)) Mobile Safari"
        
        // Store reference
        webViewState.webView = webView
        
        // Add observers
        webView.addObserver(context.coordinator, forKeyPath: #keyPath(WKWebView.isLoading), options: .new, context: nil)
        webView.addObserver(context.coordinator, forKeyPath: #keyPath(WKWebView.estimatedProgress), options: .new, context: nil)
        webView.addObserver(context.coordinator, forKeyPath: #keyPath(WKWebView.canGoBack), options: .new, context: nil)
        webView.addObserver(context.coordinator, forKeyPath: #keyPath(WKWebView.canGoForward), options: .new, context: nil)
        
        // Load PingJob website
        if let url = URL(string: "https://www.pingjob.com") {
            webView.load(URLRequest(url: url))
        }
        
        return webView
    }
    
    func updateUIView(_ uiView: WKWebView, context: Context) {
        // Updates handled by coordinator
    }
    
    static func dismantleUIView(_ uiView: WKWebView, coordinator: Coordinator) {
        uiView.removeObserver(coordinator, forKeyPath: #keyPath(WKWebView.isLoading))
        uiView.removeObserver(coordinator, forKeyPath: #keyPath(WKWebView.estimatedProgress))
        uiView.removeObserver(coordinator, forKeyPath: #keyPath(WKWebView.canGoBack))
        uiView.removeObserver(coordinator, forKeyPath: #keyPath(WKWebView.canGoForward))
    }
    
    // MARK: - Coordinator
    class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        var parent: WebView
        
        init(_ parent: WebView) {
            self.parent = parent
        }
        
        // MARK: - KVO
        override func observeValue(forKeyPath keyPath: String?, of object: Any?, change: [NSKeyValueChangeKey : Any]?, context: UnsafeMutableRawPointer?) {
            guard let webView = object as? WKWebView else { return }
            
            DispatchQueue.main.async {
                switch keyPath {
                case #keyPath(WKWebView.isLoading):
                    self.parent.webViewState.isLoading = webView.isLoading
                case #keyPath(WKWebView.estimatedProgress):
                    self.parent.webViewState.progress = webView.estimatedProgress
                case #keyPath(WKWebView.canGoBack):
                    self.parent.webViewState.canGoBack = webView.canGoBack
                case #keyPath(WKWebView.canGoForward):
                    self.parent.webViewState.canGoForward = webView.canGoForward
                default:
                    break
                }
            }
        }
        
        // MARK: - WKNavigationDelegate
        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            print("📱 Started loading: \(webView.url?.absoluteString ?? "unknown")")
            parent.webViewState.error = nil
        }
        
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            print("📱 Finished loading: \(webView.url?.absoluteString ?? "unknown")")
            
            // Hide splash screen after first successful load
            DispatchQueue.main.async {
                AppState.shared.hideSplash()
            }
        }
        
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            handleError(error)
        }
        
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            handleError(error)
        }
        
        private func handleError(_ error: Error) {
            let nsError = error as NSError
            
            // Ignore cancelled requests
            if nsError.code == NSURLErrorCancelled {
                return
            }
            
            print("📱 WebView error: \(error.localizedDescription)")
            
            DispatchQueue.main.async {
                self.parent.webViewState.error = error.localizedDescription
            }
        }
        
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.allow)
                return
            }
            
            let urlString = url.absoluteString
            
            // Handle external links (tel:, mailto:, etc.)
            if url.scheme == "tel" || url.scheme == "mailto" {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }
            
            // Handle OAuth redirects
            if urlString.contains("accounts.google.com") || urlString.contains("oauth") {
                // Open OAuth in Safari for better UX
                if navigationAction.targetFrame == nil {
                    UIApplication.shared.open(url)
                    decisionHandler(.cancel)
                    return
                }
            }
            
            // Allow navigation within PingJob domain
            if urlString.contains("pingjob.com") || urlString.contains("localhost") {
                decisionHandler(.allow)
                return
            }
            
            // Open external links in Safari
            if navigationAction.navigationType == .linkActivated {
                if !urlString.contains("pingjob.com") {
                    UIApplication.shared.open(url)
                    decisionHandler(.cancel)
                    return
                }
            }
            
            decisionHandler(.allow)
        }
        
        // MARK: - WKUIDelegate
        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            // Handle target="_blank" links
            if navigationAction.targetFrame == nil {
                if let url = navigationAction.request.url {
                    UIApplication.shared.open(url)
                }
            }
            return nil
        }
        
        // Handle JavaScript alerts
        func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
            let alert = UIAlertController(title: "PingJob", message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in
                completionHandler()
            })
            
            if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
               let rootViewController = windowScene.windows.first?.rootViewController {
                rootViewController.present(alert, animated: true)
            } else {
                completionHandler()
            }
        }
        
        // Handle JavaScript confirms
        func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
            let alert = UIAlertController(title: "PingJob", message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in
                completionHandler(false)
            })
            alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in
                completionHandler(true)
            })
            
            if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
               let rootViewController = windowScene.windows.first?.rootViewController {
                rootViewController.present(alert, animated: true)
            } else {
                completionHandler(false)
            }
        }
    }
}

// MARK: - Error View
struct ErrorView: View {
    let error: String
    let retryAction: () -> Void
    
    var body: some View {
        ZStack {
            Color.white.edgesIgnoringSafeArea(.all)
            
            VStack(spacing: 20) {
                Image(systemName: "wifi.exclamationmark")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 60, height: 60)
                    .foregroundColor(Color(hex: "#EF4444"))
                
                Text("Connection Error")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(Color(hex: "#1F2937"))
                
                Text(error)
                    .font(.system(size: 14))
                    .foregroundColor(Color(hex: "#6B7280"))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
                
                Button(action: retryAction) {
                    HStack {
                        Image(systemName: "arrow.clockwise")
                        Text("Try Again")
                    }
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 30)
                    .padding(.vertical, 12)
                    .background(Color(hex: "#2563EB"))
                    .cornerRadius(10)
                }
                .padding(.top, 10)
            }
        }
    }
}

#Preview {
    WebViewContainer()
        .environmentObject(AppState.shared)
}
