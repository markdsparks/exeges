import XCTest

final class NativeReaderUITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        XCUIDevice.shared.orientation = .portrait
        app = XCUIApplication()
        app.launchEnvironment["EXEGES_READER_TEST_ID"] = UUID().uuidString
    }

    private func launch() {
        app.launch()
        XCTAssertTrue(app.buttons["reader.passage"].waitForExistence(timeout: 15), app.debugDescription)
    }

    private func capture(_ name: String) {
        let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    private func element(_ id: String) -> XCUIElement {
        app.descendants(matching: .any).matching(identifier: id).firstMatch
    }

    func testNoteSaveCancelDeleteAndRestart() {
        launch()
        app.buttons["reader.verse.1"].tap()
        let editor = app.textViews["note.text"]
        XCTAssertTrue(editor.waitForExistence(timeout: 5))
        editor.tap()
        editor.typeText("Read with attention and patience.")
        app.buttons["note.save"].tap()
        XCTAssertTrue(app.buttons["reader.verse.1"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.buttons["reader.verse.1"].value as? String, "Has a saved note")
        app.terminate()
        launch()
        app.buttons["reader.verse.1"].tap()
        XCTAssertEqual(editor.value as? String, "Read with attention and patience.")
        editor.tap()
        editor.typeText(" Unsaved draft.")
        app.buttons["note.cancel"].tap()
        app.buttons["reader.verse.1"].tap()
        XCTAssertEqual(editor.value as? String, "Read with attention and patience.")
        capture("Saved verse note")
        app.buttons["note.delete"].tap()
        let confirmation = app.buttons.matching(identifier: "Delete Note").allElementsBoundByIndex.last
        XCTAssertNotNil(confirmation)
        confirmation?.tap()
        XCTAssertTrue(app.buttons["reader.verse.1"].waitForExistence(timeout: 5))
        app.terminate()
        launch()
        app.buttons["reader.verse.1"].tap()
        XCTAssertFalse(app.buttons["note.delete"].exists)
        XCTAssertFalse(app.buttons["note.save"].isEnabled)
    }

    func testPassageNavigationScrollAndRestart() {
        launch()
        XCTAssertFalse(app.buttons["reader.previous"].isEnabled)
        app.buttons["reader.passage"].tap()
        element("passage.book").tap()
        let search = app.searchFields.firstMatch
        XCTAssertTrue(search.waitForExistence(timeout: 5))
        search.tap()
        search.typeText("Mark")
        app.buttons["passage.book.mark"].tap()
        element("passage.chapter").tap()
        XCTAssertTrue(app.navigationBars["Chapter"].waitForExistence(timeout: 5))
        element("passage.chapter.option.4").tap()
        XCTAssertTrue(app.navigationBars["Choose Passage"].waitForExistence(timeout: 5))
        element("passage.verse").tap()
        XCTAssertTrue(app.navigationBars["Verse"].waitForExistence(timeout: 5))
        element("passage.verse.option.9").tap()
        XCTAssertTrue(app.navigationBars["Choose Passage"].waitForExistence(timeout: 5))
        app.buttons["passage.read"].tap()
        capture("Selected Mark 4 verse 9")
        XCTAssertTrue(app.buttons["reader.verse.9"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["reader.verse.9"].isHittable)
        let scripture = app.scrollViews["reader.scripture"]
        scripture.swipeUp()
        let savedPlace = app.buttons["reader.passage"].value as? String
        XCTAssertTrue(savedPlace?.hasPrefix("Mark 4:") == true)
        let savedVerse = Int(savedPlace?.split(separator: ":").last.map(String.init) ?? "")
        XCTAssertNotNil(savedVerse)
        app.terminate()
        launch()
        XCTAssertEqual(app.buttons["reader.passage"].value as? String, savedPlace)
        XCTAssertTrue(app.buttons["reader.verse.\(savedVerse!)"].isHittable)
        capture("Restored reading place")
        app.buttons["reader.next"].tap()
        XCTAssertTrue((app.buttons["reader.passage"].value as? String)?.hasPrefix("Mark 5:") == true)
        app.buttons["reader.back"].tap()
        XCTAssertEqual(app.buttons["reader.passage"].value as? String, savedPlace)
        XCTAssertTrue(app.buttons["reader.verse.\(savedVerse!)"].isHittable)
        XCUIDevice.shared.press(.home)
        app.activate()
        XCTAssertEqual(app.buttons["reader.passage"].value as? String, savedPlace)
        XCTAssertTrue(app.buttons["reader.verse.\(savedVerse!)"].isHittable)
    }

    func testAppearanceEmptyNotesAndLargeText() {
        app.launchArguments = ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"]
        launch()
        app.buttons["reader.menu"].tap()
        app.buttons["My Notes"].tap()
        XCTAssertTrue(app.staticTexts["No notes yet"].waitForExistence(timeout: 5))
        app.buttons["Done"].tap()
        app.buttons["reader.menu"].tap()
        app.buttons["Appearance"].tap()
        let larger = app.buttons["appearance.larger"]
        XCTAssertTrue(larger.waitForExistence(timeout: 5))
        larger.tap()
        element("appearance.theme").tap()
        app.buttons["Dark"].firstMatch.tap()
        capture("Large text appearance")
        app.buttons["Done"].tap()
        XCUIDevice.shared.orientation = .landscapeLeft
        let landscape = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in
            self.app.frame.width > self.app.frame.height
        }, object: nil)
        XCTAssertEqual(XCTWaiter.wait(for: [landscape], timeout: 5), .completed)
        XCTAssertTrue(app.buttons["reader.next"].isHittable)
        XCTAssertLessThan(app.buttons["reader.verse.1"].frame.minY,
                          app.buttons["reader.next"].frame.minY - 80)
        capture("Landscape reading with large text")
        XCUIDevice.shared.orientation = .portrait
        let portrait = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in
            self.app.frame.width < self.app.frame.height
        }, object: nil)
        XCTAssertEqual(XCTWaiter.wait(for: [portrait], timeout: 5), .completed)
        app.terminate()
        launch()
        app.buttons["reader.menu"].tap()
        app.buttons["Appearance"].tap()
        XCTAssertTrue(app.staticTexts["Text size 22"].exists)
        let theme = element("appearance.theme")
        for _ in 0..<3 where !theme.exists { app.collectionViews["appearance.form"].swipeUp() }
        XCTAssertTrue(theme.waitForExistence(timeout: 5))
        XCTAssertTrue(theme.label.contains("Dark") || app.staticTexts["Dark"].exists, app.debugDescription)
    }

    func testMissingCorpusRecovery() {
        app.launchEnvironment["EXEGES_READER_TEST_MISSING_CORPUS"] = "1"
        app.launch()
        XCTAssertTrue(app.buttons["reader.retry"].waitForExistence(timeout: 10))
        XCTAssertFalse(app.buttons["reader.passage"].exists)
        app.buttons["reader.retry"].tap()
        XCTAssertTrue(app.buttons["reader.retry"].waitForExistence(timeout: 10))
        capture("Reader load error")
        app.terminate()
        app.launchEnvironment.removeValue(forKey: "EXEGES_READER_TEST_MISSING_CORPUS")
        launch()
        XCTAssertTrue(app.buttons["reader.verse.1"].exists)
    }

    func testEndOfChapterTracksNewPlaceAfterScrolling() {
        launch()
        app.buttons["reader.passage"].tap()
        element("passage.book").tap()
        let search = app.searchFields.firstMatch
        search.tap()
        search.typeText("Psalms")
        app.buttons["passage.book.psalms"].tap()
        element("passage.chapter").tap()
        let chapter = element("passage.chapter.option.117")
        for _ in 0..<20 where !chapter.exists || !chapter.isHittable { app.swipeUp() }
        chapter.tap()
        XCTAssertTrue(app.navigationBars["Choose Passage"].waitForExistence(timeout: 5))
        element("passage.verse").tap()
        XCTAssertTrue(app.navigationBars["Verse"].waitForExistence(timeout: 5))
        let lastVerse = element("passage.verse.option.2")
        lastVerse.tap()
        XCTAssertTrue(app.navigationBars["Choose Passage"].waitForExistence(timeout: 5))
        app.buttons["passage.read"].tap()
        XCTAssertTrue(app.buttons["reader.verse.2"].isHittable)
        app.scrollViews["reader.scripture"].swipeDown()
        let savedPlace = app.buttons["reader.passage"].value as? String
        XCTAssertEqual(savedPlace, "Psalms 117:1")
        let savedVerse = Int(savedPlace?.split(separator: ":").last.map(String.init) ?? "")
        XCTAssertNotNil(savedVerse)
        app.terminate()
        launch()
        XCTAssertEqual(app.buttons["reader.passage"].value as? String, savedPlace)
        XCTAssertTrue(app.buttons["reader.verse.\(savedVerse!)"].isHittable)
    }

    func testSaveFailureStaysVisibleAndPreservesData() {
        app.launchEnvironment["EXEGES_READER_TEST_WRITE_FAILURE"] = "1"
        launch()
        app.buttons["reader.menu"].tap()
        app.buttons["My Notes"].tap()
        app.buttons.containing(.staticText, identifier: "Mark 4:9").firstMatch.tap()
        XCTAssertTrue(element("notes.saveError").waitForExistence(timeout: 5))
        capture("Notes navigation save failure")
        app.buttons["Done"].tap()
        XCTAssertEqual(app.buttons["reader.passage"].value as? String, "Genesis 1:1")
        app.buttons["reader.verse.1"].tap()
        let editor = app.textViews["note.text"]
        editor.tap()
        editor.typeText("Do not lose my draft.")
        app.buttons["note.save"].tap()
        XCTAssertTrue(editor.exists)
        XCTAssertEqual(editor.value as? String, "Do not lose my draft.")
        XCTAssertTrue(app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "could not be saved")).firstMatch.exists)
        capture("Note save failure retains draft")
        app.buttons["note.cancel"].tap()
        app.buttons["reader.verse.1"].tap()
        XCTAssertFalse(app.buttons["note.delete"].exists)
    }
}

