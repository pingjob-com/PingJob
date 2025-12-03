import SwiftUI

struct ContentView: View {
    @EnvironmentObject var appState: AppState
    
    var body: some View {
        ZStack {
            // Main WebView
            WebViewContainer()
                .edgesIgnoringSafeArea(.all)
            
            // Splash Screen Overlay
            if appState.showSplash {
                SplashScreenView()
                    .transition(.opacity)
            }
        }
        .preferredColorScheme(.light)
    }
}

// MARK: - Splash Screen
struct SplashScreenView: View {
    var body: some View {
        ZStack {
            // Background color matching PingJob brand
            Color.white
                .edgesIgnoringSafeArea(.all)
            
            VStack(spacing: 20) {
                // App Logo placeholder
                Image(systemName: "briefcase.fill")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 80, height: 80)
                    .foregroundColor(Color(hex: "#2563EB"))
                
                // App Name
                Text("PingJob")
                    .font(.system(size: 32, weight: .bold))
                    .foregroundColor(Color(hex: "#1F2937"))
                
                // Tagline
                Text("Find Your Dream Job")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(Color(hex: "#6B7280"))
                
                // Loading indicator
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: Color(hex: "#2563EB")))
                    .scaleEffect(1.2)
                    .padding(.top, 30)
            }
        }
    }
}

// MARK: - Color Extension for Hex Colors
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }
        
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

#Preview {
    ContentView()
        .environmentObject(AppState.shared)
}
