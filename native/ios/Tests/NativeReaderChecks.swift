import Foundation

@main
struct NativeReaderChecks {
    static func main() throws {
        let corpus = try ScriptureCorpus(data: Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1])))
        var checks = 0
        func check(_ condition: Bool, _ message: String) {
            precondition(condition, message)
            checks += 1
        }
        func rejects(_ message: String, _ action: () throws -> Void) {
            do { try action(); preconditionFailure(message) } catch { checks += 1 }
        }
        let start = ScriptureReference(bookId: "genesis", chapterNum: 1, verseNum: 1)
        let end = ScriptureReference(bookId: "revelation", chapterNum: 22, verseNum: 21)
        check(corpus.books.count == 66, "Complete existing corpus")
        check(corpus.books.reduce(0) { $0 + $1.chapters.count } == 1189, "All chapters")
        check(corpus.books.reduce(0) { $0 + $1.chapters.reduce(0) { $0 + $1.verses.count } } == 31102, "All verses")
        check(corpus.chapter(at: start)?.verses.first?.displayText.hasPrefix("In the beginning") == true, "KJV content")
        check(corpus.adjacentChapter(to: start, offset: -1) == nil, "First Bible endpoint")
        check(corpus.adjacentChapter(to: end, offset: 1) == nil, "Last Bible endpoint")
        let genesisEnd = ScriptureReference(bookId: "genesis", chapterNum: 50, verseNum: 26)
        let exodus = ScriptureReference(bookId: "exodus", chapterNum: 1, verseNum: 1)
        check(corpus.adjacentChapter(to: genesisEnd, offset: 1) == exodus, "Next book")
        check(corpus.adjacentChapter(to: exodus, offset: -1)?.chapterNum == 50, "Previous book")
        check(!corpus.contains(.init(bookId: "mark", chapterNum: Int.min, verseNum: 1)), "Invalid chapter cannot overflow")
        check(!corpus.contains(.init(bookId: "mark", chapterNum: 1, verseNum: Int.min)), "Invalid verse cannot overflow")
        check(corpus.adjacentChapter(to: start, offset: Int.min) == nil, "Invalid offset cannot overflow")
        check(corpus.reference(forNoteKey: "1-john-2-3")?.bookId == "1-john", "Hyphenated IDs")
        check(corpus.reference(forNoteKey: "mark-999-1") == nil, "Invalid note reference")
        rejects("Malformed corpus rejected") { _ = try ScriptureCorpus(data: Data("[]".utf8)) }
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent("ExegesReaderChecks-\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: directory) }
        let disk = NativeReaderDisk(url: directory.appendingPathComponent("reader/state.json"))
        var session = try NativeReaderSession(corpus: corpus, disk: disk)
        check(session.state.position == start, "Fresh start")
        let target = ScriptureReference(bookId: "mark", chapterNum: 4, verseNum: 9)
        try session.navigate(to: target)
        try session.saveNote(at: target, text: "  Listen with attention.  ", now: Date(timeIntervalSince1970: 42))
        try session.setAppearance(fontSize: 24, theme: "dark")
        let resumed = try NativeReaderSession(corpus: corpus, disk: disk)
        check(resumed.state == session.state, "All reader state survives disk reload")
        check(resumed.state.notes[target.noteKey]?.text == "Listen with attention.", "Reader note normalized")
        check(resumed.state.notes[target.noteKey]?.updatedAt == 42_000, "Web-compatible millisecond timestamp")
        let before = session.state
        rejects("Bad navigation rejected") { try session.navigate(to: .init(bookId: "unknown", chapterNum: 1, verseNum: 1)) }
        rejects("Blank note cannot delete writing") { try session.saveNote(at: target, text: " \n ") }
        rejects("Invalid font rejected") { try session.setAppearance(fontSize: 1000, theme: "dark") }
        rejects("Invalid theme rejected") { try session.setAppearance(fontSize: 20, theme: "unknown") }
        check(session.state == before, "Validation failure preserves current state")
        try session.deleteNote(at: target)
        check(try NativeReaderSession(corpus: corpus, disk: disk).state.notes.isEmpty, "Explicit deletion persists")
        enum DiskFailure: Error { case unavailable }
        var failing = try NativeReaderSession(corpus: corpus, state: before, write: { _ in throw DiskFailure.unavailable })
        rejects("Write failure propagated") { try failing.saveNote(at: start, text: "Must not appear saved") }
        check(failing.state == before, "Write failure never publishes success")
        let blocker = directory.appendingPathComponent("blocker")
        let blockedDisk = NativeReaderDisk(url: blocker.appendingPathComponent("reader.json"))
        var blocked = try NativeReaderSession(corpus: corpus, disk: blockedDisk)
        try Data("file".utf8).write(to: blocker)
        rejects("Actual filesystem failure reported") { try blocked.navigate(to: target) }
        check(blocked.state.position == start, "Filesystem failure preserves place")
        rejects("Unreadable path must not be treated as a fresh reader") {
            _ = try NativeReaderSession(corpus: corpus, disk: blockedDisk)
        }
        let original = try Data(contentsOf: disk.url)
        for invalid in [Data("{broken".utf8), Data("{\"version\":2}".utf8)] {
            try invalid.write(to: disk.url)
            rejects("Corrupt/future state rejected") { _ = try NativeReaderSession(corpus: corpus, disk: disk) }
            check(try Data(contentsOf: disk.url) == invalid, "Unreadable state never overwritten")
        }
        try original.write(to: disk.url)
        check(try NativeReaderSession(corpus: corpus, disk: disk).state == session.state, "Recovery after restoring valid file")
        check(NativeScriptureSearch.normalize(" GOD’S...LÓVE ") == "gods love", "Search normalization")
        check(!NativeScriptureSearch.canSearch("a b"), "Single-letter tokens cannot match the entire corpus")
        check(!NativeScriptureSearch.canSearch(String(repeating: "!", count: 200) + "love"), "Query work is bounded")
        let indexStarted = Date()
        let search = NativeScriptureSearch(corpus: corpus)
        let indexDuration = Date().timeIntervalSince(indexStarted)
        check(try !search.search(" ").canSearch, "Empty query")
        check(try !search.search("a").canSearch, "Short query")
        check(try search.search("zzzxqv", context: start).totalCount == 0, "Context cannot admit nonmatching verses")
        let shepherd = try search.search("The Lord is my shepherd", context: start)
        check(shepherd.hits.first?.reference == ScriptureReference(bookId: "psalms", chapterNum: 23, verseNum: 1), "Exact phrase ranks first")
        check(try search.search("THE LORD IS MY SHEPHERD!").hits.first?.reference == shepherd.hits.first?.reference, "Case/punctuation match the same text")
        let common = try search.search("the")
        check(common.hits.count == 60 && common.totalCount > 60 && common.isLimited, "Bounded output with honest total count")
        let limited = try search.search("the", limit: 3)
        check(limited.hits.count == 3 && limited.totalCount == common.totalCount, "Caller can request a smaller result slice")
        check(try search.search("the", limit: 1000).hits.count == 60, "Caller cannot exceed result cap")
        check(try search.search("love grace", context: start).hits.allSatisfy {
            let text = NativeScriptureSearch.normalize($0.text)
            return text.contains("love") || text.contains("grace")
        }, "Every displayed hit matches a meaningful term")
        check(try search.search("every people after their language").hits.contains {
            $0.reference == ScriptureReference(bookId: "esther", chapterNum: 8, verseNum: 9)
        }, "Long verse endings are indexed without truncation")
        rejects("Canceled search must stop without returning stale results") {
            _ = try search.search("the", isCancelled: { true })
        }
        let fixture = try ScriptureCorpus(data: Data("""
        [{"id":"first","name":"First","chapters":[{"chapter":1,"verses":[{"verse":1,"text":"light grace"},{"verse":2,"text":"light and peace"}]}]},
         {"id":"second","name":"Second","chapters":[{"chapter":1,"verses":[{"verse":1,"text":"grace light"},{"verse":2,"text":"nothing here"}]}]}]
        """.utf8))
        let smallIndex = NativeScriptureSearch(corpus: fixture)
        let ties = try smallIndex.search("light")
        check(ties.hits.map(\.id) == ["first-1-1", "first-1-2", "second-1-1"], "Canonical ordering breaks equal scores")
        check(try smallIndex.search("light", context: ScriptureReference(bookId: "second", chapterNum: 1, verseNum: 1)).hits.first?.id == "second-1-1", "Context ranks actual matches")
        check(try smallIndex.search("light grace").hits.first?.id == "first-1-1", "Exact phrase outranks reordered words")

        let readerBytes = try Data(contentsOf: disk.url)
        let bookmarkDisk = NativeBookmarkDisk(url: directory.appendingPathComponent("reader/bookmarks-v1.json"))
        var bookmarks = try NativeBookmarkSession(corpus: corpus, disk: bookmarkDisk)
        check(bookmarks.state.bookmarks.isEmpty, "No bookmark file starts empty")
        try bookmarks.toggle(target, now: Date(timeIntervalSince1970: 42))
        check(bookmarks.state.bookmarks[target.noteKey] == 42_000, "Bookmark millisecond timestamp")
        check(try NativeBookmarkSession(corpus: corpus, disk: bookmarkDisk).state == bookmarks.state, "Bookmark survives reload")
        check(try Data(contentsOf: disk.url) == readerBytes, "Bookmark saves never rewrite notes/settings/position")
        let savedBookmarks = bookmarks.state
        rejects("Bookmark invalid reference rejected") {
            try bookmarks.toggle(ScriptureReference(bookId: "unknown", chapterNum: 1, verseNum: 1))
        }
        check(bookmarks.state == savedBookmarks, "Invalid bookmark leaves state unchanged")
        try bookmarks.remove(target)
        try bookmarks.remove(target)
        check(bookmarks.state.bookmarks.isEmpty, "Explicit removal is idempotent and cannot re-add a bookmark")
        check(try NativeBookmarkSession(corpus: corpus, disk: bookmarkDisk).state.bookmarks.isEmpty, "Removal persists")
        try bookmarks.toggle(start)
        try bookmarks.toggle(start)
        check(bookmarks.state.bookmarks.isEmpty, "Bookmark toggle removes an existing bookmark")
        var failingBookmarks = try NativeBookmarkSession(corpus: corpus, state: savedBookmarks, write: { _ in throw DiskFailure.unavailable })
        rejects("Failed bookmark removal reported") { try failingBookmarks.remove(target) }
        rejects("Failed bookmark save reported") { try failingBookmarks.toggle(start) }
        check(failingBookmarks.state == savedBookmarks, "Failed writes preserve all prior bookmarks")
        var blockedBookmarks = try NativeBookmarkSession(corpus: corpus, state: NativeBookmarkState(), write: NativeBookmarkDisk(url: blocker.appendingPathComponent("bookmarks.json")).save)
        rejects("Actual bookmark write failure reported") { try blockedBookmarks.toggle(start) }
        check(blockedBookmarks.state.bookmarks.isEmpty, "Actual write failure never publishes a bookmark")
        let goodBookmarkData = try Data(contentsOf: bookmarkDisk.url)
        for bad in ["{\"version\":1,\"bookmarks\":{\"genesis-01-1\":42}}", "{broken", "{\"version\":2}", "{\"version\":1,\"bookmarks\":{\"mark-99-1\":42}}", "{\"version\":1,\"bookmarks\":{\"mark-1-1\":-1}}"] {
            let bytes = Data(bad.utf8)
            try bytes.write(to: bookmarkDisk.url)
            rejects("Corrupt/future/invalid bookmark state rejected") { _ = try NativeBookmarkSession(corpus: corpus, disk: bookmarkDisk) }
            check(try Data(contentsOf: bookmarkDisk.url) == bytes, "Bad bookmark data is left untouched")
            check(try NativeReaderSession(corpus: corpus, disk: disk).state == session.state, "Corrupt bookmarks cannot block reader state")
        }
        try goodBookmarkData.write(to: bookmarkDisk.url)
        check(try NativeBookmarkSession(corpus: corpus, disk: bookmarkDisk).state == bookmarks.state, "Bookmark recovery after valid store restored")
        print("Search index built in \(String(format: "%.3f", indexDuration))s; common query matched \(common.totalCount) verses with \(common.hits.count) returned.")
        print("Native reader checks passed (\(checks) assertions; 66 books, 1,189 chapters, 31,102 verses).")
    }
}
