import SwiftUI

private enum ReaderSheet: String, Identifiable {
    case passage, appearance, notes, search, bookmarks, existing, about
    var id: String { rawValue }
}

private struct NoteSelection: Identifiable {
    let reference: ScriptureReference
    var id: String { reference.noteKey }
}

struct NativeReaderView: View {
    @StateObject private var model = NativeReaderModel()
    @State private var sheet: ReaderSheet?
    @State private var note: NoteSelection?
    @Environment(\.colorScheme) private var colorScheme

    private var paper: Color {
        colorScheme == .dark ? Color(red: 0.10, green: 0.105, blue: 0.10)
            : Color(red: 0.975, green: 0.96, blue: 0.92)
    }

    var body: some View {
        NavigationStack {
            Group {
                if let session = model.session {
                    reader(session)
                } else if let error = model.loadError {
                    ContentUnavailableView {
                        Label("Unable to open the reader", systemImage: "book.closed")
                    } description: {
                        Text(error)
                    } actions: {
                        Button("Try again") { Task { await model.load() } }
                            .accessibilityIdentifier("reader.retry")
                        Button("Open Existing Exeges") { sheet = .existing }
                    }
                } else {
                    ProgressView("Opening Scripture")
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(paper)
            .navigationTitle("Exeges")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                if let session = model.session {
                    ToolbarItem(placement: .principal) {
                        Button {
                            sheet = .passage
                        } label: {
                            HStack(spacing: 6) {
                                Text("\(session.corpus.book(session.state.position.bookId)?.name ?? "") \(session.state.position.chapterNum)")
                                    .font(.headline)
                                Image(systemName: "chevron.down").font(.caption2)
                            }
                        }
                        .accessibilityLabel("Choose passage")
                        .accessibilityValue(session.corpus.label(session.state.position))
                        .accessibilityIdentifier("reader.passage")
                    }
                    ToolbarItem(placement: .topBarLeading) {
                        Button { model.goBack() } label: { Image(systemName: "chevron.backward") }
                            .disabled(model.history.isEmpty)
                            .accessibilityLabel("Back to previous passage")
                            .accessibilityIdentifier("reader.back")
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        if model.session != nil {
                            Button("Search Scripture", systemImage: "magnifyingglass") { sheet = .search }
                            Button("My Bookmarks", systemImage: "bookmark") { sheet = .bookmarks }
                            Button("Appearance", systemImage: "textformat.size") { sheet = .appearance }
                            Button("My Notes", systemImage: "note.text") { sheet = .notes }
                        }
                        Button("Existing Exeges", systemImage: "book.closed") { sheet = .existing }
                        Button("About This Preview", systemImage: "info.circle") { sheet = .about }
                    } label: { Image(systemName: "ellipsis.circle") }
                    .accessibilityLabel("Reader menu")
                    .accessibilityIdentifier("reader.menu")
                }
            }
            .safeAreaInset(edge: .top, spacing: 0) {
                VStack(spacing: 0) {
                    if let error = model.saveError {
                        Text(error).font(.callout).foregroundStyle(.primary)
                            .padding().frame(maxWidth: .infinity)
                            .background(.regularMaterial)
                            .accessibilityIdentifier("reader.saveError")
                    }
                    if model.bookmarkSession != nil, let error = model.bookmarkError {
                        Text(error).font(.callout).padding().frame(maxWidth: .infinity)
                            .background(.regularMaterial).accessibilityIdentifier("reader.bookmarkError")
                    }
                }
            }
        }
        .tint(colorScheme == .dark ? Color(red: 0.88, green: 0.69, blue: 0.48)
              : Color(red: 0.55, green: 0.33, blue: 0.20))
        .preferredColorScheme(model.session?.state.theme == "dark" ? .dark
                              : model.session?.state.theme == "light" ? .light : nil)
        .task { await model.load() }
        .sheet(item: $sheet) { selected in
            switch selected {
            case .passage: NativePassagePicker(model: model)
            case .appearance: NativeAppearanceView(model: model)
            case .notes: NativeNotesList(model: model)
            case .search: NativeScriptureSearchView(model: model, close: { sheet = nil })
            case .bookmarks: NativeBookmarksView(model: model)
            case .existing: ExistingExegesView()
            case .about:
                NavigationStack {
                    Form {
                        Section("Native Reader Preview") {
                            Text("Read and search the King James Version, save bookmarks, and keep private verse notes on this device.")
                            Text("Your existing saved material remains available in Existing Exeges. It has not been moved into this preview.")
                        }
                    }
                    .navigationTitle("About This Preview")
                    .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { sheet = nil } } }
                }
            }
        }
        .sheet(item: $note) { selection in
            NativeNoteEditor(model: model, reference: selection.reference)
        }
    }

    private func reader(_ session: NativeReaderSession) -> some View {
        NativeChapterView(model: model) { reference in note = NoteSelection(reference: reference) }
            .id("\(session.state.position.bookId)-\(session.state.position.chapterNum)")
            .safeAreaInset(edge: .bottom, spacing: 0) {
                HStack {
                    chapterButton("Previous chapter", systemImage: "chevron.left", offset: -1, session: session)
                    Spacer()
                    Text("KING JAMES VERSION").font(.caption2).tracking(1.5).foregroundStyle(.secondary)
                        .accessibilityLabel("King James Version")
                    Spacer()
                    chapterButton("Next chapter", systemImage: "chevron.right", offset: 1, session: session)
                }
                .padding(.horizontal, 20).padding(.vertical, 6)
                .background(.bar)
            }
    }

    private func chapterButton(_ label: String, systemImage: String, offset: Int,
                               session: NativeReaderSession) -> some View {
        let target = session.corpus.adjacentChapter(to: session.state.position, offset: offset)
        return Button {
            if let target { model.navigate(to: target) }
        } label: {
            Image(systemName: systemImage).frame(minWidth: 44, minHeight: 44)
        }
        .disabled(target == nil)
        .accessibilityLabel(label)
        .accessibilityIdentifier(offset > 0 ? "reader.next" : "reader.previous")
    }
}

