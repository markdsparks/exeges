import SwiftUI

private struct NativeReaderToolTint: ViewModifier {
    @Environment(\.colorScheme) private var colorScheme
    func body(content: Content) -> some View {
        content.tint(colorScheme == .dark ? Color(red: 0.88, green: 0.69, blue: 0.48)
                     : Color(red: 0.55, green: 0.33, blue: 0.20))
    }
}

struct NativeScriptureSearchView: View {
    @ObservedObject var model: NativeReaderModel
    let close: () -> Void
    @State private var query = ""
    @State private var completedQuery = ""
    @State private var response: NativeSearchResponse?
    @State private var searchError: String?

    var body: some View {
        NavigationStack {
            // Keep the search controller, close action and task stable across result-state changes.
            ZStack {
                if !NativeScriptureSearch.canSearch(query) {
                    ContentUnavailableView(query.isEmpty ? "Search Scripture" : "Keep typing",
                                           systemImage: "magnifyingglass",
                                           description: Text("Find words or a phrase in the King James Version. Enter at least two letters in a word."))
                } else if completedQuery != query || response == nil && searchError == nil {
                    ProgressView("Searching KJV")
                } else if let error = searchError {
                    ContentUnavailableView("Search unavailable", systemImage: "magnifyingglass", description: Text(error))
                } else if let response, response.hits.isEmpty {
                    ContentUnavailableView.search(text: query)
                        .accessibilityIdentifier("search.empty")
                } else if let response {
                    List {
                        Section {
                            ForEach(response.hits) { hit in
                                Button {
                                    if model.navigate(to: hit.reference) { close() }
                                } label: {
                                    VStack(alignment: .leading, spacing: 8) {
                                        Text(hit.label).font(.headline).foregroundStyle(Color.primary)
                                        Text(hit.text).font(.system(.body, design: .serif))
                                            .foregroundStyle(Color.primary).fixedSize(horizontal: false, vertical: true)
                                    }.padding(.vertical, 4)
                                }
                                .accessibilityIdentifier("search.hit.\(hit.id)")
                            }
                        } header: {
                            Text(response.isLimited ? "First \(response.hits.count) of \(response.totalCount) matches · KJV"
                                 : "\(response.totalCount) \(response.totalCount == 1 ? "match" : "matches") · KJV")
                                .accessibilityIdentifier("search.count")
                        }
                    }
                    .accessibilityIdentifier("search.results")
                    .scrollDismissesKeyboard(.interactively)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .navigationTitle("Search KJV")
            .navigationBarTitleDisplayMode(.inline)
            .searchable(text: $query, placement: .navigationBarDrawer(displayMode: .always), prompt: "Words or a phrase")
            .safeAreaInset(edge: .bottom, spacing: 0) {
                Button("Return to Reading") { close() }
                    .frame(maxWidth: .infinity, minHeight: 44).padding(.horizontal, 16).padding(.vertical, 6)
                    .background(.bar).accessibilityIdentifier("search.close")
            }
            .safeAreaInset(edge: .top) {
                if let error = model.saveError {
                    Text(error).font(.callout).padding().frame(maxWidth: .infinity)
                        .background(.regularMaterial).accessibilityIdentifier("search.navigationError")
                }
            }
            .task(id: query) { await search(query) }
            .onChange(of: query) { _, value in
                if value.count > NativeScriptureSearch.queryLimit { query = String(value.prefix(NativeScriptureSearch.queryLimit)) }
            }
        }.modifier(NativeReaderToolTint())
    }

    private func search(_ request: String) async {
        response = nil
        searchError = nil
        guard NativeScriptureSearch.canSearch(request), let index = model.searchIndex else {
            completedQuery = request
            return
        }
        let context = model.session?.state.position
        do {
            try await Task.sleep(for: .milliseconds(180))
            let worker = Task.detached(priority: .userInitiated) { try index.search(request, context: context) }
            let result = try await withTaskCancellationHandler {
                try await worker.value
            } onCancel: {
                worker.cancel()
            }
            try Task.checkCancellation()
            response = result
            completedQuery = request
        } catch is CancellationError {
            return
        } catch {
            guard !Task.isCancelled else { return }
            searchError = "Search could not finish. Change your search to try again."
            completedQuery = request
        }
    }
}

struct NativeBookmarksView: View {
    @ObservedObject var model: NativeReaderModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                if model.bookmarkSession == nil {
                    ContentUnavailableView {
                        Label("Bookmarks unavailable", systemImage: "bookmark")
                    } description: {
                        Text(model.bookmarkError ?? "Your bookmarks could not be opened. Reading is still available.")
                    } actions: {
                        Button("Try again") { Task { await model.reloadBookmarks() } }
                            .accessibilityIdentifier("bookmarks.retry")
                    }
                } else if let session = model.session, let bookmarks = model.bookmarkSession?.state.bookmarks {
                    if bookmarks.isEmpty {
                        ContentUnavailableView("No bookmarks yet", systemImage: "bookmark",
                                               description: Text("Touch and hold a verse, or tap it to save a bookmark."))
                            .accessibilityIdentifier("bookmarks.empty")
                    } else {
                        List {
                            ForEach(bookmarks.keys.sorted {
                                bookmarks[$0] == bookmarks[$1] ? $0 < $1 : (bookmarks[$0] ?? 0) > (bookmarks[$1] ?? 0)
                            }, id: \.self) { key in
                                if let reference = session.corpus.reference(forNoteKey: key),
                                   let verse = session.corpus.chapter(at: reference)?.verses.first(where: { $0.verse == reference.verseNum }) {
                                    Button {
                                        if model.navigate(to: reference) { dismiss() }
                                    } label: {
                                        VStack(alignment: .leading, spacing: 8) {
                                            Text(session.corpus.label(reference)).font(.headline).foregroundStyle(Color.primary)
                                            Text(verse.displayText).font(.system(.body, design: .serif))
                                                .foregroundStyle(Color.primary).lineLimit(3)
                                        }.padding(.vertical, 4)
                                    }
                                    .accessibilityIdentifier("bookmarks.open.\(key)")
                                    .swipeActions {
                                        Button("Remove", role: .destructive) { model.removeBookmark(reference) }
                                    }
                                    .contextMenu {
                                        Button("Remove Bookmark", systemImage: "bookmark.slash") { model.removeBookmark(reference) }
                                    }
                                }
                            }
                        }.accessibilityIdentifier("bookmarks.list")
                    }
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .navigationTitle("My Bookmarks")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
            .safeAreaInset(edge: .top) {
                if model.bookmarkSession != nil, let error = model.bookmarkError ?? model.saveError {
                    Text(error).font(.callout).padding().frame(maxWidth: .infinity)
                        .background(.regularMaterial).accessibilityIdentifier("bookmarks.saveError")
                }
            }
        }.modifier(NativeReaderToolTint())
    }
}
