import UIKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // This is a minimal wrapper app for the Safari extension
        // The extension will be loaded by Safari when enabled
        print("Woolsocks Safari Extension wrapper app launched")
        
        window = UIWindow(frame: UIScreen.main.bounds)
        let viewController = UIViewController()
        viewController.view.backgroundColor = .systemBackground
        
        let label = UILabel()
        label.text = "Woolsocks Safari Extension"
        label.textAlignment = .center
        label.font = UIFont.systemFont(ofSize: 24, weight: .bold)
        label.translatesAutoresizingMaskIntoConstraints = false
        viewController.view.addSubview(label)
        
        let instructionLabel = UILabel()
        instructionLabel.text = "To test the extension:\n1. Go to Settings > Safari > Extensions\n2. Enable 'Woolsocks Extension'\n3. Open Safari and visit a merchant site"
        instructionLabel.textAlignment = .center
        instructionLabel.numberOfLines = 0
        instructionLabel.font = UIFont.systemFont(ofSize: 16)
        instructionLabel.translatesAutoresizingMaskIntoConstraints = false
        viewController.view.addSubview(instructionLabel)
        
        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: viewController.view.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: viewController.view.centerYAnchor, constant: -50),
            instructionLabel.centerXAnchor.constraint(equalTo: viewController.view.centerXAnchor),
            instructionLabel.topAnchor.constraint(equalTo: label.bottomAnchor, constant: 30),
            instructionLabel.leadingAnchor.constraint(equalTo: viewController.view.leadingAnchor, constant: 20),
            instructionLabel.trailingAnchor.constraint(equalTo: viewController.view.trailingAnchor, constant: -20)
        ])
        
        window?.rootViewController = viewController
        window?.makeKeyAndVisible()
        
        return true
    }
}