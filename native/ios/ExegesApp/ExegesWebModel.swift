import Foundation
import WebKit

@MainActor
final class ExegesWebModel: ObservableObject {
    static let productionURL = URL(string: "https://markdsparks.github.io/exeges/")!

    @Published private(set) var currentURL = productionURL
    @Published private(set) var isLoading = false
    @Published private(set) var hasLoadedPage = false
    @Published private(set) var lastError: String?
    @Published private(set) var navigationRevision = 0

    private var loadTimeoutTask: Task<Void, Never>?

    func startLoading() {
        isLoading = true
        lastError = nil
        loadTimeoutTask?.cancel()
        loadTimeoutTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: 12_000_000_000)
            guard !Task.isCancelled else { return }
            guard let self, self.isLoading, !self.hasLoadedPage else { return }
            self.lastError = "Exeges is taking longer than expected to load."
        }
    }

    func finishLoading() {
        loadTimeoutTask?.cancel()
        loadTimeoutTask = nil
        isLoading = false
        hasLoadedPage = true
    }

    func setError(_ error: Error) {
        loadTimeoutTask?.cancel()
        loadTimeoutTask = nil
        isLoading = false
        lastError = error.localizedDescription
    }

    func reload() {
        hasLoadedPage = false
        lastError = nil
        navigationRevision &+= 1
    }

    func recoverFromWebContentTermination() {
        reload()
    }
}