private struct NativeChapterView: View {
    @ObservedObject var model: NativeReaderModel
    let openNote: (ScriptureReference) -> Void
    @State private var visibleVerse: Int?
    @State private var pendingVerse: Int?
    @ScaledMetric(relativeTo: .body) private var typeScale = 1.0
    @Environment(\.verticalSizeClass) private var verticalSizeClass

    init(model: NativeReaderModel, openNote: @escaping (ScriptureReference) -> Void) {
        self.model = model
        self.openNote = openNote
        _visibleVerse = State(initialValue: nil)
        _pendingVerse = State(initialValue: model.session?.state.position.verseNum)
    }

    var body: some View {
        if let session = model.session, let chapter = session.corpus.chapter(at: session.state.position) {
            GeometryReader { viewport in
                ScrollViewReader { proxy in
                    ScrollView {
                        if verticalSizeClass == .compact {
                            Color.clear.frame(height: 12).id("chapter-heading")
                                .accessibilityHidden(true)
                        } else {
                            VStack(spacing: 8) {
                                Text(session.corpus.book(session.state.position.bookId)?.name ?? "")
                                    .font(.system(.largeTitle, design: .serif))
                                Text("CHAPTER \(chapter.chapter)").font(.caption).tracking(3).foregroundStyle(.secondary)
                            }
                            .frame(maxWidth: .infinity).padding(.top, 28).padding(.bottom, 24)
                            .accessibilityElement(children: .combine)
                            .id("chapter-heading")
                        }

                        LazyVStack(alignment: .leading, spacing: 18) {
                            ForEach(chapter.verses) { verse in
                                let reference = ScriptureReference(bookId: session.state.position.bookId,
                                                                   chapterNum: chapter.chapter, verseNum: verse.verse)
                                Button { openNote(reference) } label: {
                                    HStack(alignment: .firstTextBaseline, spacing: 10) {
                                        Text(String(verse.verse)).font(.system(size: 12 * typeScale))
                                            .foregroundStyle(.secondary).frame(minWidth: 22, alignment: .trailing)
                                        Text(verse.displayText)
                                            .font(.system(size: CGFloat(session.state.fontSize) * typeScale, design: .serif))
                                            .lineSpacing(7).frame(maxWidth: .infinity, alignment: .leading)
                                            .fixedSize(horizontal: false, vertical: true)
                                        if session.state.notes[reference.noteKey] != nil {
                                            Image(systemName: "note.text").font(.caption).foregroundStyle(.secondary)
                                        }
                                        if model.isBookmarked(reference) {
                                            Image(systemName: "bookmark.fill").font(.caption).foregroundStyle(.secondary)
                                        }
                                    }
                                    .padding(.vertical, 4).frame(minHeight: 44)
                                    .contentShape(Rectangle())
                                }
                                .buttonStyle(.plain)
                                .contextMenu {
                                    Button(model.isBookmarked(reference) ? "Remove Bookmark" : "Bookmark Verse",
                                           systemImage: model.isBookmarked(reference) ? "bookmark.slash" : "bookmark") {
                                        model.toggleBookmark(reference)
                                    }.disabled(model.bookmarkSession == nil)
                                }
                                .accessibilityLabel("Verse \(verse.verse). \(verse.displayText)")
                                .accessibilityValue([session.state.notes[reference.noteKey] == nil ? nil : "Has a saved note",
                                                     model.isBookmarked(reference) ? "Bookmarked" : nil].compactMap { $0 }.joined(separator: ". "))
                                .accessibilityHint("Write or edit your note, or save a bookmark on this verse")
                                .accessibilityIdentifier("reader.verse.\(verse.verse)")
                                .id(verse.verse)
                            }
                        }
                        .scrollTargetLayout()
                        // Let even a short chapter's final verse reach the top resume anchor.
                        .frame(maxWidth: 680).padding(.horizontal, 22)
                        .padding(.bottom, max(36, viewport.size.height - 44))
                        .frame(maxWidth: .infinity)
                    }
                    .scrollPosition(id: $visibleVerse, anchor: .top)
                    .accessibilityIdentifier("reader.scripture")
                    .onChange(of: visibleVerse) { _, value in
                        guard let value, pendingVerse == nil || pendingVerse == value else { return }
                        pendingVerse = nil
                        model.rememberVerse(value)
                    }
                    .task(id: model.navigationRevision) {
                        let target = session.state.position.verseNum
                        pendingVerse = target == 1 || visibleVerse == target ? nil : target
                        // Wait for the new chapter's scroll targets to enter the layout.
                        await Task.yield()
                        if target == 1 { proxy.scrollTo("chapter-heading", anchor: .top) }
                        else { proxy.scrollTo(target, anchor: .top) }
                    }
                }
            }
        }
    }
}

