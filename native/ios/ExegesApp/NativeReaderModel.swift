import SwiftUI

@MainActor
final class NativeReaderModel: ObservableObject {
    @Published private(set) var session: NativeReaderSession?
    @Published private(set) var bookmarkSession: NativeBookmarkSession?
    @Published private(set) var searchIndex: NativeScriptureSearch?
    @Published private(set) var bookmarkError: String?
    @Published private(set) var loading = false
    @Published private(set) var loadError: String?
    @Published var saveError: String?
    @Published private(set) var navigationRevision = 0
    @Published private(set) var history: [ScriptureReference] = []
    private let corpusURL: URL?
    private let disk: NativeReaderDisk
    private let bookmarkDisk: NativeBookmarkDisk
    #if DEBUG
    private var simulateWriteFailure = false
    private var simulateBookmarkLoadFailure = false
    #endif

    init(bundle: Bundle = .main) {
        var corpusURL = bundle.url(forResource: "bible", withExtension: "json")
        let support = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        var stateURL = support.appendingPathComponent("NativeReader/reader-state-v1.json")
        #if DEBUG
        // UI tests use a separate directory, never the reader's actual saved material.
        let environment = ProcessInfo.processInfo.environment
        if let testID = environment["EXEGES_READER_TEST_ID"], UUID(uuidString: testID) != nil {
            stateURL = support.appendingPathComponent("NativeReaderUITests/\(testID)/reader-state-v1.json")
            if environment["EXEGES_READER_TEST_MISSING_CORPUS"] == "1" { corpusURL = nil }
            simulateWriteFailure = environment["EXEGES_READER_TEST_WRITE_FAILURE"] == "1"
            simulateBookmarkLoadFailure = environment["EXEGES_READER_TEST_BOOKMARK_LOAD_FAILURE"] == "1"
        }
        #endif
        self.corpusURL = corpusURL
        disk = NativeReaderDisk(url: stateURL)
        bookmarkDisk = NativeBookmarkDisk(url: stateURL.deletingLastPathComponent().appendingPathComponent("bookmarks-v1.json"))
    }

    func load() async {
        guard !loading, session == nil else { return }
        loading = true
        loadError = nil
        let sourceURL = corpusURL
        let store = disk
        let bookmarks = bookmarkDisk
        do {
            let loaded = try await Task.detached(priority: .userInitiated) {
                guard let sourceURL else { throw NativeReaderError.missingCorpus }
                let corpus = try ScriptureCorpus(data: Data(contentsOf: sourceURL))
                return (try NativeReaderSession(corpus: corpus, disk: store),
                        NativeScriptureSearch(corpus: corpus),
                        Result { try NativeBookmarkSession(corpus: corpus, disk: bookmarks) })
            }.value
            searchIndex = loaded.1
            applyBookmarks(loaded.2)
            #if DEBUG
            if simulateWriteFailure {
                var fixture = loaded.0.state
                fixture.notes["mark-4-9"] = NativeVerseNote(text: "A saved test note.", updatedAt: 0)
                session = try NativeReaderSession(corpus: loaded.0.corpus, state: fixture,
                                                  write: { _ in throw CocoaError(.fileWriteOutOfSpace) })
                if let loadedBookmarks = bookmarkSession {
                    bookmarkSession = try NativeBookmarkSession(corpus: loadedBookmarks.corpus, state: loadedBookmarks.state,
                                                               write: { _ in throw CocoaError(.fileWriteOutOfSpace) })
                }
            } else {
                session = loaded.0
            }
            if simulateBookmarkLoadFailure { applyBookmarks(.failure(CocoaError(.fileReadNoPermission))) }
            #else
            session = loaded.0
            #endif
        } catch {
            loadError = (error as? NativeReaderError)?.localizedDescription
                ?? "Your saved reading data could not be opened. It has been left untouched. Try again."
        }
        loading = false
    }

    @discardableResult
    private func update(_ change: (inout NativeReaderSession) throws -> Void) -> Bool {
        guard var next = session else { return false }
        do {
            try change(&next)
            session = next
            saveError = nil
            return true
        } catch {
            saveError = (error as? NativeReaderError)?.localizedDescription
                ?? "This change could not be saved on this device. Your previous saved data is unchanged. Try again."
            return false
        }
    }

    @discardableResult
    func navigate(to reference: ScriptureReference) -> Bool {
        guard let current = session?.state.position else { return false }
        guard update({ try $0.navigate(to: reference) }) else { return false }
        if current != reference { history.append(current) }
        navigationRevision &+= 1
        return true
    }

    func goBack() {
        guard let reference = history.last, update({ try $0.navigate(to: reference) }) else { return }
        history.removeLast()
        navigationRevision &+= 1
    }

    func rememberVerse(_ verse: Int) {
        guard var reference = session?.state.position, reference.verseNum != verse else { return }
        reference.verseNum = verse
        update { try $0.navigate(to: reference) }
    }

    func setAppearance(fontSize: Int, theme: String) {
        update { try $0.setAppearance(fontSize: fontSize, theme: theme) }
    }

    func saveNote(at reference: ScriptureReference, text: String) -> Bool {
        update { try $0.saveNote(at: reference, text: text) }
    }

    func deleteNote(at reference: ScriptureReference) -> Bool {
        update { try $0.deleteNote(at: reference) }
    }

    func isBookmarked(_ reference: ScriptureReference) -> Bool {
        bookmarkSession?.state.bookmarks[reference.noteKey] != nil
    }

    @discardableResult
    func toggleBookmark(_ reference: ScriptureReference) -> Bool {
        changeBookmarks { try $0.toggle(reference) }
    }

    @discardableResult
    func removeBookmark(_ reference: ScriptureReference) -> Bool {
        changeBookmarks { try $0.remove(reference) }
    }

    private func changeBookmarks(_ change: (inout NativeBookmarkSession) throws -> Void) -> Bool {
        guard var next = bookmarkSession else { return false }
        do {
            try change(&next)
            bookmarkSession = next
            bookmarkError = nil
            return true
        } catch {
            bookmarkError = (error as? NativeBookmarkError)?.localizedDescription
                ?? "Your bookmark change could not be saved. Try again."
            return false
        }
    }

    private func applyBookmarks(_ result: Result<NativeBookmarkSession, Error>) {
        switch result {
        case .success(let loaded):
            bookmarkSession = loaded
            bookmarkError = nil
        case .failure(let error):
            bookmarkSession = nil
            bookmarkError = (error as? NativeBookmarkError)?.localizedDescription
                ?? "Your bookmarks could not be opened. Reading is still available. Try again."
        }
    }

    func reloadBookmarks() async {
        guard let corpus = session?.corpus else { return }
        let disk = bookmarkDisk
        let result = await Task.detached(priority: .userInitiated) {
            Result { try NativeBookmarkSession(corpus: corpus, disk: disk) }
        }.value
        applyBookmarks(result)
    }
}
