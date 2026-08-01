import SwiftUI

@main
struct ExegesApp: App {
    @StateObject private var webModel = ExegesWebModel()

    var body: some Scene {
        WindowGroup {
            ContentView(model: webModel)
        }
    }
}