private struct NativePassagePicker: View {
    @ObservedObject var model: NativeReaderModel
    @Environment(\.dismiss) private var dismiss
    @State private var bookId: String
    @State private var chapter: Int
    @State private var verse: Int

    init(model: NativeReaderModel) {
        self.model = model
        let reference = model.session!.state.position
        _bookId = State(initialValue: reference.bookId)
        _chapter = State(initialValue: reference.chapterNum)
        _verse = State(initialValue: reference.verseNum)
    }

    var body: some View {
        NavigationStack {
            if let corpus = model.session?.corpus, let book = corpus.book(bookId) {
                Form {
                    NavigationLink {
                        NativeBookPicker(corpus: corpus, bookId: $bookId)
                    } label: {
                        LabeledContent("Book", value: book.name)
                    }.accessibilityIdentifier("passage.book")
                    Picker("Chapter", selection: $chapter) {
                        ForEach(book.chapters) {
                            Text(String($0.chapter)).tag($0.chapter)
                                .accessibilityIdentifier("passage.chapter.option.\($0.chapter)")
                        }
                    }.pickerStyle(.navigationLink).accessibilityIdentifier("passage.chapter")
                    Picker("Verse", selection: $verse) {
                        ForEach((book.chapters.first { $0.chapter == chapter } ?? book.chapters[0]).verses) {
                            Text(String($0.verse)).tag($0.verse)
                                .accessibilityIdentifier("passage.verse.option.\($0.verse)")
                        }
                    }.pickerStyle(.navigationLink).accessibilityIdentifier("passage.verse")
                    if let error = model.saveError { Text(error).foregroundStyle(.red) }
                }
                .onChange(of: bookId) { _, _ in chapter = 1; verse = 1 }
                .onChange(of: chapter) { _, _ in verse = 1 }
                .navigationTitle("Choose Passage")
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Read") {
                            if model.navigate(to: ScriptureReference(bookId: bookId, chapterNum: chapter, verseNum: verse)) {
                                dismiss()
                            }
                        }.accessibilityIdentifier("passage.read")
                    }
                }
            }
        }
    }
}

