import Foundation

struct ScriptureReference: Codable, Hashable {
    var bookId: String
    var chapterNum: Int
    var verseNum: Int

    var noteKey: String { "\(bookId)-\(chapterNum)-\(verseNum)" }
}

struct ScriptureVerse: Decodable, Identifiable {
    let verse: Int
    let text: String
    var id: Int { verse }

    // The committed corpus uses a leading # as a paragraph marker.
    var displayText: String {
        text.hasPrefix("# ") ? String(text.dropFirst(2)) : text
    }
}

struct ScriptureChapter: Decodable, Identifiable {
    let chapter: Int
    let verses: [ScriptureVerse]
    var id: Int { chapter }
}

struct ScriptureBook: Decodable, Identifiable {
    let id: String
    let name: String
    let chapters: [ScriptureChapter]
}

struct ScriptureCorpus {
    let books: [ScriptureBook]

    init(data: Data) throws {
        books = try JSONDecoder().decode([ScriptureBook].self, from: data)
        guard !books.isEmpty, Set(books.map(\.id)).count == books.count else {
            throw NativeReaderError.invalidCorpus
        }
        for book in books {
            guard !book.id.isEmpty, !book.name.isEmpty, !book.chapters.isEmpty else {
                throw NativeReaderError.invalidCorpus
            }
            for (chapterIndex, chapter) in book.chapters.enumerated() {
                guard chapter.chapter == chapterIndex + 1, !chapter.verses.isEmpty else {
                    throw NativeReaderError.invalidCorpus
                }
                for (verseIndex, verse) in chapter.verses.enumerated() {
                    guard verse.verse == verseIndex + 1, !verse.text.isEmpty else {
                        throw NativeReaderError.invalidCorpus
                    }
                }
            }
        }
    }

    func book(_ id: String) -> ScriptureBook? { books.first { $0.id == id } }

    func chapter(at reference: ScriptureReference) -> ScriptureChapter? {
        guard reference.chapterNum > 0, let book = book(reference.bookId),
              book.chapters.indices.contains(reference.chapterNum - 1) else {
            return nil
        }
        return book.chapters[reference.chapterNum - 1]
    }

    func contains(_ reference: ScriptureReference) -> Bool {
        guard reference.verseNum > 0, let chapter = chapter(at: reference) else { return false }
        return chapter.verses.indices.contains(reference.verseNum - 1)
    }

    func adjacentChapter(to reference: ScriptureReference, offset: Int) -> ScriptureReference? {
        guard contains(reference), (offset == -1 || offset == 1),
              let index = books.firstIndex(where: { $0.id == reference.bookId }) else { return nil }
        let book = books[index]
        let next = reference.chapterNum + offset
        if book.chapters.indices.contains(next - 1) {
            return ScriptureReference(bookId: book.id, chapterNum: next, verseNum: 1)
        }
        guard books.indices.contains(index + offset) else { return nil }
        let nextBook = books[index + offset]
        return ScriptureReference(bookId: nextBook.id,
                                  chapterNum: offset > 0 ? 1 : nextBook.chapters.count, verseNum: 1)
    }

    func label(_ reference: ScriptureReference) -> String {
        "\(book(reference.bookId)?.name ?? reference.bookId) \(reference.chapterNum):\(reference.verseNum)"
    }

    func reference(forNoteKey key: String) -> ScriptureReference? {
        var parts = key.split(separator: "-").map(String.init)
        guard parts.count >= 3, let verse = Int(parts.removeLast()),
              let chapter = Int(parts.removeLast()) else { return nil }
        let reference = ScriptureReference(bookId: parts.joined(separator: "-"), chapterNum: chapter, verseNum: verse)
        return contains(reference) ? reference : nil
    }
}

enum NativeReaderError: LocalizedError {
    case invalidCorpus, missingCorpus, invalidState, unsupportedVersion, invalidReference, emptyNote