extension NativeReaderUITests {
    private func openSearch() {
        let ready = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in
            self.app.buttons["reader.menu"].isHittable && !self.app.buttons["search.close"].exists
        }, object: nil)
        XCTAssertEqual(XCTWaiter.wait(for: [ready], timeout: 5), .completed)
        app.buttons["reader.menu"].tap()
        app.buttons["Search Scripture"].tap()
        XCTAssertTrue(app.searchFields.firstMatch.waitForExistence(timeout: 5))
    }

    private func enterSearch(_ text: String) {
        let field = app.searchFields.firstMatch
        field.tap()
        if field.buttons["Clear text"].exists {
            field.buttons["Clear text"].tap()
            field.tap()
        }
        field.typeText(text)
    }

    func testSearchOpenBackAndEmptyRecovery() {
        launch()
        app.buttons["reader.menu"].tap()
        app.buttons["Appearance"].tap()
        element("appearance.theme").tap()
        app.buttons["Dark"].firstMatch.tap()
        app.buttons["Done"].tap()
        app.scrollViews["reader.scripture"].swipeUp()
        let original = app.buttons["reader.passage"].value as? String
        openSearch()
        enterSearch("z")
        XCTAssertTrue(app.staticTexts["Keep typing"].waitForExistence(timeout: 5))
        enterSearch("zzzxqv")
        XCTAssertTrue(element("search.empty").waitForExistence(timeout: 5))
        enterSearch("For God so loved the world")
        let hit = app.buttons["search.hit.john-3-16"]
        XCTAssertTrue(hit.waitForExistence(timeout: 10))
        capture("Native KJV search")
        hit.tap()
        XCTAssertEqual(app.buttons["reader.passage"].value as? String, "John 3:16")
        XCTAssertTrue(app.buttons["reader.verse.16"].isHittable)
        app.buttons["reader.back"].tap()
        XCTAssertEqual(app.buttons["reader.passage"].value as? String, original)
        let originalVerse = original?.split(separator: ":").last.map(String.init) ?? "1"
        XCTAssertTrue(app.buttons["reader.verse.\(originalVerse)"].isHittable)
    }

    func testBookmarkSaveReopenRemoveAndRestart() {
        launch()
        app.buttons["reader.menu"].tap()
        app.buttons["My Bookmarks"].tap()
        XCTAssertTrue(element("bookmarks.empty").waitForExistence(timeout: 5))
        app.buttons["Done"].tap()
        app.buttons["reader.verse.1"].tap()
        let bookmark = app.buttons["verse.bookmark"]
        XCTAssertTrue(bookmark.waitForExistence(timeout: 5))
        bookmark.tap()
        XCTAssertEqual(bookmark.label, "Remove Bookmark")
        app.buttons["note.cancel"].tap()
        XCTAssertEqual(app.buttons["reader.verse.1"].value as? String, "Bookmarked")
        app.buttons["reader.next"].tap()
        app.terminate()
        launch()
        XCTAssertTrue((app.buttons["reader.passage"].value as? String)?.hasPrefix("Genesis 2:") == true)
        app.buttons["reader.menu"].tap()
        app.buttons["My Bookmarks"].tap()
        let saved = app.buttons["bookmarks.open.genesis-1-1"]
        XCTAssertTrue(saved.waitForExistence(timeout: 5))
        capture("Native saved bookmarks")
        saved.tap()
        XCTAssertEqual(app.buttons["reader.passage"].value as? String, "Genesis 1:1")
        app.buttons["reader.back"].tap()
        XCTAssertTrue((app.buttons["reader.passage"].value as? String)?.hasPrefix("Genesis 2:") == true)
        app.buttons["reader.menu"].tap()
        app.buttons["My Bookmarks"].tap()
        saved.swipeLeft()
        app.buttons["Remove"].tap()
        XCTAssertTrue(element("bookmarks.empty").waitForExistence(timeout: 5))
        app.terminate()
        launch()
        app.buttons["reader.menu"].tap()
        app.buttons["My Bookmarks"].tap()
        XCTAssertTrue(element("bookmarks.empty").waitForExistence(timeout: 5))
    }

    func testBookmarkLoadRetryKeepsReadingAvailable() {
        app.launchEnvironment["EXEGES_READER_TEST_BOOKMARK_LOAD_FAILURE"] = "1"
        launch()
        app.buttons["reader.next"].tap()
        XCTAssertTrue((app.buttons["reader.passage"].value as? String)?.hasPrefix("Genesis 2:") == true)
        app.buttons["reader.menu"].tap()
        app.buttons["My Bookmarks"].tap()
        XCTAssertTrue(app.buttons["bookmarks.retry"].waitForExistence(timeout: 5))
        capture("Bookmark load recovery")
        app.buttons["bookmarks.retry"].tap()
        XCTAssertTrue(element("bookmarks.empty").waitForExistence(timeout: 5))
        app.buttons["Done"].tap()
        app.buttons["reader.verse.1"].tap()
        app.buttons["verse.bookmark"].tap()
        XCTAssertEqual(app.buttons["verse.bookmark"].label, "Remove Bookmark")
    }

    func testBookmarkAndSearchNavigationSaveErrors() {
        app.launchEnvironment["EXEGES_READER_TEST_WRITE_FAILURE"] = "1"
        launch()
        app.buttons["reader.verse.1"].press(forDuration: 1)
        app.buttons["Bookmark Verse"].tap()
        XCTAssertTrue(element("reader.bookmarkError").waitForExistence(timeout: 5))
        app.buttons["reader.verse.1"].tap()
        app.buttons["verse.bookmark"].tap()
        XCTAssertEqual(app.buttons["verse.bookmark"].label, "Bookmark Verse")
        XCTAssertTrue(app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "bookmark change could not be saved")).firstMatch.exists)
        app.buttons["note.cancel"].tap()
        openSearch()
        enterSearch("The Lord is my shepherd")
        let hit = app.buttons["search.hit.psalms-23-1"]
        XCTAssertTrue(hit.waitForExistence(timeout: 10))
        hit.tap()
        XCTAssertTrue(element("search.navigationError").waitForExistence(timeout: 5))
        XCTAssertTrue(app.searchFields.firstMatch.exists)
        capture("Search navigation save failure")
        app.buttons["search.close"].tap()
        XCTAssertEqual(app.buttons["reader.passage"].value as? String, "Genesis 1:1")
        app.buttons["reader.menu"].tap()
        app.buttons["My Bookmarks"].tap()
        XCTAssertTrue(element("bookmarks.empty").waitForExistence(timeout: 5))
    }

    func testSearchAndBookmarksWithLargeText() {
        app.launchArguments = ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"]
        launch()
        openSearch()
        enterSearch("The Lord is my shepherd")
        let hit = app.buttons["search.hit.psalms-23-1"]
        XCTAssertTrue(hit.waitForExistence(timeout: 10))
        app.collectionViews.firstMatch.swipeUp()
        if !hit.isHittable { app.collectionViews.firstMatch.swipeDown() }
        XCTAssertTrue(hit.isHittable)
        capture("Large text search")
        hit.tap()
        app.buttons["reader.verse.1"].tap()
        let bookmark = app.buttons["verse.bookmark"]
        for _ in 0..<4 where !bookmark.exists || !bookmark.isHittable { app.collectionViews.firstMatch.swipeUp() }
        bookmark.tap()
        XCTAssertEqual(bookmark.label, "Remove Bookmark")
        app.buttons["note.cancel"].tap()
        app.buttons["reader.menu"].tap()
        app.buttons["My Bookmarks"].tap()
        XCTAssertTrue(app.buttons["bookmarks.open.psalms-23-1"].waitForExistence(timeout: 5))
        capture("Large text bookmarks")
    }
    func testSearchQueryReplacementAndDismissal() {
        launch()
        openSearch()
        enterSearch("the")
        enterSearch("zzzxqv")
        XCTAssertTrue(element("search.empty").waitForExistence(timeout: 5))
        XCTAssertFalse(element("search.results").exists)
        enterSearch("love")
        app.buttons["search.close"].tap()
        openSearch()
        XCTAssertTrue(app.staticTexts["Search Scripture"].waitForExistence(timeout: 5))
        XCTAssertFalse(element("search.results").exists)
        XCTAssertFalse(element("search.empty").exists)
        app.buttons["search.close"].tap()
        XCTAssertEqual(app.buttons["reader.passage"].value as? String, "Genesis 1:1")
    }

}
