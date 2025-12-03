import SwiftUI

@main
struct PingJobApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @StateObject private var appState = AppState.shared
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
                .onOpenURL { url in
                    handleDeepLink(url: url)
                }
        }
    }
    
    private func handleDeepLink(url: URL) {
        print("📱 Received deep link: \(url.absoluteString)")
        
        // Handle OAuth callback
        if url.scheme == "pingjob" && url.host == "auth-callback" {
            appState.handleOAuthCallback(url: url)
        }
    }
}

// MARK: - App Delegate
class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
        print("📱 PingJob iOS App Started")
        return true
    }
    
    // Handle URL schemes when app is not running
    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
        print("📱 Received URL: \(url.absoluteString)")
        
        if url.scheme == "pingjob" {
            AppState.shared.handleOAuthCallback(url: url)
            return true
        }
        return false
    }
}

// MARK: - App State
class AppState: ObservableObject {
    static let shared = AppState()
    
    @Published var oauthCallbackURL: URL?
    @Published var isLoading: Bool = true
    @Published var showSplash: Bool = true
    
    private init() {}
    
    func handleOAuthCallback(url: URL) {
        print("📱 Processing OAuth callback: \(url.absoluteString)")
        oauthCallbackURL = url
        
        // Notify WebView to handle the callback
        NotificationCenter.default.post(
            name: .oauthCallbackReceived,
            object: nil,
            userInfo: ["url": url]
        )
    }
    
    func hideSplash() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            withAnimation(.easeOut(duration: 0.3)) {
                self.showSplash = false
            }
        }
    }
}

// MARK: - Notification Names
extension Notification.Name {
    static let oauthCallbackReceived = Notification.Name("oauthCallbackReceived")
}