private struct NativeBookPicker: View {
    let corpus: ScriptureCorpus
    @Binding var bookId: String
    @State private var search = ""
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        List(corpus.books.filter { search.isEmpty || $0.name.localizedCaseInsensitiveContains(search) }) { book in
            Button {
                bookId = book.id
                dismiss()
            } label: {
                HStack {
                    Text(book.name)
                    Spacer()
                    if book.id == bookId { Image(systemName: "checkmark") }
                }
            }.accessibilityIdentifier("passage.book.\(book.id)")
        }
        .searchable(text: $search, prompt: "Find a book")
        .navigationTitle("Book")
    }
}

private struct NativeAppearanceView: View {
    @ObservedObject var model: NativeReaderModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                if let state = model.session?.state {
                    Section("Reading Size") {
                        HStack {
                            Button { resize(state, by: -1) } label: { Label("Smaller text", systemImage: "textformat.size.smaller") }
                                .disabled(state.fontSize == NativeReaderState.fontSizes.first)
                                .accessibilityIdentifier("appearance.smaller")
                            Spacer()
                            Text("\(state.fontSize)").accessibilityLabel("Text size \(state.fontSize)")
                            Spacer()
                            Button { resize(state, by: 1) } label: { Label("Larger text", systemImage: "textformat.size.larger") }
                                .disabled(state.fontSize == NativeReaderState.fontSizes.last)
                                .accessibilityIdentifier("appearance.larger")
                        }
                        .labelStyle(.iconOnly).buttonStyle(.borderless)
                        Text("In the beginning was the Word.")
                            .font(.custom("Georgia", size: CGFloat(state.fontSize), relativeTo: .body))
                    }
                    Picker("Appearance", selection: Binding(get: { state.theme }, set: {
                        model.setAppearance(fontSize: state.fontSize, theme: $0)
                    })) {
                        Text("System").tag("auto")
                        Text("Light").tag("light")
                        Text("Dark").tag("dark")
                    }.accessibilityIdentifier("appearance.theme")
                    if let error = model.saveError { Text(error).foregroundStyle(.red) }
                }
            }
            .accessibilityIdentifier("appearance.form")
            .navigationTitle("Appearance")
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
        }
    }

    private func resize(_ state: NativeReaderState, by offset: Int) {
        guard let index = NativeReaderState.fontSizes.firstIndex(of: state.fontSize),
              NativeReaderState.fontSizes.indices.contains(index + offset) else { return }
        model.setAppearance(fontSize: NativeReaderState.fontSizes[index + offset], theme: state.theme)
    }
}

private struct NativeNoteEditor: View {
    @ObservedObject var model: NativeReaderModel
    let reference: ScriptureReference
    @Environment(\.dismiss) private var dismiss
    @State private var text: String
    @State private var confirmDelete = false
    @State private var error: String?
    @FocusState private var focused: Bool

