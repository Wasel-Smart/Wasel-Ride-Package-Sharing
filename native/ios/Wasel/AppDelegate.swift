import UIKit
import WebKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        let window = UIWindow(frame: UIScreen.main.bounds)
        let controller = UIViewController()
        let webView = WKWebView(frame: window.bounds)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        controller.view.addSubview(webView)
        window.rootViewController = controller
        window.makeKeyAndVisible()
        self.window = window

        if let url = URL(string: "https://wasel14.online/?source=ios") {
            webView.load(URLRequest(url: url))
        }

        return true
    }
}