    var errorDescription: String? {
        switch self {
        case .invalidCorpus, .missingCorpus:
            return "Scripture could not be opened. Try opening the reader again."
        case .invalidState:
            return "Your saved reading data could not be opened. It has been left untouched."
        case .unsupportedVersion:
            return "Your saved reading data needs a different version of Exeges. It has been left untouched."
        case .invalidReference:
            return "That passage is not available. Your reading place has not changed."
        case .emptyNote:
            return "Write a note before saving, or use Delete to remove an existing note."
        }
    }
}

struct NativeVerseNote: Codable, Equatable {
    var text: String
    var updatedAt: Double
}

struct NativeReaderState: Codable, Equatable {
    static let fontSizes = [14, 15, 16, 17, 18, 19, 20, 22, 24]
    static let themes = ["auto", "light", "dark"]
    var version = 1
    var position: ScriptureReference
    var fontSize = 20
    var theme = "auto"
    var notes: [String: NativeVerseNote] = [:]

    func validate(in corpus: ScriptureCorpus) throws {
        guard version == 1 else { throw NativeReaderError.unsupportedVersion }
        guard corpus.contains(position), Self.fontSizes.contains(fontSize), Self.themes.contains(theme),
              notes.allSatisfy({ key, note in
                  corpus.reference(forNoteKey: key) != nil && !note.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                  && note.text.count <= 100_000 && note.updatedAt.isFinite && note.updatedAt >= 0
              }) else { throw NativeReaderError.invalidState }
    }
}

struct NativeReaderDisk {
    let url: URL

    func load(corpus: ScriptureCorpus) throws -> NativeReaderState {
        let data: Data
        do {
            data = try Data(contentsOf: url)
        } catch let error as CocoaError where error.code == .fileReadNoSuchFile {
            return NativeReaderState(position: ScriptureReference(bookId: corpus.books[0].id,
                                                                  chapterNum: 1, verseNum: 1))
        }
        let version = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        if let number = version?["version"] as? Int, number != 1 {
            throw NativeReaderError.unsupportedVersion
        }
        let state: NativeReaderState
        do { state = try JSONDecoder().decode(NativeReaderState.self, from: data) }
        catch { throw NativeReaderError.invalidState }
        try state.validate(in: corpus)
        return state
    }

    func save(_ state: NativeReaderState) throws {
        let data = try JSONEncoder().encode(state)
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        #if os(iOS)
        try data.write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
        #else
        try data.write(to: url, options: .atomic)
        #endif
    }
}

// No UI or website storage dependency: publishing a save always follows a successful disk write.
struct NativeReaderSession {
    let corpus: ScriptureCorpus
    private(set) var state: NativeReaderState
    private let write: (NativeReaderState) throws -> Void

    init(corpus: ScriptureCorpus, disk: NativeReaderDisk) throws {
        self.corpus = corpus
        state = try disk.load(corpus: corpus)
        write = disk.save
    }

    init(corpus: ScriptureCorpus, state: NativeReaderState, write: @escaping (NativeReaderState) throws -> Void) throws {
        try state.validate(in: corpus)
        self.corpus = corpus
        self.state = state
        self.write = write
    }

    private mutating func commit(_ next: NativeReaderState) throws {
        try next.validate(in: corpus)
        guard next != state else { return }
        try write(next)
        state = next
    }

    mutating func navigate(to reference: ScriptureReference) throws {
        guard corpus.contains(reference) else { throw NativeReaderError.invalidReference }
        var next = state
        next.position = reference
        try commit(next)
    }

    mutating func setAppearance(fontSize: Int, theme: String) throws {
        var next = state
        next.fontSize = fontSize
        next.theme = theme
        try commit(next)
    }

    mutating func saveNote(at reference: ScriptureReference, text: String, now: Date = Date()) throws {
        guard corpus.contains(reference) else { throw NativeReaderError.invalidReference }
        let clean = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !clean.isEmpty else { throw NativeReaderError.emptyNote }
        var next = state
        next.notes[reference.noteKey] = NativeVerseNote(text: clean, updatedAt: now.timeIntervalSince1970 * 1000)
        try commit(next)
    }

    mutating func deleteNote(at reference: ScriptureReference) throws {
        guard corpus.contains(reference) else { throw NativeReaderError.invalidReference }
        var next = state
        next.notes.removeValue(forKey: reference.noteKey)
        try commit(next)
    }
}