    init(model: NativeReaderModel, reference: ScriptureReference) {
        self.model = model
        self.reference = reference
        _text = State(initialValue: model.session?.state.notes[reference.noteKey]?.text ?? "")
    }

    var body: some View {
        NavigationStack {
            Form {
                if let session = model.session,
                   let verse = session.corpus.chapter(at: reference)?.verses.first(where: { $0.verse == reference.verseNum }) {
                    Section { Text(verse.displayText).font(.system(.body, design: .serif)).foregroundStyle(.secondary) }
                }
                Section {
                    Button(model.isBookmarked(reference) ? "Remove Bookmark" : "Bookmark Verse",
                           systemImage: model.isBookmarked(reference) ? "bookmark.fill" : "bookmark") {
                        model.toggleBookmark(reference)
                    }
                    .disabled(model.bookmarkSession == nil)
                    .accessibilityIdentifier("verse.bookmark")
                    if let bookmarkError = model.bookmarkError { Text(bookmarkError).foregroundStyle(.red) }
                }
                Section("Your Note") {
                    TextEditor(text: $text).frame(minHeight: 200)
                        .focused($focused).accessibilityLabel("Your note")
                        .accessibilityIdentifier("note.text")
                }
                if let error { Section { Text(error).foregroundStyle(.red) } }
                if model.session?.state.notes[reference.noteKey] != nil {
                    Section {
                        Button("Delete Note", role: .destructive) { focused = false; confirmDelete = true }
                            .accessibilityIdentifier("note.delete")
                    }
                }
            }
            .navigationTitle(model.session?.corpus.label(reference) ?? "Your Note")
            .navigationBarTitleDisplayMode(.inline)
            .interactiveDismissDisabled(text != (model.session?.state.notes[reference.noteKey]?.text ?? ""))
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }.accessibilityIdentifier("note.cancel")
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        if model.saveNote(at: reference, text: text) { dismiss() }
                        else { error = model.saveError }
                    }
                    .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || text.count > 100_000)
                    .accessibilityIdentifier("note.save")
                }
                ToolbarItemGroup(placement: .keyboard) {
                    Spacer()
                    Button("Done") { focused = false }
                }
            }
            .confirmationDialog("Delete your note?", isPresented: $confirmDelete, titleVisibility: .visible) {
                Button("Delete Note", role: .destructive) {
                    if model.deleteNote(at: reference) { dismiss() }
                    else { error = model.saveError }
                }
            }
        }
    }
}

private struct NativeNotesList: View {
    @ObservedObject var model: NativeReaderModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Group {
                if let session = model.session {
                    if session.state.notes.isEmpty {
                        ContentUnavailableView("No notes yet", systemImage: "note.text",
                                               description: Text("Tap a verse while reading to write your own note."))
                    } else {
                        List(session.state.notes.keys.sorted {
                            (session.state.notes[$0]?.updatedAt ?? 0) > (session.state.notes[$1]?.updatedAt ?? 0)
                        }, id: \.self) { key in
                            if let reference = session.corpus.reference(forNoteKey: key), let note = session.state.notes[key] {
                                Button {
                                    if model.navigate(to: reference) { dismiss() }
                                } label: {
                                    VStack(alignment: .leading, spacing: 8) {
                                        Text(session.corpus.label(reference)).font(.headline)
                                        Text(note.text).foregroundStyle(.secondary).lineLimit(3)
                                    }.padding(.vertical, 4)
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("My Notes")
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
            .safeAreaInset(edge: .top) {
                if let error = model.saveError {
                    Text(error).font(.callout).padding().frame(maxWidth: .infinity)
                        .background(.regularMaterial).accessibilityIdentifier("notes.saveError")
                }
            }
        }
    }
}

private struct ExistingExegesView: View {
    @StateObject private var model = ExegesWebModel()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ContentView(model: model)
                .navigationTitle("Existing Exeges").navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
        }
    }
}
