import Foundation

struct NativeSearchHit: Identifiable {
    let reference: ScriptureReference
    let bookName: String
    let text: String
    var id: String { reference.noteKey }
    var label: String { "\(bookName) \(reference.chapterNum):\(reference.verseNum)" }
}

struct NativeSearchResponse {
    let hits: [NativeSearchHit]
    let totalCount: Int
    let canSearch: Bool
    var isLimited: Bool { totalCount > hits.count }
}

struct NativeScriptureSearch {
    private struct Entry {
        let hit: NativeSearchHit
        let searchable: String
    }
    private let entries: [Entry]
    static let resultLimit = 60
    static let queryLimit = 200

    init(corpus: ScriptureCorpus) {
        entries = corpus.books.flatMap { book in
            book.chapters.flatMap { chapter in
                chapter.verses.map { verse in
                    Entry(hit: NativeSearchHit(reference: ScriptureReference(bookId: book.id,
                                                                              chapterNum: chapter.chapter,
                                                                              verseNum: verse.verse),
                                               bookName: book.name, text: verse.displayText),
                          searchable: Self.normalize(verse.displayText))
                }
            }
        }
    }

    static func normalize(_ value: String) -> String {
        let folded = value.folding(options: [.caseInsensitive, .diacriticInsensitive],
                                   locale: Locale(identifier: "en_US_POSIX")).lowercased()
        var result = ""
        var spaced = true
        for scalar in folded.unicodeScalars {
            if (97...122).contains(scalar.value) || (48...57).contains(scalar.value) {
                result.unicodeScalars.append(scalar)
                spaced = false
            } else if scalar.value == 39 || scalar.value == 0x2019 {
                continue
            } else if !spaced {
                result.append(" ")
                spaced = true
            }
        }
        return result.trimmingCharacters(in: .whitespaces)
    }

    static func canSearch(_ query: String) -> Bool {
        normalize(String(query.prefix(queryLimit))).split(separator: " ").contains { $0.count >= 2 }
    }

    private static func occurrences(of term: String, in text: String) -> Int {
        var count = 0
        var start = text.startIndex
        while let range = text.range(of: term, range: start..<text.endIndex) {
            count += 1
            start = range.upperBound
        }
        return count
    }

    func search(_ query: String, context: ScriptureReference? = nil,
                limit: Int = resultLimit, isCancelled: () -> Bool = { Task.isCancelled }) throws -> NativeSearchResponse {
        let phrase = Self.normalize(String(query.prefix(Self.queryLimit)))
        var seen = Set<String>()
        let terms = phrase.split(separator: " ").map(String.init).filter { $0.count >= 2 && seen.insert($0).inserted }
        guard !terms.isEmpty else { return NativeSearchResponse(hits: [], totalCount: 0, canSearch: false) }
        var matches: [(index: Int, phrase: Bool, allTerms: Bool, score: Int)] = []
        for (index, entry) in entries.enumerated() {
            if index % 64 == 0, isCancelled() { throw CancellationError() }
            let phraseMatches = entry.searchable.contains(phrase)
            let counts = terms.map { Self.occurrences(of: $0, in: entry.searchable) }
            // Passage context may rank a match, but can never make a nonmatch a result.
            guard phraseMatches || counts.contains(where: { $0 > 0 }) else { continue }
            let allTerms = counts.allSatisfy { $0 > 0 }
            var score = counts.reduce(0, +) * 12
            if entry.hit.reference.bookId == context?.bookId {
                score += 24
                if entry.hit.reference.chapterNum == context?.chapterNum { score += 36 }
            }
            matches.append((index, phraseMatches, allTerms, score))
        }
        matches.sort {
            if $0.phrase != $1.phrase { return $0.phrase }
            if $0.allTerms != $1.allTerms { return $0.allTerms }
            return $0.score == $1.score ? $0.index < $1.index : $0.score > $1.score
        }
        if isCancelled() { throw CancellationError() }
        return NativeSearchResponse(hits: matches.prefix(max(0, min(limit, Self.resultLimit))).map { entries[$0.index].hit },
                                    totalCount: matches.count, canSearch: true)
    }
}
