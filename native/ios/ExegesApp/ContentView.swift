import SwiftUI

struct ContentView: View {
    @ObservedObject var model: ExegesWebModel

    var body: some View {
        ZStack {
            ExegesWebView(model: model)
                .ignoresSafeArea()

            if !model.hasLoadedPage || model.lastError != nil {
                loadingView
                    .transition(.opacity)
            }
        }
    }

    private var loadingView: some View {
        ZStack {
            Color(red: 0.96, green: 0.93, blue: 0.86)
                .ignoresSafeArea()

            VStack(spacing: 16) {
                Text("Exeges")
                    .font(.system(size: 34, weight: .bold, design: .serif))
                    .foregroundStyle(Color(red: 0.18, green: 0.15, blue: 0.12))

                Text(model.lastError ?? "Opening Scripture")
                    .font(.subheadline)
                    .foregroundStyle(Color(red: 0.43, green: 0.37, blue: 0.30))

                if model.lastError == nil {
                    ProgressView()
                        .tint(Color(red: 0.56, green: 0.35, blue: 0.24))
                } else {
                    Button("Try again") {
                        model.reload()
                    }
                    .buttonStyle(.bordered)
                    .tint(Color(red: 0.56, green: 0.35, blue: 0.24))
                }
            }
            .padding(32)
        }
    }
}
