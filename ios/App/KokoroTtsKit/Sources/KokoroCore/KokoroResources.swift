import Foundation

public enum KokoroResources {
    /// CMU-derived extra lexicon bundled with the app (same file as android/app/src/main/assets/kokoro/cmudict-extra-us.txt).
    public static var extraLexiconURL: URL? {
        Bundle.module.url(forResource: "cmudict-extra-us", withExtension: "txt")
    }
}
