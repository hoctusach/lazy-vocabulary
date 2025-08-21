# Search Migration

The Quick Search feature now uses a normalization and ranking pipeline.

* Queries and vocabulary terms are normalized before comparison to make
  matching insensitive to case and diacritics.
* Results are ranked so that exact matches appear first, followed by
  partial matches.

No additional migration steps are required, but search behavior may be more
forgiving due to normalization.

