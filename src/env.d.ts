// Values baked in when the site is built (see .github/workflows/pages.yml).
interface ImportMetaEnv {
  /** Where the test sends its answers (a Google Apps Script web app). Empty: no test. */
  readonly VITE_RESEARCH_URL?: string;
  /** Who to write to with questions about the test, shown on the consent screen. */
  readonly VITE_RESEARCH_CONTACT?: string;
  /** The commit the site was built from. */
  readonly VITE_BUILD?: string;
}
