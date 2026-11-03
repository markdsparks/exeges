import Foundation

enum NativeBookmarkError: LocalizedError {
    case invalidDocument, unsupportedVersion, invalidReference
    var errorDescription: String? {
        switch self {
        case .invalidDocument: return "Your bookmarks could not be opened. They have been left untouched."
        case .unsupportedVersion: return "Your bookmarks need a different version of Exeges. They have been left untouched."
        case .invalidReference: return "That verse cannot be bookmarked. Your bookmarks have not changed."
        }
    }
}

struct NativeBookmarkState: Codable, Equatable {
    var version = 1
    var bookmarks: [String: Double] = [:]

    func validate(in corpus: ScriptureCorpus) throws {
        guard version == 1 else { throw NativeBookmarkError.unsupportedVersion }
        guard bookmarks.allSatisfy({ key, timestamp in
            corpus.reference(forNoteKey: key)?.noteKey == key && timestamp.isFinite && timestamp >= 0
        }) else { throw NativeBookmarkError.invalidDocument }
    }
}

struct NativeBookmarkDisk {
    let url: URL

    func load(corpus: ScriptureCorpus) throws -> NativeBookmarkState {
        let data: Data
        do { data = try Data(contentsOf: url) }
        catch let error as CocoaError where error.code == .fileReadNoSuchFile { return NativeBookmarkState() }
        let header = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        if let version = header?["version"] as? Int, version != 1 { throw NativeBookmarkError.unsupportedVersion }
        let state: NativeBookmarkState
        do { state = try JSONDecoder().decode(NativeBookmarkState.self, from: data) }
        catch { throw NativeBookmarkError.invalidDocument }
        try state.validate(in: corpus)
        return state
    }

    func save(_ state: NativeBookmarkState) throws {
        let data = try JSONEncoder().encode(state)
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        #if os(iOS)
        try data.write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
        #else
        try data.write(to: url, options: .atomic)
        #endif
    }
}

struct NativeBookmarkSession {
    let corpus: ScriptureCorpus
    private(set) var state: NativeBookmarkState
    private let write: (NativeBookmarkState) throws -> Void

    init(corpus: ScriptureCorpus, disk: NativeBookmarkDisk) throws {
        self.corpus = corpus
        state = try disk.load(corpus: corpus)
        write = disk.save
    }

    init(corpus: ScriptureCorpus, state: NativeBookmarkState,
         write: @escaping (NativeBookmarkState) throws -> Void) throws {
        try state.validate(in: corpus)
        self.corpus = corpus
        self.state = state
        self.write = write
    }

    mutating func toggle(_ reference: ScriptureReference, now: Date = Date()) throws {
        guard corpus.contains(reference) else { throw NativeBookmarkError.invalidReference }
        var next = state
        if next.bookmarks[reference.noteKey] != nil { next.bookmarks.removeValue(forKey: reference.noteKey) }
        else { next.bookmarks[reference.noteKey] = now.timeIntervalSince1970 * 1000 }
        try commit(next)
    }

    mutating func remove(_ reference: ScriptureReference) throws {
        guard corpus.contains(reference) else { throw NativeBookmarkError.invalidReference }
        var next = state
        next.bookmarks.removeValue(forKey: reference.noteKey)
        try commit(next)
    }

    private mutating func commit(_ next: NativeBookmarkState) throws {
        try next.validate(in: corpus)
        guard next != state else { return }
        try write(next)
        state = next
    }
}
